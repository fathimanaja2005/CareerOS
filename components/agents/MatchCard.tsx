"use client";

import { recordScore } from "@/lib/history";
import { useEffect, useState } from "react";
import MatchResults from "@/components/MatchResults";
import TextField from "./TextField";
import ResumeField from "./ResumeField";
import { useSharedValue } from "@/lib/shared-value";
import CompanyWarning from "@/components/CompanyWarning";
import { ErrorBox, LoadingCard, PrivacyNote, Spinner } from "./ProfileCard";
import type { MatchResult } from "@/lib/agents/match/schema";

/** UI card for the job match agent: resume + job description + company/role, then results. */
export default function MatchCard() {
  const [resumeText, setResumeText] = useSharedValue("resume");
  const [jobDescription, setJobDescription] = useState("");
  const [company, setCompany] = useState("");
  const [roleTitle, setRoleTitle] = useSharedValue("role");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [result, setResult] = useState<MatchResult | null>(null);

  useEffect(() => {
    if (result) {
      document.getElementById("match-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setError("");
    setWarning("");
    setResult(null);

    if (!resumeText.trim()) {
      setError("Please paste your resume text.");
      return;
    }
    if (!jobDescription.trim()) {
      setError("Please paste the job description you're targeting.");
      return;
    }
    if (!company.trim()) {
      setError("Please enter the company name.");
      return;
    }
    if (!roleTitle.trim()) {
      setError("Please enter the role title.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription, company, roleTitle }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          (data && typeof data.error === "string" && data.error) ||
            "Something went wrong. Please try again.",
        );
      }

      setResult(data as MatchResult);
      setWarning(typeof data.companyWarning === "string" ? data.companyWarning : "");
      recordScore("match", company ? `${roleTitle} at ${company}` : roleTitle, (data as MatchResult).score.normalisedScore);
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
          How well do you match this job?
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          Paste your resume and a job description, plus the company and role title. You&apos;ll get a
          match score, the skills you share, the ones you don&apos;t, and how to close the gaps.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-slate-800">
              Company name
            </label>
            <input
              id="company"
              type="text"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              maxLength={120}
              placeholder="e.g. Acme Corp"
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label htmlFor="roleTitle" className="block text-sm font-medium text-slate-800">
              Role title
            </label>
            <input
              id="roleTitle"
              type="text"
              value={roleTitle}
              onChange={(event) => setRoleTitle(event.target.value)}
              maxLength={120}
              placeholder="e.g. Junior Data Analyst"
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div className="mt-5">
          <TextField
            id="jobDescription"
            label="Job description"
            placeholder="Paste the job description you're applying to…"
            value={jobDescription}
            onChange={setJobDescription}
            rows={10}
          />
        </div>

        <div className="mt-5">
          <ResumeField id="matchResumeText" value={resumeText} onChange={setResumeText} />
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
              Comparing…
            </>
          ) : (
            "Check the match"
          )}
        </button>
      </form>

      <ErrorBox error={error} />
      <CompanyWarning text={warning} />
      {loading && <LoadingCard />}

      <div id="match-results" className="mt-10 scroll-mt-6">
        {result && <MatchResults result={result} />}
      </div>
    </>
  );
}