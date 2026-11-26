import { NextResponse } from "next/server";
import { LlmError } from "@/lib/llm";
import { profileAgent } from "@/lib/agents/profile";
import { runAgent } from "@/lib/agents/run";
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

  // --- Model call, JSON validation (one retry) and scoring -----------------
  // Note: the resume/LinkedIn text is never logged and never stored.
  try {
    const result = await runAgent(profileAgent, { targetRole, resumeText, linkedinText });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof LlmError
        ? error.userMessage
        : "The AI returned an unexpected format. Please try again.";
    const status = error instanceof LlmError ? error.status : 422;
    return NextResponse.json({ error: message }, { status });
  }
}
