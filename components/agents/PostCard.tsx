"use client";

import { useMemo, useState } from "react";
import { useSharedValue } from "@/lib/shared-value";
import { buildPostFacts } from "@/lib/post";
import { ErrorBox, Spinner } from "./ProfileCard";
import type { PostResult } from "@/lib/agents/post/schema";

type Props = {
  scores: { kind: string; score: number; at: number }[];
  apps: { status: string }[];
};

/** Draft a LinkedIn post from the student's own saved scores. It can only use those numbers. */
export default function PostCard({ scores, apps }: Props) {
  const [role] = useSharedValue("role");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PostResult | null>(null);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  const facts = useMemo(() => buildPostFacts(role, scores, apps), [role, scores, apps]);
  const hasScores = scores.length > 0;

  async function write() {
    if (loading) return;
    setError("");
    setCopied(false);
    setLoading(true);
    try {
      const response = await fetch("/api/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facts, note }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error((data && typeof data.error === "string" && data.error) || "Something went wrong. Please try again.");
      }
      const next = data as PostResult;
      setResult(next);
      setText(next.hashtags.length ? `${next.post}\n\n${next.hashtags.join(" ")}` : next.post);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy. Select the text and copy it yourself.");
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Share your progress</h2>
      <p className="mt-2 text-sm text-slate-600">
        Turn your scores into a short LinkedIn post. It can only use the numbers saved on this page and
        whatever you type below.
      </p>

      <label htmlFor="postNote" className="mt-4 block text-sm font-medium text-slate-800">
        Anything you want to add <span className="font-normal text-slate-400">(optional)</span>
      </label>
      <textarea
        id="postNote"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={400}
        rows={2}
        placeholder="e.g. I finished a sales dashboard project in Power BI this week."
        className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />

      <button
        type="button"
        onClick={write}
        disabled={loading || !hasScores}
        className="mt-3 inline-flex items-center gap-2 rounded-xl btn-primary bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Spinner />
            Writing…
          </>
        ) : (
          "Write my post"
        )}
      </button>
      {!hasScores && (
        <p className="mt-2 text-xs text-slate-500">Run a Career report or a profile review first, so there is something to share.</p>
      )}

      <ErrorBox error={error} />

      {result && (
        <div className="mt-5">
          {result.unsupportedNumbers.length > 0 && (
            <p role="alert" className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Check {result.unsupportedNumbers.length === 1 ? "this number" : "these numbers"} before you post:{" "}
              <span className="font-semibold">{result.unsupportedNumbers.join(", ")}</span>. They are not in your saved scores
              or your note.
            </p>
          )}
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={10}
            aria-label="Your LinkedIn post draft"
            className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              {copied ? "Copied" : "Copy post"}
            </button>
            <button
              type="button"
              onClick={write}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:opacity-60"
            >
              Write another version
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">Edit it freely. Read it once before you post.</p>
        </div>
      )}
    </section>
  );
}
