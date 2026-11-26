import { NextResponse } from "next/server";
import { LlmError } from "@/lib/llm";
import { matchAgent } from "@/lib/agents/match";
import { runAgent } from "@/lib/agents/run";
import { unknownCompanyError } from "@/lib/company-guard";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Same runtime and limit as the profile route: one model call per request.
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TEXT_LENGTH = 15_000;
const MAX_SHORT_LENGTH = 120;

export async function POST(request: Request) {
  // --- Rate limit (shared with /api/analyze) --------------------------------
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

  const resumeText = typeof body.resumeText === "string" ? body.resumeText.trim() : "";
  const jobDescription =
    typeof body.jobDescription === "string" ? body.jobDescription.trim() : "";
  const company = typeof body.company === "string" ? body.company.trim() : "";
  const roleTitle = typeof body.roleTitle === "string" ? body.roleTitle.trim() : "";

  if (!resumeText) {
    return NextResponse.json(
      { error: "Please paste your resume text." },
      { status: 400 },
    );
  }
  if (!jobDescription) {
    return NextResponse.json(
      { error: "Please paste the job description you're targeting." },
      { status: 400 },
    );
  }
  if (!company) {
    return NextResponse.json({ error: "Please enter the company name." }, { status: 400 });
  }
  if (!roleTitle) {
    return NextResponse.json({ error: "Please enter the role title." }, { status: 400 });
  }
  if (resumeText.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `Resume text is too long. The limit is ${MAX_TEXT_LENGTH.toLocaleString("en-US")} characters.` },
      { status: 400 },
    );
  }
  if (jobDescription.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `Job description is too long. The limit is ${MAX_TEXT_LENGTH.toLocaleString("en-US")} characters.` },
      { status: 400 },
    );
  }
  if (company.length > MAX_SHORT_LENGTH) {
    return NextResponse.json(
      { error: `Company name is too long. The limit is ${MAX_SHORT_LENGTH} characters.` },
      { status: 400 },
    );
  }
  if (roleTitle.length > MAX_SHORT_LENGTH) {
    return NextResponse.json(
      { error: `Role title is too long. The limit is ${MAX_SHORT_LENGTH} characters.` },
      { status: 400 },
    );
  }

  // --- Model call, JSON validation (one retry) and scoring -----------------
  // Note: no part of the request text is logged or stored.
  try {
    const [unknown, result] = await Promise.all([
      unknownCompanyError(company, roleTitle),
      runAgent(matchAgent, { resumeText, jobDescription, company, roleTitle }),
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