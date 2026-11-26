"use client";

import { useEffect, useState } from "react";
import PlanEmailOptIn from "@/components/PlanEmailOptIn";
import ResultsView from "@/components/ResultsView";
import TextField from "./TextField";
import ResumeField from "./ResumeField";
import { useSharedValue } from "@/lib/shared-value";
import type { AnalysisResult } from "@/lib/agents/profile/schema";

/** UI card for the profile review agent: form, loading/error states, results. */
export default function ProfileCard() {
  const [targetRole, setTargetRole] = useSharedValue("role");
  const [resumeText, setResumeText] = useSharedValue("resume");
  const [linkedinText, setLinkedinText] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // Bring the results into view once they arrive.
  useEffect(() => {
    if (result) {
      document
        .getElementById("profile-results")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setError("");
    setResult(null);

    if (!targetRole.trim()) {
      setError("Please enter the role you're targeting.");
      return;
    }
    if (!resumeText.trim() && !linkedinText.trim()) {
      setError("Paste your resume, your LinkedIn text, or both.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetRole, resumeText, linkedinText }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          (data && typeof data.error === "string" && data.error) ||
            "Something went wrong. Please try again.",
        );
      }

      setResult(data as AnalysisResult);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          How strong is your profile for the role you want?
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          Paste your resume and LinkedIn text, name the role you&apos;re going for, and get a scored
          review with concrete fixes and rewritten lines.
        </p>
      </div>

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div>
          <label htmlFor="targetRole" className="block text-sm font-medium text-slate-800">
            Target role
          </label>
          <input
            id="targetRole"
            type="text"
            value={targetRole}
            onChange={(event) => setTargetRole(event.target.value)}
            maxLength={120}
            placeholder="e.g. Junior Data Analyst"
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <ResumeField id="resumeText" value={resumeText} onChange={setResumeText} />
          <ResumeField
            id="linkedinText"
            label="LinkedIn"
            placeholder="Paste your LinkedIn headline, About, experience and skills, or upload your LinkedIn PDF below…"
            clearLabel="Clear LinkedIn text"
            note="On LinkedIn: your profile, then More, then Save to PDF."
            value={linkedinText}
            onChange={setLinkedinText}
          />
        </div>

        <PrivacyNote />

        <button
          type="submit"
          disabled={loading}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Spinner />
              Analyzing…
            </>
          ) : (
            "Analyze my profile"
          )}
        </button>
      </form>

      <ErrorBox error={error} />
      {loading && <LoadingCard />}

      <div id="profile-results" className="mt-10 scroll-mt-6">
        {result && <ResultsView result={result} />}
        {result && (
          <PlanEmailOptIn
            targetRole={result.targetRole}
            resumeScore={result.resume.score.normalisedScore}
            linkedinScore={result.linkedin.score.normalisedScore}
            topFixes={profileTopFixes(result)}
          />
        )}
      </div>
    </>
  );
}

/** Shared privacy note for every agent card. */
export function PrivacyNote() {
  return (
    <div className="mt-5 flex gap-3 rounded-xl bg-sky-50 p-4 ring-1 ring-sky-100">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="mt-0.5 h-5 w-5 shrink-0 text-sky-600"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3z"
        />
      </svg>
      <p className="text-sm leading-relaxed text-sky-900">
        Your text is sent to an AI model for analysis and is not stored by this app. Remove phone
        numbers and addresses before pasting.
      </p>
    </div>
  );
}

export function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />;
}

export function ErrorBox({ error }: { error: string }) {
  if (!error) return null;

  return (
    <div
      role="alert"
      className="mt-6 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
    >
      <span className="font-semibold">Couldn&apos;t analyze:</span>
      <span>{error}</span>
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-700">Reading your profile…</p>
      <p className="mt-1 text-xs text-slate-500">
        This usually takes 10–30 seconds. Please keep this tab open.
      </p>
      <div className="mt-4 space-y-3">
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

/** The three fixes worth emailing: top two resume fixes, then the top LinkedIn fix. */
function profileTopFixes(result: AnalysisResult): string[] {
  const picked = [
    ...result.resume.top_fixes.slice(0, 2),
    ...result.linkedin.top_fixes.slice(0, 1),
  ].map((fix) => fix.issue);

  // Fill any gap (e.g. only one section was scored) from the remaining fixes.
  const rest = [...result.resume.top_fixes.slice(2), ...result.linkedin.top_fixes.slice(1)].map(
    (fix) => fix.issue,
  );
  return [...picked, ...rest].slice(0, 3);
}
