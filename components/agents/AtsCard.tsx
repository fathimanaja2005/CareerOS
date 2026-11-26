"use client";

import { useMemo } from "react";
import { atsChecks, atsSummary, type AtsStatus } from "@/lib/ats";

const PILL: Record<AtsStatus, { label: string; className: string }> = {
  pass: { label: "Pass", className: "bg-emerald-50 text-emerald-700" },
  warn: { label: "Check", className: "bg-amber-50 text-amber-700" },
  fail: { label: "Fix", className: "bg-rose-50 text-rose-700" },
};

/** Checks that need no AI: can an applicant tracking system read this resume text? */
export default function AtsCard({ text }: { text: string }) {
  const checks = useMemo(() => atsChecks(text), [text]);
  const { passed, total } = atsSummary(checks);
  if (!text.trim()) return null;

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Can a hiring system read this?</h2>
        <p className="text-sm text-slate-500">
          {passed} of {total} checks passed
        </p>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Many companies filter resumes with software before a person sees them. These checks run on
        your resume text and take no AI.
      </p>
      <ul className="mt-4 divide-y divide-slate-100">
        {checks.map((check) => (
          <li key={check.id} className="flex items-start gap-3 py-3">
            <span
              className={
                "mt-0.5 inline-flex w-14 shrink-0 justify-center rounded-full px-2 py-0.5 text-xs font-semibold " +
                PILL[check.status].className
              }
            >
              {PILL[check.status].label}
            </span>
            <div>
              <p className="text-sm font-medium text-slate-900">{check.label}</p>
              <p className="text-sm text-slate-500">{check.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
