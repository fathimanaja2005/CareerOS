"use client";

import { useState } from "react";
import TextField from "./TextField";
import ResumeField from "./ResumeField";
import { useSharedValue } from "@/lib/shared-value";
import { ErrorBox, PrivacyNote, Spinner } from "./ProfileCard";
import type { CoachQuestion, FeedbackResult, QuestionsResult } from "@/lib/agents/coach/schema";

type Context = { roleTitle: string; company: string; jobDescription: string };

async function callCoach<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      (data && typeof data.error === "string" && data.error) ||
        "Something went wrong. Please try again.",
    );
  }
  return data as T;
}

/** UI card for the Interview Coach: get questions for one job, then practise answers. */
export default function CoachCard() {
  const [company, setCompany] = useState("");
  const [roleTitle, setRoleTitle] = useSharedValue("role");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useSharedValue("resume");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<CoachQuestion[] | null>(null);
  const [context, setContext] = useState<Context | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setQuestions(null);

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
      setContext({ roleTitle, company, jobDescription });
      setQuestions(data.questions);
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
          Practise for this interview
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          Get likely questions for one specific job, write your answer to each, and get a scored
          review with a stronger version built only from what you actually did.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <LabeledInput id="coachCompany" label="Company name" value={company} onChange={setCompany} placeholder="e.g. Acme Corp" />
          <LabeledInput id="coachRole" label="Role title" value={roleTitle} onChange={setRoleTitle} placeholder="e.g. Junior Data Analyst" />
        </div>
        <div className="mt-5">
          <TextField
            id="coachJd"
            label="Job description"
            placeholder="Paste the job description you're preparing for…"
            value={jobDescription}
            onChange={setJobDescription}
            rows={8}
          />
        </div>
        <div className="mt-5">
          <ResumeField id="coachResume" label="Resume (optional, adds questions about your own projects)" value={resumeText} onChange={setResumeText} rows={6} />
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
              Preparing questions…
            </>
          ) : (
            "Get interview questions"
          )}
        </button>
      </form>

      <ErrorBox error={error} />

      {questions && context && (
        <div className="mt-10 space-y-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Likely questions for {context.roleTitle} at {context.company}
          </h2>
          <p className="text-sm text-slate-500">
            Built only from the job description you pasted. CareerOS does not research the company.
          </p>
          {questions.map((q, index) => (
            <QuestionPanel key={`${index}-${q.question}`} question={q} number={index + 1} context={context} />
          ))}
        </div>
      )}
    </>
  );
}

function LabeledInput({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={120}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
    </div>
  );
}

function QuestionPanel({
  question,
  number,
  context,
}: {
  question: CoachQuestion;
  number: number;
  context: Context;
}) {
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);

  async function review() {
    if (loading) return;
    setError("");
    setFeedback(null);
    if (answer.trim().length < 20) {
      setError("Write your answer first, at least a couple of sentences.");
      return;
    }
    setLoading(true);
    try {
      const data = await callCoach<FeedbackResult>({
        mode: "feedback",
        ...context,
        question: question.question,
        answer,
      });
      setFeedback(data);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
        Question {number} · {question.category}
      </p>
      <h3 className="mt-1 text-base font-semibold text-slate-900">{question.question}</h3>
      <p className="mt-2 text-sm text-slate-500">
        <span className="font-medium text-slate-600">What they look for:</span>{" "}
        {question.what_interviewer_looks_for}
      </p>

      <textarea
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        maxLength={4000}
        rows={5}
        placeholder="Type your answer the way you would say it in the interview…"
        aria-label={`Your answer to question ${number}`}
        className="mt-4 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
      <button
        type="button"
        onClick={review}
        disabled={loading}
        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Spinner />
            Reviewing…
          </>
        ) : (
          "Review my answer"
        )}
      </button>

      <ErrorBox error={error} />
      {feedback && <FeedbackView feedback={feedback} />}
    </section>
  );
}

function FeedbackView({ feedback }: { feedback: FeedbackResult }) {
  const { score } = feedback;
  return (
    <div className="mt-6 space-y-5 border-t border-slate-100 pt-5">
      <div>
        <p className="flex items-baseline gap-1">
          <span className="text-4xl font-semibold tracking-tight text-slate-900">
            {score.normalisedScore ?? "—"}
          </span>
          <span className="text-base text-slate-400">/ 100</span>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {score.pointsAwarded} of {score.scoredOutOf} points. Totals are calculated by CareerOS, not the AI.
        </p>
      </div>

      <ul className="space-y-3">
        {feedback.breakdown.map((item) => (
          <li key={item.area}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-slate-800">{item.area}</span>
              <span className="tabular-nums text-slate-500">
                {item.score === null ? "not scored" : `${item.score} / ${item.max}`}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${item.score === null ? 0 : (item.score / item.max) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.reason}</p>
          </li>
        ))}
      </ul>

      <FeedbackList title="What worked" items={feedback.strengths} />
      <FeedbackList title="What to improve" items={feedback.improvements} />

      <div className="rounded-xl bg-indigo-50 p-4 ring-1 ring-indigo-100">
        <h4 className="text-sm font-semibold text-indigo-900">A stronger version of your answer</h4>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-indigo-950">
          {feedback.improvedAnswer}
        </p>
        {feedback.needsFromStudent && (
          <p className="mt-3 text-xs text-indigo-800">
            Fill the [brackets] with real details. Needed from you: {feedback.needsFromStudent}
          </p>
        )}
      </div>
    </div>
  );
}

function FeedbackList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
