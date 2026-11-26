import { NextResponse } from "next/server";
import { LlmError } from "@/lib/llm";
import { tailorAgent } from "@/lib/agents/tailor";
import { runAgent } from "@/lib/agents/run";
import { unknownCompanyError } from "@/lib/company-guard";
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
  const company = text(body.company);
  const jobDescription = text(body.jobDescription);
  const resumeText = text(body.resumeText);

  if (!roleTitle) return bad("Please enter the role title.");
  if (!resumeText) return bad("Please add your resume first.");
  if (!jobDescription) return bad("Please paste the job description.");
  if (roleTitle.length > MAX_SHORT_LENGTH || company.length > MAX_SHORT_LENGTH) {
    return bad(`Role and company names are limited to ${MAX_SHORT_LENGTH} characters.`);
  }
  if (resumeText.length > MAX_TEXT_LENGTH || jobDescription.length > MAX_TEXT_LENGTH) {
    return bad("Text is too long.");
  }

  // Note: no part of the request text is logged or stored.
  try {
    const [unknown, result] = await Promise.all([
      unknownCompanyError(company, roleTitle),
      runAgent(tailorAgent, { roleTitle, company, jobDescription, resumeText }),
    ]);
    return NextResponse.json(unknown ? { ...result, companyWarning: unknown } : result);
  } catch (error) {
    const message =
      error instanceof LlmError
        ? error.userMessage
        : "The AI returned an unexpected format. Please try again.";
    const status = error instanceof LlmError ? error.status : 422;
    return NextResponse.json({ error: message }, { status });
  }
}
