"use client";

import { useEffect, useState } from "react";
import TextField from "./TextField";
import ResumeField from "./ResumeField";
import { useSharedValue } from "@/lib/shared-value";
import { navigateTo, recordScore } from "@/lib/history";
import { mergeSkills, overallReadiness, readinessLabel } from "@/lib/career";
import { ScoreRing } from "@/components/charts";
import { Reveal } from "@/components/motion";
import { ErrorBox, PrivacyNote, Spinner } from "./ProfileCard";
import type { AnalysisResult } from "@/lib/agents/profile/schema";
import type { MatchResult } from "@/lib/agents/match/schema";
import type { RoadmapResult } from "@/lib/agents/roadmap/schema";

const INPUT_CLASS =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

async function post<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((data && typeof data.error === "string" && data.error) || "Something went wrong.");
  }
  return data as T;
}

type Report = {
  roleTitle: string;
  profile: AnalysisResult | null;
  match: MatchResult | null;
  roadmap: RoadmapResult | null;
  failures: string[];
};

const STEPS = ["Reviewing your profile", "Checking fit with the job", "Planning your next 4 weeks"];

/** Career report: runs the Profile, Match and Roadmap agents together and shows one dashboard. */
export default function ReportCard() {
  const [roleTitle, setRoleTitle] = useSharedValue("role");
  const [resumeText, setResumeText] = useSharedValue("resume");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [done, setDone] = useState<boolean[]>([false, false, false]);

  useEffect(() => {
    if (report) document.getElementById("report-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [report]);

  async function run(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setReport(null);
    if (!roleTitle.trim() || !resumeText.trim()) {
      setError("Please enter your target role and add your resume.");
      return;
    }
    const hasJob = jobDescription.trim().length > 0;
    setLoading(true);
    setDone([false, !hasJob, false]);

    const mark = (i: number) => setDone((prev) => prev.map((v, j) => (j === i ? true : v)));
    const failures: string[] = [];

    const [profile, match, roadmap] = await Promise.all([
      post<AnalysisResult>("/api/analyze", { targetRole: roleTitle, resumeText, linkedinText: "" })
        .catch((e: Error) => {
          failures.push(`Profile review: ${e.message}`);
          return null;
        })
        .finally(() => mark(0)),
      hasJob
        ? post<MatchResult>("/api/match", { resumeText, jobDescription, company: company || "the company", roleTitle })
            .catch((e: Error) => {
              failures.push(`Job match: ${e.message}`);
              return null;
            })
            .finally(() => mark(1))
        : Promise.resolve(null),
      post<RoadmapResult>("/api/roadmap", { roleTitle, jobDescription, resumeText, weeks: 4, hoursPerWeek: 8 })
        .catch((e: Error) => {
          failures.push(`Roadmap: ${e.message}`);
          return null;
        })
        .finally(() => mark(2)),
    ]);

    setLoading(false);
    if (!profile && !match && !roadmap) {
      setError(failures[0] ?? "Something went wrong. Please try again.");
      return;
    }
    const resumeScore = profile?.resume.score.normalisedScore ?? null;
    const matchScore = match?.score.normalisedScore ?? null;
    recordScore("profile", roleTitle, resumeScore);
    recordScore("match", company ? `${roleTitle} at ${company}` : roleTitle, matchScore);
    recordScore("report", roleTitle, overallReadiness([resumeScore, matchScore]));
    setReport({ roleTitle, profile, match, roadmap, failures });
  }

  return (
    <>
      <div className="mb-10">
        <p className="text-sm font-medium text-slate-500">Career report</p>
        <h1 className="mt-3 max-w-2xl text-4xl leading-[1.08] text-slate-900 sm:text-6xl">
          Where you stand, and <span className="mark">what to do next</span>
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
          Add your resume and a target role. Three agents read it at the same time and come back with
          one page: a readiness score, the fixes that matter most, the skills to build and a four-week plan.
        </p>
      </div>

      <form onSubmit={run} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="repRole" className="block text-sm font-medium text-slate-800">
              Target role
            </label>
            <input
              id="repRole"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              maxLength={120}
              placeholder="e.g. Junior Data Analyst"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="repCompany" className="block text-sm font-medium text-slate-800">
              Company (optional, for the job match)
            </label>
            <input
              id="repCompany"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              maxLength={120}
              placeholder="e.g. Northwind Retail Analytics"
              className={INPUT_CLASS}
            />
          </div>
        </div>
        <div className="mt-5">
          <ResumeField id="repResume" label="Resume" value={resumeText} onChange={setResumeText} rows={8} />
        </div>
        <div className="mt-5">
          <TextField
            id="repJd"
            label="Job description (optional, adds a job-fit score)"
            placeholder="Paste a job description to also see how well you fit it…"
            value={jobDescription}
            onChange={setJobDescription}
            rows={6}
          />
        </div>
        <PrivacyNote />
        <button
          type="submit"
          disabled={loading}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl btn-primary bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Spinner />
              Running your agents…
            </>
          ) : (
            "Run my career report"
          )}
        </button>
      </form>

      <ErrorBox error={error} />

      {loading && (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xl font-semibold text-slate-900">Three agents are reading your resume</p>
          <ul className="mt-5 space-y-3.5">
            {STEPS.map((step, i) => {
              const skipped = i === 1 && !jobDescription.trim();
              return (
                <li key={step} className="flex items-center gap-3 text-sm text-slate-700">
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs transition-all duration-500 ${
                      done[i]
                        ? "bg-indigo-600 text-white"
                        : "border border-slate-300 text-slate-400 [animation:pulse-ring_1.4s_ease-out_infinite]"
                    }`}
                  >
                    {done[i] ? "✓" : ""}
                  </span>
                  <span className={done[i] ? "text-slate-500" : ""}>
                    {skipped ? "Job fit skipped, no job description added" : step}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 h-0.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-700 ease-out"
              style={{ width: `${(done.filter(Boolean).length / done.length) * 100}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">Usually 20 to 40 seconds.</p>
        </div>
      )}

      <div id="report-results" className="mt-10 scroll-mt-6">
        {report && <Dashboard report={report} />}
      </div>
    </>
  );
}

function Dashboard({ report }: { report: Report }) {
  const { profile, match, roadmap } = report;
  const resumeScore = profile?.resume.score.normalisedScore ?? null;
  const linkedinScore = profile?.linkedin.score.normalisedScore ?? null;
  const matchScore = match?.score.normalisedScore ?? null;
  const overall = overallReadiness([resumeScore, matchScore]);

  const fixes = profile?.resume.top_fixes.slice(0, 3) ?? [];
  const skills = mergeSkills(
    match?.missingSkills.filter((s) => s.importance === "must-have").map((s) => s.skill) ?? [],
    profile?.missing_skills_for_role ?? [],
    match?.missingSkills.map((s) => s.skill) ?? [],
  ).slice(0, 8);

  return (
    <div className="space-y-5">
      <Reveal delay={0}>
<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Readiness for {report.roleTitle}
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-8">
          <ScoreRing score={overall} label="Overall" size={140} />
          <div className="min-w-[220px] flex-1">
            <p className="text-xl font-semibold text-slate-900">{readinessLabel(overall)}</p>
            <p className="mt-1 text-xs text-slate-500">
              Overall is the average of the scores below, worked out by CareerOS, not the AI.
            </p>
            <div className="mt-4 flex flex-wrap gap-6">
              <ScoreRing score={resumeScore} label="Resume" size={84} />
              {match && <ScoreRing score={matchScore} label="Job fit" size={84} />}
            </div>
            {linkedinScore !== null && (
              <p className="mt-2 text-xs text-slate-500">LinkedIn score: {linkedinScore}</p>
            )}
          </div>
        </div>
        {match && (
          <p className="mt-5 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-950 ring-1 ring-indigo-100">
            <span className="font-semibold">{match.verdict.label}.</span> {match.verdict.reason}
          </p>
        )}
      </section>
</Reveal>

      {report.failures.length > 0 && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Part of the report could not be built, so it is missing below:
          <ul className="mt-1 list-disc pl-5">
            {report.failures.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {fixes.length > 0 && (
        <Reveal delay={80}>
<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Fix these first</h3>
          <ol className="mt-3 space-y-3">
            {fixes.map((fix, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-slate-900">{fix.issue}</p>
                  <p className="mt-0.5 text-slate-600">{fix.how_to_fix}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
</Reveal>
      )}

      {skills.length > 0 && (
        <Reveal delay={160}>
<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Skills to build</h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <span key={skill} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-100">
                {skill}
              </span>
            ))}
          </div>
          {match && match.matchedSkills.length > 0 && (
            <p className="mt-4 text-xs text-slate-500">
              Already matching this job: {match.matchedSkills.slice(0, 10).join(", ")}
            </p>
          )}
        </section>
</Reveal>
      )}

      {roadmap && (
        <Reveal delay={240}>
<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Your next {roadmap.weeks.length} weeks</h3>
          <ol className="mt-3 space-y-3">
            {roadmap.weeks.map((week) => (
              <li key={week.week} className="rounded-xl border border-slate-100 p-3 text-sm">
                <p className="font-medium text-slate-900">
                  Week {week.week}: {week.focus}
                </p>
                <p className="mt-0.5 text-slate-600">You will have: {week.deliverable}</p>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm text-slate-700">
            <span className="font-semibold">Portfolio project:</span> {roadmap.capstone.title}
          </p>
        </section>
</Reveal>
      )}

      <Reveal delay={320}>
<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">What next</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["tailor", "Tailor my resume for a job"],
            ["coach", "Practise interview questions"],
            ["shortlist", "Find and rank real jobs"],
            ["progress", "Open my progress"],
          ].map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => navigateTo(tab)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
            >
              {label}
            </button>
          ))}
        </div>
      </section>
</Reveal>
    </div>
  );
}
