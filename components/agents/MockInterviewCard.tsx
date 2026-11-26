"use client";

import { useState } from "react";
import TextField from "./TextField";
import ResumeField from "./ResumeField";
import { useSharedValue } from "@/lib/shared-value";
import { recordScore } from "@/lib/history";
import { gradeFor, summariseInterview } from "@/lib/interview";
import { Bar, ScoreRing } from "@/components/charts";
import { ErrorBox, PrivacyNote, Spinner } from "./ProfileCard";
import type { CoachQuestion, FeedbackResult, QuestionsResult } from "@/lib/agents/coach/schema";

const QUESTION_COUNT = 5;
const INPUT_CLASS =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

async function callCoach<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      (data && typeof data.error === "string" && data.error) || "Something went wrong. Please try again.",
    );
  }
  return data as T;
}

type Session = { roleTitle: string; company: string; jobDescription: string; questions: CoachQuestion[] };

/** A timed-style mock interview: five questions one at a time, each answer scored, then a final scorecard. */
export default function MockInterviewCard() {
  const [roleTitle, setRoleTitle] = useSharedValue("role");
  const [resumeText, setResumeText] = useSharedValue("resume");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<(FeedbackResult | null)[]>([]);
  const [finished, setFinished] = useState(false);

  async function start(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");
    if (!roleTitle.trim() || !company.trim() || !jobDescription.trim()) {
      setError("Please fill in the company, the role title and the job description.");
      return;
    }
    setLoading(true);
    try {
      const data = await callCoach<QuestionsResult>({
        mode: "questions",
        roleTitle,
        company,
        jobDescription,
        resumeText,
      });
      setSession({ roleTitle, company, jobDescription, questions: data.questions.slice(0, QUESTION_COUNT) });
      setIndex(0);
      setAnswer("");
      setResults([]);
      setFinished(false);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function score() {
    if (!session || loading) return;
    setError("");
    setLoading(true);
    try {
      const data = await callCoach<FeedbackResult>({
        mode: "feedback",
        roleTitle: session.roleTitle,
        company: session.company,
        jobDescription: session.jobDescription,
        question: session.questions[index].question,
        answer,
      });
      setResults((prev) => {
        const next = [...prev];
        next[index] = data;
        return next;
      });
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function next() {
    if (!session) return;
    setError("");
    if (index + 1 >= session.questions.length) {
      const summary = summariseInterview(
        results.filter(Boolean).map((r) => ({ score: r!.score.normalisedScore, breakdown: r!.breakdown })),
      );
      recordScore("interview", `${session.roleTitle} at ${session.company}`, summary.average);
      setFinished(true);
      return;
    }
    setIndex(index + 1);
    setAnswer("");
  }

  function skip() {
    setResults((prev) => {
      const nextList = [...prev];
      nextList[index] = null;
      return nextList;
    });
    next();
  }

  function reset() {
    setSession(null);
    setFinished(false);
    setResults([]);
    setAnswer("");
    setIndex(0);
    setError("");
  }

  return (
    <>
      <div className="mb-10">
        <p className="text-sm font-medium text-slate-500">Mock interview</p>
        <h1 className="mt-3 max-w-2xl text-4xl leading-[1.08] text-slate-900 sm:text-6xl">
          Five questions. <span className="mark">One honest scorecard.</span>
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
          Questions come one at a time and every answer is scored. At the end you see your average and
          your weakest area. CareerOS adds up the scores, not the AI.
        </p>
      </div>

      {!session && (
        <form onSubmit={start} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="mockRole" className="block text-sm font-medium text-slate-800">
                Role title
              </label>
              <input
                id="mockRole"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                maxLength={120}
                placeholder="e.g. Junior Data Analyst"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor="mockCompany" className="block text-sm font-medium text-slate-800">
                Company
              </label>
              <input
                id="mockCompany"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                maxLength={120}
                placeholder="e.g. Northwind Retail Analytics"
                className={INPUT_CLASS}
              />
            </div>
          </div>
          <div className="mt-5">
            <TextField
              id="mockJd"
              label="Job description"
              placeholder="Paste the job description…"
              value={jobDescription}
              onChange={setJobDescription}
              rows={7}
            />
          </div>
          <div className="mt-5">
            <ResumeField
              id="mockResume"
              label="Resume (optional, adds questions about your own projects)"
              value={resumeText}
              onChange={setResumeText}
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
                Preparing your interview…
              </>
            ) : (
              "Start mock interview"
            )}
          </button>
        </form>
      )}

      <ErrorBox error={error} />

      {session && !finished && (
        <QuestionStep
          session={session}
          index={index}
          answer={answer}
          setAnswer={setAnswer}
          result={results[index] ?? null}
          loading={loading}
          onScore={score}
          onNext={next}
          onSkip={skip}
        />
      )}

      {session && finished && <Scorecard session={session} results={results} onReset={reset} />}
    </>
  );
}

function QuestionStep({
  session,
  index,
  answer,
  setAnswer,
  result,
  loading,
  onScore,
  onNext,
  onSkip,
}: {
  session: Session;
  index: number;
  answer: string;
  setAnswer: (v: string) => void;
  result: FeedbackResult | null;
  loading: boolean;
  onScore: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const question = session.questions[index];
  const total = session.questions.length;
  const last = index + 1 >= total;
  return (
    <div className="mt-8 space-y-5">
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${((index + (result ? 1 : 0)) / total) * 100}%` }} />
      </div>
      <section key={index} className="tab-enter rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
          Question {index + 1} of {total} · {question.category}
        </p>
        <h2 className="mt-3 text-2xl font-semibold leading-snug tracking-tight text-slate-900">{question.question}</h2>

        {!result && (
          <>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={8}
              maxLength={4000}
              aria-label="Your answer"
              placeholder="Type your answer as you would say it in the interview…"
              className="mt-4 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onScore}
                disabled={loading || answer.trim().length < 20}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Spinner />
                    Scoring…
                  </>
                ) : (
                  "Score my answer"
                )}
              </button>
              <button
                type="button"
                onClick={onSkip}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:border-slate-300"
              >
                Skip this question
              </button>
            </div>
          </>
        )}
      </section>

      {result && (
        <section className="tab-enter rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-6">
            <ScoreRing score={result.score.normalisedScore} label="This answer" size={96} />
            <div className="min-w-[220px] flex-1 space-y-3">
              {result.breakdown.map((item) => (
                <Bar
                  key={item.area}
                  label={item.area}
                  percent={item.score === null ? 0 : Math.round((item.score / item.max) * 100)}
                  note={item.score === null ? "not scored" : `${item.score}/${item.max}`}
                />
              ))}
            </div>
          </div>
          {result.strengths.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-semibold text-slate-900">What worked</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {result.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {result.improvements.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">What to improve</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {result.improvements.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </>
          )}
          <div className="mt-4 rounded-xl bg-indigo-50 p-4 ring-1 ring-indigo-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">A stronger version of your answer</p>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-indigo-950">{result.improvedAnswer}</p>
            {result.needsFromStudent && (
              <p className="mt-2 text-xs text-indigo-800">To make it yours: {result.needsFromStudent}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onNext}
            className="mt-5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {last ? "Finish and see my scorecard" : "Next question"}
          </button>
        </section>
      )}
    </div>
  );
}

function Scorecard({
  session,
  results,
  onReset,
}: {
  session: Session;
  results: (FeedbackResult | null)[];
  onReset: () => void;
}) {
  const answered = results.filter(Boolean) as FeedbackResult[];
  const summary = summariseInterview(
    answered.map((r) => ({ score: r.score.normalisedScore, breakdown: r.breakdown })),
  );
  return (
    <div className="mt-8 space-y-5 tab-enter">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Scorecard · {session.roleTitle} at {session.company}
        </h2>
        {summary.answered === 0 ? (
          <p className="mt-3 text-sm text-slate-600">You skipped every question, so there is nothing to score. Try again when you are ready.</p>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-8">
            <ScoreRing score={summary.average} label="Average" size={128} />
            <div className="min-w-[220px] flex-1">
              <p className="text-3xl font-semibold tracking-tight text-slate-900">{gradeFor(summary.average)}</p>
              <p className="mt-1 text-sm text-slate-600">
                {summary.answered} of {session.questions.length} answered. Best {summary.best}, lowest {summary.worst}.
              </p>
              {summary.weakestArea && (
                <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
                  Weakest area: <span className="font-semibold">{summary.weakestArea}</span>. Practise this first.
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {summary.areas.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Across all answers</h3>
          <div className="mt-4 space-y-3">
            {summary.areas.map((a) => (
              <Bar key={a.area} label={a.area} percent={a.percent} />
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Question by question</h3>
        <div className="mt-4 space-y-3">
          {session.questions.map((q, i) => (
            <Bar
              key={i}
              label={`${i + 1}. ${q.question.length > 90 ? q.question.slice(0, 90) + "…" : q.question}`}
              percent={results[i]?.score.normalisedScore ?? 0}
              note={results[i] ? String(results[i]!.score.normalisedScore ?? "–") : "skipped"}
            />
          ))}
        </div>
      </section>

      <p className="text-xs text-slate-500">This score is saved in your browser so you can watch it improve on the Progress tab.</p>
      <button type="button" onClick={onReset} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">
        Practise again
      </button>
    </div>
  );
}
