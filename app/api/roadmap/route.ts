import { NextResponse } from "next/server";
import { LlmError } from "@/lib/llm";
import { roadmapAgent } from "@/lib/agents/roadmap";
import { ALLOWED_WEEKS } from "@/lib/agents/roadmap/schema";
import { runAgent } from "@/lib/agents/run";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TEXT_LENGTH = 15_000;
const MAX_SHORT_LENGTH = 120;

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const limit = checkRateLimit(getClientIp(request));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests from this address. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return bad("Invalid JSON body.");
  }
  const body = (typeof payload === "object" && payload !== null ? payload : {}) as Record<
    string,
    unknown
  >;

  const roleTitle = text(body.roleTitle);
  const jobDescription = text(body.jobDescription);
  const resumeText = text(body.resumeText);
  const weeks = Number(body.weeks);
  const hoursPerWeek = Number(body.hoursPerWeek);

  if (!roleTitle) return bad("Please enter the role you're targeting.");
  if (roleTitle.length > MAX_SHORT_LENGTH) return bad(`Role title is limited to ${MAX_SHORT_LENGTH} characters.`);
  if (!resumeText) return bad("Please paste your resume so the plan starts from what you already know.");
  if (resumeText.length > MAX_TEXT_LENGTH || jobDescription.length > MAX_TEXT_LENGTH) {
    return bad("Text is too long.");
  }
  if (!(ALLOWED_WEEKS as readonly number[]).includes(weeks)) return bad("Please choose 4, 6, 8 or 12 weeks.");
  if (!Number.isFinite(hoursPerWeek) || hoursPerWeek < 2 || hoursPerWeek > 40) {
    return bad("Hours per week must be between 2 and 40.");
  }

  // Note: no part of the request text is logged or stored.
  try {
    const result = await runAgent(roadmapAgent, { roleTitle, jobDescription, resumeText, weeks, hoursPerWeek });
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
