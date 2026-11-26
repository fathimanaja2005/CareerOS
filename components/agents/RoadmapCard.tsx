"use client";

import { useEffect, useState } from "react";
import TextField from "./TextField";
import { ErrorBox, LoadingCard, PrivacyNote, Spinner } from "./ProfileCard";
import type { RoadmapResult } from "@/lib/agents/roadmap/schema";

/** UI card for the Roadmap agent: role + resume (+ job description), then a weekly plan. */
export default function RoadmapCard() {
  const [roleTitle, setRoleTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [weeks, setWeeks] = useState(8);
  const [hoursPerWeek, setHoursPerWeek] = useState(8);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RoadmapResult | null>(null);

  useEffect(() => {
    if (result) {
      document.getElementById("roadmap-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setResult(null);

    if (!roleTitle.trim()) {
      setError("Please enter the role you're targeting.");
      return;
    }
    if (!resumeText.trim()) {
      setError("Please paste your resume so the plan starts from what you already know.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleTitle, jobDescription, resumeText, weeks, hoursPerWeek }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          (data && typeof data.error === "string" && data.error) ||
            "Something went wrong. Please try again.",
        );
      }
      setResult(data as RoadmapResult);
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
          Get a plan to close your skill gaps
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          Tell us the role, your resume and how much time you have. You get a week-by-week plan with
          a deliverable each week and a portfolio project at the end.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div>
          <label htmlFor="roadmapRole" className="block text-sm font-medium text-slate-800">
            Target role
          </label>
          <input
            id="roadmapRole"
            type="text"
            value={roleTitle}
            onChange={(event) => setRoleTitle(event.target.value)}
            maxLength={120}
            placeholder="e.g. Junior Data Analyst"
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="roadmapWeeks" className="block text-sm font-medium text-slate-800">
              Weeks available
            </label>
            <select
              id="roadmapWeeks"
              value={weeks}
              onChange={(event) => setWeeks(Number(event.target.value))}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              {[4, 6, 8, 12].map((n) => (
                <option key={n} value={n}>
                  {n} weeks
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="roadmapHours" className="block text-sm font-medium text-slate-800">
              Study hours per week
            </label>
            <select
              id="roadmapHours"
              value={hoursPerWeek}
              onChange={(event) => setHoursPerWeek(Number(event.target.value))}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              {[4, 6, 8, 10, 15, 20].map((n) => (
                <option key={n} value={n}>
                  {n} hours
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5">
          <TextField
            id="roadmapResume"
            label="Resume"
            placeholder="Paste your resume as plain text…"
            value={resumeText}
            onChange={setResumeText}
            rows={8}
          />
        </div>
        <div className="mt-5">
          <TextField
            id="roadmapJd"
            label="Job description (optional, makes the plan more specific)"
            placeholder="Paste a job description for this role…"
            value={jobDescription}
            onChange={setJobDescription}
            rows={6}
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
              Building your plan…
            </>
          ) : (
            "Build my roadmap"
          )}
        </button>
      </form>

      <ErrorBox error={error} />
      {loading && <LoadingCard />}

      <div id="roadmap-results" className="mt-10 scroll-mt-6">
        {result && <RoadmapView result={result} />}
      </div>
    </>
  );
}

function RoadmapView({ result }: { result: RoadmapResult }) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Your plan for {result.roleTitle}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{result.startingPoint}</p>
        <p className="mt-3 text-xs text-slate-500">
          {result.weeks.length} weeks, {result.totalHours} planned hours against a budget of{" "}
          {result.budgetHours} hours. Totals are added up by CareerOS, not the AI.
        </p>
        {result.note && <p className="mt-2 text-xs font-medium text-amber-700">{result.note}</p>}
      </section>

      {result.weeks.map((week) => {
        const pct = Math.min(100, (week.plannedHours / result.hoursPerWeek) * 100);
        return (
          <section key={week.week} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">
                Week {week.week}: {week.focus}
              </h3>
              <span className="shrink-0 text-xs tabular-nums text-slate-500">
                {week.plannedHours} h / {result.hoursPerWeek} h
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${week.overBudget ? "bg-amber-500" : "bg-indigo-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {week.overBudget && (
              <p className="mt-1 text-xs text-amber-700">This week plans more than your weekly hours. Trim a task if needed.</p>
            )}
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {week.tasks.map((task, index) => (
                <li key={index} className="flex justify-between gap-4">
                  <span>{task.task}</span>
                  <span className="shrink-0 tabular-nums text-slate-400">{task.hours} h</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-950 ring-1 ring-indigo-100">
              <span className="font-semibold">You will have:</span> {week.deliverable}
            </p>
          </section>
        );
      })}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Portfolio project: {result.capstone.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{result.capstone.description}</p>
        {result.capstone.skills_shown.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">Shows: {result.capstone.skills_shown.join(", ")}</p>
        )}
      </section>

      <ListCard title="Update your resume when you finish" items={result.resumeUpdates} />
      <ListCard title="Are you ready? Check yourself" items={result.readinessChecks} />

      <p className="text-xs text-slate-500">
        This plan is an AI-assisted suggestion. CareerOS does not recommend specific courses or
        websites, so choose resources you trust.
      </p>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
