"use client";

import { useState } from "react";
import {
  APP_STATUSES,
  addApplication,
  useStoredList,
  type AppStatus,
  type Application,
  type ScoreEntry,
  type ScoreKind,
} from "@/lib/history";
import { changeOverTime, countByStatus, interviewRate, seriesFor } from "@/lib/tracker";
import { LineChart, scoreTone } from "@/components/charts";
import { signInWithGoogle, useAuthUser } from "@/lib/auth";
import { deleteCloudData } from "@/lib/cloud";

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

const SERIES: { kind: ScoreKind; title: string }[] = [
  { kind: "report", title: "Career report" },
  { kind: "profile", title: "Profile review" },
  { kind: "match", title: "Job match" },
  { kind: "interview", title: "Interview practice" },
];

const STATUS_STYLE: Record<AppStatus, string> = {
  Saved: "border-slate-200 bg-slate-50",
  Applied: "border-sky-200 bg-sky-50",
  Interview: "border-amber-200 bg-amber-50",
  Offer: "border-emerald-200 bg-emerald-50",
  Rejected: "border-rose-200 bg-rose-50",
};

/** Progress tab: score history charts and a simple application tracker. All data stays in this browser. */
export default function ProgressCard() {
  const [scores, setScores] = useStoredList<ScoreEntry>("scores");
  const [apps, setApps] = useStoredList<Application>("applications");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [url, setUrl] = useState("");
  const { configured, user, ready } = useAuthUser();
  const [deleted, setDeleted] = useState(false);

  const counts = countByStatus(apps, APP_STATUSES);
  const rate = interviewRate(apps);

  function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!company.trim() || !role.trim()) return;
    const link = /^https?:\/\//i.test(url.trim()) ? url.trim() : "";
    addApplication({ company: company.trim(), role: role.trim(), url: link });
    setCompany("");
    setRole("");
    setUrl("");
  }

  function update(id: string, patch: Partial<Application>) {
    setApps(apps.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a)));
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Your progress</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          See your scores change as you fix your profile and practise, and keep track of every job you
          apply to. Without signing in this is saved in this browser only. Signing in with Google keeps your scores and job tracker on your account.
        </p>
      </div>

      {configured && ready && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          {user ? (
            <>
              <p>
                Signed in as <span className="font-medium">{user.email}</span>. Your scores and job tracker are
                saved to your account. Your resume is never saved.
              </p>
              <button
                type="button"
                disabled={deleted}
                onClick={async () => {
                  if (!window.confirm("Delete all scores and tracked jobs from your account?")) return;
                  const ok = await deleteCloudData();
                  if (ok) {
                    setScores([]);
                    setApps([]);
                    setDeleted(true);
                  }
                }}
                className="border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:border-rose-300 hover:text-rose-700 disabled:text-emerald-700"
              >
                {deleted ? "Deleted" : "Delete my saved data"}
              </button>
            </>
          ) : (
            <>
              <p>
                Sign in to keep your scores and job tracker across devices. Your resume stays in this browser.
              </p>
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                className="bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Sign in with Google
              </button>
            </>
          )}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Score history</h2>
        {scores.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No scores yet. Run a Career report, a Profile review, a Job match or Interview coach practice and the
            score appears here.
          </p>
        ) : (
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            {SERIES.map(({ kind, title }) => {
              const series = seriesFor(scores, kind);
              if (series.length === 0) return null;
              const latest = series[series.length - 1].score;
              const change = changeOverTime(series);
              return (
                <div key={kind} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                    <p className="text-sm">
                      <span className={`text-xl font-semibold tabular-nums ${scoreTone(latest).text}`}>{latest}</span>
                      {change !== null && (
                        <span className={`ml-2 text-xs font-medium ${change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {change >= 0 ? "+" : ""}
                          {change} since first
                        </span>
                      )}
                    </p>
                  </div>
                  <LineChart
                    title={`${title} score over time`}
                    points={series.map((s) => ({ at: s.at, score: s.score, label: s.label }))}
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    {series.length} {series.length === 1 ? "run" : "runs"}. Latest: {series[series.length - 1].label}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        {scores.length > 0 && (
          <button
            type="button"
            onClick={() => setScores([])}
            className="mt-4 text-xs text-slate-500 underline hover:text-slate-800"
          >
            Clear score history
          </button>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Job tracker</h2>
          <p className="text-xs text-slate-500">
            {apps.length} {apps.length === 1 ? "job" : "jobs"}
            {rate !== null && ` · ${rate}% of sent applications reached an interview`}
          </p>
        </div>

        <form onSubmit={add} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <input aria-label="Company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" maxLength={120} className={INPUT_CLASS} />
          <input aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role" maxLength={120} className={INPUT_CLASS} />
          <input aria-label="Job link (optional)" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link (optional)" className={INPUT_CLASS} />
          <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
            Add job
          </button>
        </form>

        {apps.length === 0 ? (
          <p className="mt-5 text-sm text-slate-500">
            Nothing here yet. Add a job above, or use “Add to job tracker” on the Tailor and Shortlister tabs.
          </p>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            {APP_STATUSES.map((status) => (
              <div key={status} className={`rounded-xl border p-3 ${STATUS_STYLE[status]}`}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {status} <span className="ml-1 tabular-nums text-slate-400">{counts[status]}</span>
                </h3>
                <div className="mt-2 space-y-2">
                  {apps
                    .filter((a) => a.status === status)
                    .map((a) => (
                      <div key={a.id} className="rounded-lg bg-white p-2.5 text-sm shadow-sm ring-1 ring-slate-100">
                        <p className="font-medium text-slate-900">{a.role}</p>
                        <p className="text-xs text-slate-500">{a.company}</p>
                        {a.url && (
                          <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 underline">
                            Open posting
                          </a>
                        )}
                        <input
                          aria-label={`Notes for ${a.role}`}
                          value={a.notes}
                          onChange={(e) => update(a.id, { notes: e.target.value.slice(0, 300) })}
                          placeholder="Note"
                          className="mt-2 w-full rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-indigo-400"
                        />
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <select
                            aria-label={`Status of ${a.role}`}
                            value={a.status}
                            onChange={(e) => update(a.id, { status: e.target.value as AppStatus })}
                            className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs"
                          >
                            {APP_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setApps(apps.filter((x) => x.id !== a.id))}
                            className="text-xs text-slate-400 hover:text-rose-600"
                            aria-label={`Remove ${a.role}`}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
