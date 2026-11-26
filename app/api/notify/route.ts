import { NextResponse } from "next/server";
import {
  AutomationError,
  cleanScore,
  cleanText,
  isAutomationEnabled,
  isValidEmail,
  sendActionPlan,
} from "@/lib/automation/n8n";
import { getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Email-plan opt-in endpoint.
 *
 * GET  -> { enabled } so the UI can hide the checkbox when n8n isn't configured.
 * POST -> forwards scores + top fixes (never any resume/LinkedIn/job text) to n8n.
 *
 * The email address is passed straight to n8n and is not stored by this app.
 */

// Separate, stricter limiter than the analysis one: this sends real emails.
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 3;
const buckets = new Map<string, { count: number; resetAt: number }>();

function allowRequest(ip: string): boolean {
  const now = Date.now();
  if (buckets.size > 2000) {
    for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
  }
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (bucket.count >= MAX_PER_WINDOW) return false;
  bucket.count += 1;
  return true;
}

export async function GET() {
  return NextResponse.json({ enabled: isAutomationEnabled() });
}

export async function POST(request: Request) {
  if (!isAutomationEnabled()) {
    return NextResponse.json(
      { error: "Email plans are not enabled on this deployment." },
      { status: 503 },
    );
  }

  if (!allowRequest(getClientIp(request))) {
    return NextResponse.json(
      { error: "Too many plan requests from this address. Please wait a few minutes." },
      { status: 429 },
    );
  }

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

  // Explicit consent is required in the request itself, not just in the UI.
  if (body.consent !== true) {
    return NextResponse.json(
      { error: "Please tick the consent box to receive your plan." },
      { status: 400 },
    );
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const targetRole =
    typeof body.targetRole === "string" ? cleanText(body.targetRole, 120) : "";
  const topFixes = (Array.isArray(body.topFixes) ? body.topFixes : [])
    .filter((fix): fix is string => typeof fix === "string")
    .map((fix) => cleanText(fix, 200))
    .filter(Boolean)
    .slice(0, 3);

  if (topFixes.length === 0) {
    return NextResponse.json({ error: "There are no fixes to send yet." }, { status: 400 });
  }

  try {
    await sendActionPlan({
      email,
      target_role: targetRole,
      resume_score: cleanScore(body.resumeScore),
      linkedin_score: cleanScore(body.linkedinScore),
      match_score: cleanScore(body.matchScore),
      top_fixes: topFixes,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AutomationError) {
      return NextResponse.json({ error: error.userMessage }, { status: error.status });
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
