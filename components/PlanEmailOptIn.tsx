"use client";

import { useEffect, useState } from "react";

/**
 * Optional "email me my action plan" box, shown under any agent's results.
 *
 * Only scores and short fix summaries are sent (never resume, LinkedIn or job
 * text), and only after the student ticks the consent box. The box is hidden
 * entirely when the server has no n8n webhook configured.
 */
export default function PlanEmailOptIn({
  targetRole,
  resumeScore,
  linkedinScore,
  matchScore,
  topFixes,
}: {
  targetRole: string;
  resumeScore?: number | null;
  linkedinScore?: number | null;
  matchScore?: number | null;
  /** Short issue titles; the server keeps at most the first three. */
  topFixes: string[];
}) {
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/notify")
      .then((response) => (response.ok ? response.json() : { enabled: false }))
      .then((data) => {
        if (!cancelled) setEnabled(Boolean(data?.enabled));
      })
      .catch(() => {
        if (!cancelled) setEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!enabled || topFixes.length === 0) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;

    setStatus("sending");
    setMessage("");
    try {
      const response = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          consent,
          targetRole,
          resumeScore,
          linkedinScore,
          matchScore,
          topFixes: topFixes.slice(0, 3),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          (data && typeof data.error === "string" && data.error) ||
            "Something went wrong. Please try again.",
        );
      }
      setStatus("sent");
      setMessage("Plan sent. Check your inbox in a minute (and your spam folder).");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">Get your action plan by email</h2>
      <p className="mt-1 text-sm text-slate-600">
        We&apos;ll email your top fixes and log your score so you can track progress when you
        re-run CareerOS.
      </p>

      {status === "sent" ? (
        <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          {message}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="planEmail" className="block text-sm font-medium text-slate-800">
              Email address
            </label>
            <input
              id="planEmail"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              placeholder="you@example.com"
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-300"
            />
            <span>
              Email me my action plan and save my progress. Only my scores and top fixes are sent,
              never my resume or LinkedIn text.
            </span>
          </label>

          {status === "error" && (
            <p role="alert" className="text-sm text-rose-700">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={!consent || !email || status === "sending"}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "sending" ? "Sending…" : "Email me my plan"}
          </button>
        </form>
      )}
    </section>
  );
}
