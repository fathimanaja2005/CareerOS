import { NextResponse } from "next/server";
import { callModel, LlmError } from "@/lib/llm";
import { SYSTEM_PROMPT, buildUserInput } from "@/lib/prompt";
import { analysisSchema, type AnalysisResult } from "@/lib/schema";
import { LINKEDIN_RUBRIC, RESUME_RUBRIC } from "@/lib/rubric";
import { applyRubric, clampBreakdown, computeSectionScore } from "@/lib/scoring";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Node runtime: we only need fetch, and 60s covers the model's thinking time on Hobby.
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TEXT_LENGTH = 15_000;
const MAX_ROLE_LENGTH = 120;

export async function POST(request: Request) {
  // --- Rate limit -----------------------------------------------------------
  const limit = checkRateLimit(getClientIp(request));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many analyses from this address. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  // --- Parse and validate the body -----------------------------------------
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const body = (typeof payload === "object" && payload !== null ? payload : {}) as Record<
    string,
    unknown
  >;

  const targetRole = typeof body.targetRole === "string" ? body.targetRole.trim() : "";
  const resumeText = typeof body.resumeText === "string" ? body.resumeText.trim() : "";
  const linkedinText = typeof body.linkedinText === "string" ? body.linkedinText.trim() : "";

  if (!targetRole) {
    return NextResponse.json({ error: "Please enter the role you're targeting." }, { status: 400 });
  }
  if (targetRole.length > MAX_ROLE_LENGTH) {
    return NextResponse.json(
      { error: `Target role must be ${MAX_ROLE_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }
  if (!resumeText && !linkedinText) {
    return NextResponse.json(
      { error: "Paste your resume, your LinkedIn text, or both." },
      { status: 400 },
    );
  }
  if (resumeText.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `Resume text is too long. The limit is ${MAX_TEXT_LENGTH.toLocaleString("en-US")} characters.` },
      { status: 400 },
    );
  }
  if (linkedinText.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `LinkedIn text is too long. The limit is ${MAX_TEXT_LENGTH.toLocaleString("en-US")} characters.` },
      { status: 400 },
    );
  }

  // --- Call the model, validate the JSON, retry once if it is malformed -----
  // Note: the resume/LinkedIn text is never logged and never stored.
  const userInput = buildUserInput({ targetRole, resumeText, linkedinText });

  let analysis;
  try {
    analysis = await getValidAnalysis(userInput);
  } catch (error) {
    const message =
      error instanceof LlmError
        ? error.userMessage
        : "The AI returned an unexpected format. Please try again.";
    const status = error instanceof LlmError ? error.status : 422;
    return NextResponse.json({ error: message }, { status });
  }

  // --- Compute scores in code (never trust the model's arithmetic) ----------
  // applyRubric sets the rubric order and maxima; clampBreakdown keeps scores in range.
  const resumeBreakdown = clampBreakdown(applyRubric(analysis.resume.breakdown, RESUME_RUBRIC));
  const linkedinBreakdown = clampBreakdown(
    applyRubric(analysis.linkedin.breakdown, LINKEDIN_RUBRIC),
  );

  const result: AnalysisResult = {
    targetRole,
    resume: {
      ...analysis.resume,
      breakdown: resumeBreakdown,
      top_fixes: sortByPriority(analysis.resume.top_fixes),
      score: computeSectionScore(resumeBreakdown),
    },
    linkedin: {
      ...analysis.linkedin,
      breakdown: linkedinBreakdown,
      top_fixes: sortByPriority(analysis.linkedin.top_fixes),
      score: computeSectionScore(linkedinBreakdown),
    },
    missing_skills_for_role: analysis.missing_skills_for_role,
    confidence_note: analysis.confidence_note,
  };

  return NextResponse.json(result);
}

/**
 * Ask the model for JSON and validate it. If the first reply is not valid JSON
 * (or does not match the schema) we ask once more, then give up with a clear error.
 */
async function getValidAnalysis(userInput: string) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt =
      attempt === 0
        ? userInput
        : `${userInput}\n\nYour previous reply was not valid JSON for the required schema. Reply with ONLY the JSON object, no code fences and no commentary.`;

    const raw = await callModel(SYSTEM_PROMPT, prompt);
    const json = extractJson(raw);
    if (json === null) {
      lastError = new Error("Model reply did not contain a JSON object");
      continue;
    }

    const parsed = analysisSchema.safeParse(json);
    if (parsed.success) return parsed.data;
    lastError = parsed.error;
  }

  throw lastError;
}

/** Top fixes are always shown in priority order (1 first). */
function sortByPriority<T extends { priority: number }>(fixes: T[]): T[] {
  return [...fixes].sort((a, b) => a.priority - b.priority);
}

/** Pull the JSON object out of a reply, tolerating stray code fences. */
function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}
