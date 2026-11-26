"use client";

import { useEffect, useState } from "react";
import CopyButton from "@/components/CopyButton";
import TextField from "./TextField";
import ResumeField from "./ResumeField";
import { useSharedValue } from "@/lib/shared-value";
import { addApplication, navigateTo } from "@/lib/history";
import CompanyWarning from "@/components/CompanyWarning";
import { ErrorBox, LoadingCard, PrivacyNote, Spinner } from "./ProfileCard";
import type { TailorResult } from "@/lib/agents/tailor/schema";

const INPUT_CLASS =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

/** UI card for the Tailor agent: one job in, targeted resume lines and a cover letter out. */
export default function TailorCard() {
  const [roleTitle, setRoleTitle] = useSharedValue("role");
  const [resumeText, setResumeText] = useSharedValue("resume");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [result, setResult] = useState<TailorResult | null>(null);

  useEffect(() => {
    if (result) {
      document.getElementById("tailor-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setWarning("");
    setResult(null);

    if (!roleTitle.trim() || !resumeText.trim() || !jobDescription.trim()) {
      setError("Please fill in the role, your resume and the job description.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleTitle, company, jobDescription, resumeText }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          (data && typeof data.error === "string" && data.error) ||
            "Something went wrong. Please try again.",
        );
      }
      setResult(data as TailorResult);
      setWarning(typeof data.companyWarning === "string" ? data.companyWarning : "");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Tailor your resume and cover letter for one job
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          Paste a job description. You get resume lines rewritten for that job and a short cover
          letter. Both use only what your resume already shows, nothing is invented.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tailorRole" className="block text-sm font-medium text-slate-800">
              Role title
            </label>
            <input
              id="tailorRole"
              type="text"
              value={roleTitle}
              onChange={(event) => setRoleTitle(event.target.value)}
              maxLength={120}
              placeholder="e.g. Junior Data Analyst"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="tailorCompany" className="block text-sm font-medium text-slate-800">
              Company (optional)
            </label>
            <input
              id="tailorCompany"
              type="text"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              maxLength={120}
              placeholder="e.g. Northwind Retail Analytics"
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div className="mt-5">
          <ResumeField id="tailorResume" label="Resume" value={resumeText} onChange={setResumeText} rows={8} />
        </div>
        <div className="mt-5">
          <TextField
            id="tailorJd"
            label="Job description"
            placeholder="Paste the job description…"
            value={jobDescription}
            onChange={setJobDescription}
            rows={8}
          />
        </div>

        <PrivacyNote />

        <button
          type="submit"
          disabled={loading}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl btn-primary bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Spinner />
              Tailoring…
            </>
          ) : (
            "Tailor for this job"
          )}
        </button>
      </form>

      <ErrorBox error={error} />
      <CompanyWarning text={warning} />
      {loading && <LoadingCard />}

      <div id="tailor-results" className="mt-10 scroll-mt-6">
        {result && <TailorView result={result} />}
      </div>
    </>
  );
}

function Chips({ items, tone }: { items: string[]; tone: "good" | "gap" }) {
  if (items.length === 0) return <p className="mt-2 text-sm text-slate-400">None listed.</p>;
  const cls =
    tone === "good"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
      : "bg-amber-50 text-amber-800 ring-amber-100";
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map((item, index) => (
        <span key={index} className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${cls}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

function TailorView({ result }: { result: TailorResult }) {
  const [letter, setLetter] = useState(result.coverLetter);
  const [tracked, setTracked] = useState(false);

  function download() {
    const blob = new Blob([letter], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cover-letter.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  function track() {
    addApplication({ company: result.company || "Unknown company", role: result.roleTitle });
    setTracked(true);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Tailored for {result.roleTitle}
            {result.company ? ` at ${result.company}` : ""}
          </h2>
          <button
            type="button"
            onClick={track}
            disabled={tracked}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 disabled:text-emerald-700"
          >
            {tracked ? "Added to your tracker" : "Add to job tracker"}
          </button>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Keywords your resume already shows</h3>
            <Chips items={result.keywordsPresent} tone="good" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Keywords it does not show</h3>
            <Chips items={result.keywordsMissing} tone="gap" />
            <p className="mt-2 text-xs text-slate-500">
              Add these only if they are true for you. Otherwise treat them as skills to learn.
            </p>
          </div>
        </div>
        {result.headlineSuggestion && (
          <div className="mt-5 flex items-start justify-between gap-3 rounded-xl bg-indigo-50 p-3 ring-1 ring-indigo-100">
            <p className="text-sm text-indigo-950">
              <span className="font-semibold">Headline idea:</span> {result.headlineSuggestion}
            </p>
            <CopyButton text={result.headlineSuggestion} />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Resume lines to change for this job</h3>
        <div className="mt-4 space-y-5">
          {result.rewrites.map((rewrite, index) => (
            <div key={index} className="rounded-xl border border-slate-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Before</p>
              <p className="mt-1 text-sm text-slate-600">{rewrite.original}</p>
              {!rewrite.foundInResume && (
                <p className="mt-1 text-xs font-medium text-amber-700">
                  CareerOS could not find this exact line in your resume. Check it before you use the change.
                </p>
              )}
              <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">After</p>
                  <p className="mt-1 text-sm text-slate-900">{rewrite.improved}</p>
                </div>
                <CopyButton text={rewrite.improved} />
              </div>
              {rewrite.needs_from_student && (
                <p className="mt-2 text-xs text-slate-500">
                  <span className="font-medium">To finish this line:</span> {rewrite.needs_from_student}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">Cover letter draft</h3>
          <div className="flex gap-2">
            <CopyButton text={letter} label="Copy letter" />
            <button
              type="button"
              onClick={download}
              className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Download .txt
            </button>
          </div>
        </div>
        <textarea
          value={letter}
          onChange={(event) => setLetter(event.target.value)}
          rows={14}
          aria-label="Cover letter draft"
          className="mt-3 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        <p className="mt-2 text-xs text-slate-500">
          You can edit the letter here. Add your name at the end before you send it.
        </p>
      </section>

      {result.confidenceNote && <p className="text-xs text-slate-500">{result.confidenceNote}</p>}
      <p className="text-xs text-slate-500">
        Read every line before you send it. If something is not true for you, remove it.{" "}
        <button type="button" onClick={() => navigateTo("progress")} className="underline">
          Open your tracker
        </button>
      </p>
    </div>
  );
}
