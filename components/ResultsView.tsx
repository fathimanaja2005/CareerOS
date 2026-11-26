"use client";

import type { AnalysisResult } from "@/lib/agents/profile/schema";
import type { BreakdownItem, Fix, SectionScore } from "@/lib/agents/shared";
import CopyButton from "./CopyButton";
import PlaceholderText from "./PlaceholderText";

/** Shared colour scale for scores and bars. */
function scoreTone(value: number | null) {
  if (value === null) return "bg-slate-200";
  if (value >= 80) return "bg-emerald-500";
  if (value >= 60) return "bg-indigo-500";
  if (value >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

function ScoreCard({
  title,
  score,
  items,
}: {
  title: string;
  score: SectionScore;
  items: BreakdownItem[];
}) {
  const notProvided = items.filter((item) => item.score === null).length;
  const scored = items.length - notProvided;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
        <span className="text-xs text-slate-400">
          {scored} of {items.length} areas scored
        </span>
      </div>

      {score.normalisedScore === null ? (
        <p className="mt-4 text-3xl font-semibold text-slate-400">Not provided</p>
      ) : (
        <p className="mt-3 flex items-baseline gap-1">
          <span className="text-5xl font-semibold tracking-tight text-slate-900">
            {score.normalisedScore}
          </span>
          <span className="text-lg text-slate-400">/ 100</span>
        </p>
      )}

      <p className="mt-2 text-sm text-slate-500">
        {score.scoredOutOf > 0
          ? `Scored out of ${score.scoredOutOf} points (${score.pointsAwarded} awarded)`
          : "Nothing to score in this section."}
      </p>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${scoreTone(score.normalisedScore)}`}
          style={{ width: `${score.normalisedScore ?? 0}%` }}
        />
      </div>

      {notProvided > 0 && (
        <p className="mt-3 text-xs text-slate-400">
          {notProvided} {notProvided === 1 ? "area was" : "areas were"} not provided, so{" "}
          {notProvided === 1 ? "it is" : "they are"} left out of the score.
        </p>
      )}
    </div>
  );
}

function Breakdown({ title, items }: { title: string; items: BreakdownItem[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <ul className="mt-3 space-y-4">
        {items.map((item, index) => {
          const provided = item.score !== null;
          const percent = provided ? Math.round((item.score! / item.max) * 100) : 0;

          return (
            <li key={`${item.area}-${index}`}>
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span className="font-medium text-slate-800">{item.area}</span>
                <span
                  className={
                    provided ? "tabular-nums text-slate-600" : "shrink-0 text-slate-400"
                  }
                >
                  {provided ? `${item.score} / ${item.max}` : "Not provided"}
                </span>
              </div>

              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                {provided ? (
                  <div
                    className={`h-full rounded-full ${scoreTone(percent)}`}
                    style={{ width: `${percent}%` }}
                  />
                ) : (
                  <div className="h-full w-full rounded-full border border-dashed border-slate-200" />
                )}
              </div>

              <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.reason}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2 text-sm leading-relaxed text-slate-700">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function FixList({ fixes }: { fixes: Fix[] }) {
  if (fixes.length === 0) {
    return <p className="text-sm text-slate-400">No fixes listed.</p>;
  }

  return (
    <ol className="space-y-3">
      {fixes.map((fix, index) => (
        <li key={index} className="flex gap-3 text-sm leading-relaxed text-slate-700">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">
            {fix.priority}
          </span>
          <span className="pt-0.5">
            <span className="font-medium text-slate-900">{fix.issue}</span>
            <span className="mt-0.5 block text-slate-600">{fix.how_to_fix}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function ResultsView({ result }: { result: AnalysisResult }) {
  const { resume, linkedin } = result;

  return (
    <div className="space-y-6">
      {/* Score cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <ScoreCard title="Resume" score={resume.score} items={resume.breakdown} />
        <ScoreCard title="LinkedIn" score={linkedin.score} items={linkedin.breakdown} />
      </div>

      {/* Breakdown tables */}
      <Section
        title="Score breakdown"
        subtitle={`Judged against: ${result.targetRole}`}
      >
        <div className="grid gap-8 md:grid-cols-2">
          <Breakdown title="Resume" items={resume.breakdown} />
          <Breakdown title="LinkedIn" items={linkedin.breakdown} />
        </div>
      </Section>

      {/* Strengths and fixes */}
      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Strengths" subtitle="What is already working">
          {resume.top_strengths.length > 0 ? (
            <BulletList items={resume.top_strengths} />
          ) : (
            <p className="text-sm text-slate-400">No strengths listed.</p>
          )}
        </Section>

        <Section title="Top fixes" subtitle="In priority order — start at number 1">
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Resume
              </p>
              <FixList fixes={resume.top_fixes} />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                LinkedIn
              </p>
              <FixList fixes={linkedin.top_fixes} />
            </div>
          </div>
        </Section>
      </div>

      {/* Rewrites */}
      <Section
        title="Resume rewrites"
        subtitle="Wording suggestions. Replace [brackets] with your real numbers and delete any that don't apply."
      >
        {resume.rewrites.length === 0 ? (
          <p className="text-sm text-slate-400">No rewrites were suggested.</p>
        ) : (
          <div className="space-y-4">
            {resume.rewrites.map((rewrite, index) => (
              <div key={index} className="rounded-xl border border-slate-200">
                <div className="border-b border-slate-100 bg-slate-50/60 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Original
                  </p>
                  <p className="text-sm leading-relaxed text-slate-600 line-through decoration-slate-300">
                    {rewrite.original}
                  </p>
                </div>
                <div className="p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                      Improved
                    </p>
                    <CopyButton text={rewrite.improved} />
                  </div>
                  <p className="text-sm leading-relaxed text-slate-900">
                    <PlaceholderText text={rewrite.improved} />
                  </p>
                  {rewrite.needs_from_student && (
                    <p className="mt-2 text-xs leading-relaxed text-amber-700">
                      Needs from you: <PlaceholderText text={rewrite.needs_from_student} />
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* LinkedIn headline options */}
      <Section title="LinkedIn headline options" subtitle="Pick one and make it yours">
        {linkedin.headline_options.length === 0 ? (
          <p className="text-sm text-slate-400">No headline options were suggested.</p>
        ) : (
          <ul className="space-y-2">
            {linkedin.headline_options.map((headline, index) => (
              <li
                key={index}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3"
              >
                <span className="text-sm leading-relaxed text-slate-800">{headline}</span>
                <CopyButton text={headline} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* About rewrite */}
      <Section title="LinkedIn About rewrite">
        {linkedin.about_rewrite ? (
          <div>
            <div className="mb-2 flex justify-end">
              <CopyButton text={linkedin.about_rewrite} label="Copy About" />
            </div>
            <p className="whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
              <PlaceholderText text={linkedin.about_rewrite} />
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No About rewrite was suggested.</p>
        )}
      </Section>

      {/* Missing skills */}
      <Section
        title="Missing skills for this role"
        subtitle="Commonly expected for the role but not visible in your profile"
      >
        {result.missing_skills_for_role.length === 0 ? (
          <p className="text-sm text-slate-400">No gaps found — nice.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {result.missing_skills_for_role.map((skill, index) => (
              <li
                key={index}
                className="rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-800 ring-1 ring-amber-100"
              >
                {skill}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Confidence note */}
      <section className="rounded-2xl border border-slate-200 bg-slate-100/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Confidence note
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{result.confidence_note}</p>
      </section>
    </div>
  );
}
