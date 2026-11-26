import { NextResponse } from "next/server";
import { LlmError } from "@/lib/llm";
import { feedbackAgent, questionsAgent } from "@/lib/agents/coach";
import { runAgent } from "@/lib/agents/run";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TEXT_LENGTH = 15_000;
const MAX_ANSWER_LENGTH = 4_000;
const MAX_SHORT_LENGTH = 120;
const MAX_QUESTION_LENGTH = 500;
const MAX_ASKED = 40;

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
  const company = text(body.company);
  const jobDescription = text(body.jobDescription);

  if (!roleTitle) return bad("Please enter the role title.");
  if (!company) return bad("Please enter the company name.");
  if (!jobDescription) return bad("Please paste the job description.");
  if (roleTitle.length > MAX_SHORT_LENGTH || company.length > MAX_SHORT_LENGTH) {
    return bad(`Role and company names are limited to ${MAX_SHORT_LENGTH} characters.`);
  }
  if (jobDescription.length > MAX_TEXT_LENGTH) {
    return bad("Job description is too long.");
  }

  // Note: no part of the request text is logged or stored.
  try {
    if (body.mode === "questions") {
      const resumeText = text(body.resumeText);
      if (resumeText.length > MAX_TEXT_LENGTH) return bad("Resume text is too long.");
      const alreadyAsked = Array.isArray(body.alreadyAsked)
        ? body.alreadyAsked
            .filter((q): q is string => typeof q === "string")
            .map((q) => q.trim().slice(0, MAX_QUESTION_LENGTH))
            .filter(Boolean)
            .slice(0, MAX_ASKED)
        : [];
      const result = await runAgent(questionsAgent, { roleTitle, company, jobDescription, resumeText, alreadyAsked });
      return NextResponse.json(result);
    }

    if (body.mode === "feedback") {
      const question = text(body.question);
      const answer = text(body.answer);
      if (!question || question.length > MAX_QUESTION_LENGTH) return bad("Invalid question.");
      if (answer.length < 20) return bad("Please write your answer first (at least a couple of sentences).");
      if (answer.length > MAX_ANSWER_LENGTH) {
        return bad(`Your answer is too long. The limit is ${MAX_ANSWER_LENGTH.toLocaleString("en-US")} characters.`);
      }
      const result = await runAgent(feedbackAgent, { roleTitle, company, jobDescription, question, answer });
      return NextResponse.json(result);
    }

    return bad("Unknown mode.");
  } catch (error) {
    const message =
      error instanceof LlmError
        ? error.userMessage
        : "The AI returned an unexpected format. Please try again.";
    const status = error instanceof LlmError ? error.status : 422;
    return NextResponse.json({ error: message }, { status });
  }
}
