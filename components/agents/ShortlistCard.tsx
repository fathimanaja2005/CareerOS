"use client";

import { useState } from "react";
import TextField from "./TextField";
import ResumeField from "./ResumeField";
import { useSharedValue } from "@/lib/shared-value";
import { ErrorBox, PrivacyNote, Spinner } from "./ProfileCard";
import {
  rankEntries,
  sharedGaps,
  type ShortlistEntry,
} from "@/lib/agents/shortlist/aggregate";
import type { MatchResult } from "@/lib/agents/match/schema";

const MAX_JOBS = 5;

type JobInput = { id: number; company: string; roleTitle: string; jobDescription: string; url?: string };

type FoundJob = {
  id: string;
  company: string;
  title: string;
  location: string;
  jobType: string;
  url: string;
  description: string;
};

function emptyJob(id: number): JobInput {
  return { id, company: "", roleTitle: "", jobDescription: "" };
}

/**
 * UI card for the Opportunity Shortlister. The student pastes real job posts;
 * each one goes through the Job Match agent and the results are ranked in code.
 * Jobs come from the student's own paste or from a real job search (Remotive);
 * nothing here invents a job.
 */
export default function ShortlistCard() {
  const [resumeText, setResumeText] = useSharedValue("resume");
  const [jobs, setJobs] = useState<JobInput[]>([emptyJob(1), emptyJob(2)]);
  const [nextId, setNextId] = useState(3);

  const [searchRole, setSearchRole] = useSharedValue("role");
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<FoundJob[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [finderMessage, setFinderMessage] = useState("");

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [entries, setEntries] = useState<ShortlistEntry[] | null>(null);

  function updateJob(id: number, patch: Partial<JobInput>) {
    setJobs((current) => current.map((job) => (job.id === id ? { ...job, ...patch } : job)));
  }

  function addJob() {
    if (jobs.length >= MAX_JOBS) return;
    setJobs((current) => [...current, emptyJob(nextId)]);
    setNextId((value) => value + 1);
  }

  async function findJobs() {
    if (searching) return;
    setFinderMessage("");
    setFound(null);
    setPicked([]);
    if (searchRole.trim().length < 3) {
      setFinderMessage("Enter the role you want jobs for.");
      return;
    }
    setSearching(true);
    try {
      const response = await fetch(`/api/jobs?role=${encodeURIComponent(searchRole.trim())}`);
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error((data && typeof data.error === "string" && data.error) || "Job search failed.");
      }
      const list = (data?.jobs ?? []) as FoundJob[];
      setFound(list);
      setPicked(list.slice(0, 3).map((job) => job.id));
      if (list.length === 0) {
        setFinderMessage("No matching posts found. Try a broader role title, or paste posts below.");
      }
    } catch (err) {
      setFinderMessage(err instanceof Error ? err.message : "Job search failed.");
    } finally {
      setSearching(false);
    }
  }

  function togglePick(id: string) {
    setPicked((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : current.length >= MAX_JOBS
          ? current
          : [...current, id],
    );
  }

  function useSelected() {
    if (!found) return;
    const chosen = found.filter((job) => picked.includes(job.id));
    if (chosen.length < 2) {
      setFinderMessage("Select at least two jobs to compare.");
      return;
    }
    setFinderMessage("");
    setJobs(
      chosen.map((job, index) => ({
        id: nextId + index,
        company: job.company,
        roleTitle: job.title,
        jobDescription: job.description,
        url: job.url,
      })),
    );
    setNextId((value) => value + chosen.length);
    setEntries(null);
  }

  function removeJob(id: number) {
    setJobs((current) => (current.length > 1 ? current.filter((job) => job.id !== id) : current));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running) return;
    setError("");
    setEntries(null);

    if (!resumeText.trim()) {
      setError("Please paste your resume.");
      return;
    }
    const filled = jobs.filter((job) => job.company.trim() || job.roleTitle.trim() || job.jobDescription.trim());
    if (filled.length < 2) {
      setError("Add at least two job posts to compare.");
      return;
    }
    if (filled.some((job) => !job.company.trim() || !job.roleTitle.trim() || !job.jobDescription.trim())) {
      setError("Each job needs a company, a role title and the job description.");
      return;
    }

    setRunning(true);
    const collected: ShortlistEntry[] = [];
    try {
      for (let index = 0; index < filled.length; index++) {
        const job = filled[index];
        setProgress(`Scoring ${index + 1} of ${filled.length}: ${job.roleTitle} at ${job.company}…`);

        let result: MatchResult | null = null;
        let message = "";
        try {
          const response = await fetch("/api/match", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              resumeText,
              jobDescription: job.jobDescription,
              company: job.company,
              roleTitle: job.roleTitle,
            }),
          });
          const data = await response.json().catch(() => null);
          if (!response.ok) {
            message =
              (data && typeof data.error === "string" && data.error) ||
              "Something went wrong for this job.";
            if (response.status === 429) {
              collected.push({ id: String(job.id), company: job.company, roleTitle: job.roleTitle, result: null, error: message });
              setError("You've reached the request limit. The jobs scored so far are shown. Wait a few minutes to score the rest.");
              break;
            }
          } else {
            result = data as MatchResult;
          }
        } catch {
          message = "Could not reach the server for this job.";
        }

        collected.push({
          id: String(job.id),
          company: job.company,
          roleTitle: job.roleTitle,
          result,
          error: message,
        });
      }
      setEntries(collected);
    } finally {
      setRunning(false);
      setProgress("");
    }
  }

  const ranked = entries ? rankEntries(entries) : [];
  const scored = ranked.filter((entry) => entry.result);
  const gaps = entries ? sharedGaps(entries).filter((gap) => gap.jobs >= 2) : [];

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Which of these jobs should you apply to first?
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          Add your resume, then either let CareerOS find real remote job posts for your role or
          paste your own. Each post is scored with the Job Match agent and ranked, and you see
          the skills you are missing across several posts. CareerOS never invents a job.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <ResumeField id="shortlistResume" label="Your resume" value={resumeText} onChange={setResumeText} rows={8} />

        <section className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
          <h2 className="text-sm font-semibold text-slate-800">Find real jobs for me</h2>
          <p className="mt-1 text-xs text-slate-600">
            Searches current remote job posts from Remotive. Remote roles only, so for on-site or
            India-based jobs paste the posts yourself below.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={searchRole}
              onChange={(event) => setSearchRole(event.target.value)}
              maxLength={120}
              placeholder="e.g. Data Analyst"
              aria-label="Role to search for"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <button
              type="button"
              onClick={findJobs}
              disabled={searching}
              className="shrink-0 rounded-xl border border-indigo-600 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:opacity-60"
            >
              {searching ? "Searching…" : "Find jobs"}
            </button>
          </div>
          {finderMessage && (
            <p role="status" className="mt-2 text-xs text-slate-700">
              {finderMessage}
            </p>
          )}
          {found && found.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-slate-600">
                Pick two to five posts (the first three are selected).
              </p>
              <ul className="mt-2 space-y-2">
                {found.map((job) => (
                  <li key={job.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={picked.includes(job.id)}
                        onChange={() => togglePick(job.id)}
                        className="mt-1"
                      />
                      <span className="text-sm">
                        <span className="font-medium text-slate-900">{job.title}</span>
                        <span className="text-slate-600"> at {job.company}</span>
                        <span className="block text-xs text-slate-500">
                          {job.location}
                          {job.jobType ? ` · ${job.jobType}` : ""} ·{" "}
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 underline"
                          >
                            View on Remotive
                          </a>
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={useSelected}
                className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
              >
                Use {picked.length} selected job{picked.length === 1 ? "" : "s"}
              </button>
              <p className="mt-2 text-xs text-slate-500">
                Jobs from{" "}
                <a href="https://remotive.com" target="_blank" rel="noopener noreferrer" className="underline">
                  Remotive
                </a>
                , listed up to 24 hours late.
              </p>
            </div>
          )}
        </section>

        <div className="mt-6 space-y-5">
          {jobs.map((job, index) => (
            <fieldset key={job.id} className="rounded-xl border border-slate-200 p-4">
              <legend className="px-2 text-sm font-semibold text-slate-700">
                Job {index + 1}
                {job.url && (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-xs font-normal text-indigo-600 underline"
                  >
                    via Remotive
                  </a>
                )}
              </legend>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={job.company}
                  onChange={(event) => updateJob(job.id, { company: event.target.value })}
                  maxLength={120}
                  placeholder="Company name"
                  aria-label={`Company for job ${index + 1}`}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                <input
                  type="text"
                  value={job.roleTitle}
                  onChange={(event) => updateJob(job.id, { roleTitle: event.target.value })}
                  maxLength={120}
                  placeholder="Role title"
                  aria-label={`Role title for job ${index + 1}`}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="mt-3">
                <TextField
                  id={`shortlistJd${job.id}`}
                  label="Job description"
                  placeholder="Paste this job's description…"
                  value={job.jobDescription}
                  onChange={(value) => updateJob(job.id, { jobDescription: value })}
                  rows={5}
                />
              </div>
              {jobs.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeJob(job.id)}
                  className="mt-2 text-xs font-medium text-slate-500 hover:text-rose-600"
                >
                  Remove this job
                </button>
              )}
            </fieldset>
          ))}
        </div>

        {jobs.length < MAX_JOBS && (
          <button
            type="button"
            onClick={addJob}
            className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            + Add another job ({jobs.length} of {MAX_JOBS})
          </button>
        )}

        <PrivacyNote />

        <button
          type="submit"
          disabled={running}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {running ? (
            <>
              <Spinner />
              {progress || "Scoring…"}
            </>
          ) : (
            "Rank my options"
          )}
        </button>
        <p className="mt-2 text-xs text-slate-500">
          Each job takes about 10 to 20 seconds and counts as one request toward the limit.
        </p>
      </form>

      <ErrorBox error={error} />

      {entries && (
        <div className="mt-10 space-y-5">
          <h2 className="text-lg font-semibold text-slate-900">Your ranking</h2>

          {ranked.map((entry, index) => (
            <section key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                    {entry.result ? `#${index + 1}` : "Not scored"}
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    {entry.roleTitle} at {entry.company}
                  </h3>
                </div>
                {entry.result && (
                  <p className="shrink-0 text-right">
                    <span className="text-3xl font-semibold tracking-tight text-slate-900">
                      {entry.result.score.normalisedScore ?? "—"}
                    </span>
                    <span className="text-sm text-slate-400"> / 100</span>
                  </p>
                )}
              </div>

              {entry.result ? (
                <>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{entry.result.verdict.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{entry.result.verdict.reason}</p>
                  <p className="mt-3 text-xs text-slate-500">
                    You show {entry.result.matchedSkills.length} of the skills this job names.
                  </p>
                  {entry.result.missingSkills.length > 0 && (
                    <p className="mt-1 text-xs text-slate-600">
                      <span className="font-medium">To learn:</span>{" "}
                      {entry.result.missingSkills
                        .map((skill) => `${skill.skill} (${skill.importance})`)
                        .join(", ")}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-rose-700">{entry.error || "This job could not be scored."}</p>
              )}
            </section>
          ))}

          {scored.length >= 2 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-base font-semibold text-slate-900">Learn these first</h3>
              {gaps.length > 0 ? (
                <>
                  <p className="mt-1 text-sm text-slate-500">
                    Skills missing from more than one of your jobs, counted by CareerOS.
                  </p>
                  <ul className="mt-3 space-y-1 text-sm text-slate-700">
                    {gaps.map((gap) => (
                      <li key={gap.skill} className="flex justify-between gap-4">
                        <span>{gap.skill}</span>
                        <span className="shrink-0 tabular-nums text-slate-500">
                          missing in {gap.jobs} of {scored.length}
                          {gap.mustHaveJobs > 0 ? `, must-have in ${gap.mustHaveJobs}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-1 text-sm text-slate-500">
                  No single skill is missing from more than one of these jobs.
                </p>
              )}
            </section>
          )}

          <p className="text-xs text-slate-500">
            Scores are AI-assisted opinions based only on the text you pasted. They are not hiring
            decisions.
          </p>
        </div>
      )}
    </>
  );
}
