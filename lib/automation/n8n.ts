/**
 * Optional automation hook: sends a student's SCORES and TOP FIXES to an n8n
 * webhook, which logs them to a sheet and emails an action plan.
 *
 * Privacy rules enforced here (not in the caller):
 *  - Only the fields in ActionPlanPayload can leave the app. Resume text,
 *    LinkedIn text and job descriptions are never accepted by this module.
 *  - The short plan carries scores and fix titles only. The optional full
 *    report (the results shown on screen, which can include rewritten lines)
 *    is sent only when the student ticks a second, separate consent box. It
 *    goes into the email, never into the sheet.
 *  - The webhook URL (and optional secret) are server-side env vars.
 *  - Nothing is stored or logged by this app.
 */

export type ActionPlanPayload = {
  email: string;
  target_role: string;
  resume_score: number | null;
  linkedin_score: number | null;
  match_score: number | null;
  top_fixes: string[];
  /** Which agent the email is about, e.g. "profile". */
  agent: string;
  /** Ready-to-send subject and HTML, composed by the app (see lib/automation/email.ts). */
  email_subject: string;
  email_html: string;
};

/** True when an n8n webhook is configured (the UI hides the opt-in otherwise). */
export function isAutomationEnabled(): boolean {
  return Boolean(process.env.N8N_WEBHOOK_URL?.trim());
}

const EMAIL_PATTERN = /^[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[^\s@<>()"',;:]{2,}$/;

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_PATTERN.test(value);
}

/** Remove anything that could turn into markup inside the HTML email. */
export function cleanText(value: string, maxLength: number): string {
  return value
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/** A score is a whole number from 0 to 100, or null when not scored. */
export function cleanScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export class AutomationError extends Error {
  constructor(
    public readonly userMessage: string,
    public readonly status = 502,
  ) {
    super(userMessage);
  }
}

/** POST the payload to n8n. Throws AutomationError with a safe message. */
export async function sendActionPlan(payload: ActionPlanPayload): Promise<void> {
  const url = process.env.N8N_WEBHOOK_URL?.trim();
  if (!url) {
    throw new AutomationError("Email plans are not enabled on this deployment.", 503);
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = process.env.N8N_WEBHOOK_SECRET?.trim();
  if (secret) headers["x-careeros-secret"] = secret;

  // Build the body field by field so nothing else can slip in.
  const body = JSON.stringify({
    email: payload.email,
    target_role: payload.target_role,
    resume_score: payload.resume_score,
    linkedin_score: payload.linkedin_score,
    match_score: payload.match_score,
    top_fixes: payload.top_fixes,
    agent: payload.agent,
    email_subject: payload.email_subject,
    email_html: payload.email_html,
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new AutomationError(
      "Couldn't reach the plan service. Your analysis is fine; please try again in a minute.",
    );
  }

  if (!response.ok) {
    throw new AutomationError("The plan service returned an error. Please try again later.");
  }
}
