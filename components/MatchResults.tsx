"use client";

import type { MatchResult } from "@/lib/agents/match/schema";
import CopyButton from "./CopyButton";
import PlaceholderText from "./PlaceholderText";
import PlanEmailOptIn from "./PlanEmailOptIn";

/** Same colour scale as the profile results. */
function scoreTone(value: number | null) {
  if (value === null) return "bg-slate-200";
  if (value >= 80) return "bg-emerald-500";
  if (value >= 60) return "bg-indigo-500";
  if (value >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

/** Verdict banner colours, keyed by the three allowed labels. */
const VERDICT_STYLE: Record<MatchResult["verdict"]["label"], string> = {
  "Apply now": "border-emerald-200 bg-emerald-50 text-emerald-900",
  "Apply after small fixes": "border-amber-200 bg-amber-50 text-amber-900",
  "Build skills first": "border-rose-200 bg-rose-50 text-rose-900",
};

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
          <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function MatchResults({ result }: { result: MatchResult }) {
  const { score, verdict } = result;
  const notProvided = result.breakdown.filter((item) => item.score === null).length;

  return (
    <div className="space-y-6">
      {/* Verdict banner */}
      <div role="status" className={`rounded-2xl border p-5 ${VERDICT_STYLE[verdict.label]}`}>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
          Verdict for {result.roleTitle} at {result.company}
        </p>
        <p className="mt-1 text-xl font-semibold">{verdict.label}</p>
        <p className="mt-1 text-sm leading-relaxed">{verdict.reason}</p>
      </div>

      {/* Match score */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Match score
        </h2>

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

      {/* Breakdown */}
      <Section title="Score breakdown">
        <ul className="space-y-4">
          {result.breakdown.map((item, index) => {
            const provided = item.score !== null;
            const percent = provided ? Math.round((item.score! / item.max) * 100) : 0;

            return (
              <li key={`${item.area}-${index}`}>
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="font-medium text-slate-800">{item.area}</span>
                  <span
                    className={provided ? "tabular-nums text-slate-600" : "shrink-0 text-slate-400"}
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
      </Section>

      {/* Matched skills */}
      <Section title="Skills you already show" subtitle="Named in the job and found in your resume.">
        {result.matchedSkills.length === 0 ? (
          <p className="text-sm text-slate-400">
            None of the job&apos;s named skills appear in your resume.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {result.matchedSkills.map((skill, index) => (
              <li
                key={index}
                className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-800 ring-1 ring-emerald-100"
              >
                {skill}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Missing skills table */}
      <Section
        title="Skills to learn for this job"
        subtitle="Named in the job description but not shown in your resume."
      >
        {result.missingSkills.length === 0 ? (
          <p className="text-sm text-slate-400">No gaps found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3 font-semibold">Skill</th>
                  <th className="py-2 pr-3 font-semibold">Importance</th>
                  <th className="py-2 pr-3 font-semibold">How to learn it</th>
                  <th className="py-2 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {result.missingSkills.map((skill, index) => (
                  <tr key={index} className="border-b border-slate-100 align-top last:border-0">
                    <td className="py-3 pr-3 font-medium text-slate-900">{skill.skill}</td>
                    <td className="py-3 pr-3">
                      <span
                        className={
                          skill.importance === "must-have"
                            ? "rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-rose-100"
                            : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                        }
                      >
                        {skill.importance === "must-have" ? "Must-have" : "Nice-to-have"}
                      </span>
                    </td>
                    <td className="py-3 pr-3 leading-relaxed text-slate-600">{skill.how_to_learn}</td>
                    <td className="py-3 whitespace-nowrap text-slate-600">{skill.time_estimate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Resume changes */}
      <Section title="Change your resume for this job" subtitle="In priority order. Start at number 1.">
        {result.resumeChanges.length === 0 ? (
          <p className="text-sm text-slate-400">No changes suggested.</p>
        ) : (
          <ol className="space-y-3">
            {result.resumeChanges.map((change, index) => (
              <li key={index} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">
                  {index + 1}
                </span>
                <span className="pt-0.5">
                  <span className="font-medium text-slate-900">{change.issue}</span>
                  <span className="mt-0.5 block text-slate-600">{change.how_to_fix}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      {/* Tailored bullets */}
      <Section
        title="Tailored resume bullets"
        subtitle="Wording suggestions. Replace [brackets] with your real numbers and delete any that don't apply."
      >
        {result.tailoredBullets.length === 0 ? (
          <p className="text-sm text-slate-400">No bullets were suggested.</p>
        ) : (
          <div className="space-y-4">
            {result.tailoredBullets.map((bullet, index) => (
              <div key={index} className="rounded-xl border border-slate-200">
                <div className="border-b border-slate-100 bg-slate-50/60 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Original
                  </p>
                  <p className="text-sm leading-relaxed text-slate-600 line-through decoration-slate-300">
                    {bullet.original}
                  </p>
                </div>
                <div className="p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                      Improved
                    </p>
                    <CopyButton text={bullet.improved} />
                  </div>
                  <p className="text-sm leading-relaxed text-slate-900">
                    <PlaceholderText text={bullet.improved} />
                  </p>
                  {bullet.needs_from_student && (
                    <p className="mt-2 text-xs leading-relaxed text-amber-700">
                      Needs from you: <PlaceholderText text={bullet.needs_from_student} />
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Interview prep */}
      <Section
        title="Interview prep for this job"
        subtitle="Built only from the job description you pasted."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Likely questions</h3>
            {result.interviewPrep.likely_questions.length === 0 ? (
              <p className="text-sm text-slate-400">None listed.</p>
            ) : (
              <BulletList items={result.interviewPrep.likely_questions} />
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Topics to revise</h3>
            {result.interviewPrep.topics_to_revise.length === 0 ? (
              <p className="text-sm text-slate-400">None listed.</p>
            ) : (
              <BulletList items={result.interviewPrep.topics_to_revise} />
            )}
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-sky-50 p-4 ring-1 ring-sky-100">
          <h3 className="text-sm font-semibold text-sky-900">
            Research {result.company} yourself
          </h3>
          <p className="mt-1 text-xs text-sky-800">
            CareerOS has no internet access and states no facts about the company. Find these
            answers before your interview:
          </p>
          <div className="mt-3 text-sky-900">
            <BulletList items={result.interviewPrep.company_research_checklist} />
          </div>
        </div>
      </Section>

      {/* Confidence note */}
      <section className="rounded-2xl border border-slate-200 bg-slate-100/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Confidence note
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{result.confidenceNote}</p>
      </section>

      <p className="text-center text-xs text-slate-400">
        This review uses only your pasted text. It does not research the company.
      </p>

      {/* Optional automation: email the plan and log the score via n8n */}
      <PlanEmailOptIn
        targetRole={result.roleTitle}
        matchScore={score.normalisedScore}
        topFixes={result.resumeChanges.map((change) => change.issue)}
      />
    </div>
  );
}
