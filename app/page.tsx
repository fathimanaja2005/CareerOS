"use client";

import { useEffect, useState } from "react";
import ResultsView from "@/components/ResultsView";
import type { AnalysisResult } from "@/lib/schema";

const MAX_CHARS = 15_000;

export default function HomePage() {
  const [targetRole, setTargetRole] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [linkedinText, setLinkedinText] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // Bring the results into view once they arrive.
  useEffect(() => {
    if (result) {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-4">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            C
          </span>
          <span className="text-lg font-semibold tracking-tight">CareerOS</span>
          <span className="ml-auto hidden text-xs text-slate-500 sm:block">
            AI profile review for new grads
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            How strong is your profile for the role you want?
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
            Paste your resume and LinkedIn text, name the role you&apos;re going for, and get a
            scored review with concrete fixes and rewritten lines.
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
            <TextField
              id="resumeText"
              label="Resume"
              placeholder="Paste your resume as plain text…"
              value={resumeText}
              onChange={setResumeText}
            />
            <TextField
              id="linkedinText"
              label="LinkedIn"
              placeholder="Paste your LinkedIn headline, About, experience and skills…"
              value={linkedinText}
              onChange={setLinkedinText}
            />
          </div>

          {/* Privacy note */}
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
              Your text is sent to an AI model for analysis and is not stored by this app. Remove
              phone numbers and addresses before pasting.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Analyzing…
              </>
            ) : (
              "Analyze my profile"
            )}
          </button>
        </form>

        {/* Error state */}
        {error && (
          <div
            role="alert"
            className="mt-6 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            <span className="font-semibold">Couldn&apos;t analyze:</span>
            <span>{error}</span>
          </div>
        )}

        {/* Loading state */}
        {loading && (
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
        )}

        {/* Results */}
        <div id="results" className="mt-10 scroll-mt-6">
          {result && <ResultsView result={result} />}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6 text-xs text-slate-500">
          CareerOS gives an AI-assisted review, not a hiring decision. Always check advice against
          the job description you&apos;re applying to.
        </div>
      </footer>
    </div>
  );
}

/** Labelled textarea with a character counter. */
function TextField({
  id,
  label,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-slate-800">
          {label}
        </label>
        <span className="text-xs tabular-nums text-slate-400">
          {value.length.toLocaleString("en-US")} / {MAX_CHARS.toLocaleString("en-US")}
        </span>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={MAX_CHARS}
        rows={12}
        placeholder={placeholder}
        className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
    </div>
  );
}
