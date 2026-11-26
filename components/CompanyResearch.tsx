"use client";

import { useEffect, useState } from "react";
import type { CompanyResearch as Research } from "@/lib/company";

type State = { status: "loading" } | { status: "off" } | { status: "error"; detail?: string } | { status: "done"; data: Research };

/** Looks the company up on the web and shows what it found, with sources. */
export default function CompanyResearch({
  company,
  roleTitle,
  checklist,
}: {
  company: string;
  roleTitle: string;
  checklist: React.ReactNode;
}) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetch("/api/company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company, roleTitle }),
    })
      .then(async (r) => {
        const body = await r.json().catch(() => null);
        if (!r.ok) throw new Error(body && typeof body.detail === "string" ? body.detail : "");
        return body as Research | { disabled: true };
      })
      .then((data) => {
        if (cancelled) return;
        if ("disabled" in data) setState({ status: "off" });
        else setState({ status: "done", data });
      })
      .catch((err: Error) => !cancelled && setState({ status: "error", detail: err.message }));
    return () => {
      cancelled = true;
    };
  }, [company, roleTitle]);

  return (
    <div className="mt-6 rounded-xl bg-sky-50 p-4 ring-1 ring-sky-100 text-sky-900">
      <h3 className="text-sm font-semibold">
        {state.status === "off" ? `Research ${company} yourself` : `About ${company}`}
      </h3>

      {state.status === "loading" && (
        <p className="mt-2 animate-pulse text-xs text-sky-800">Searching the web for {company}…</p>
      )}

      {state.status === "done" && state.data.found && (
        <>
          <p className="mt-2 text-sm leading-relaxed">{state.data.summary}</p>
          {state.data.facts.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {state.data.facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-sky-800">
            From web search.
            {state.data.sources.length > 0 && (
              <>
                {" "}Sources:{" "}
                {state.data.sources.map((s, i) => (
                  <span key={s.url}>
                    {i > 0 && " · "}
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">
                      {s.title}
                    </a>
                  </span>
                ))}
              </>
            )}
          </p>
        </>
      )}

      {state.status === "done" && !state.data.found && (
        <p className="mt-2 text-sm">
          We couldn&apos;t find reliable information about &ldquo;{company}&rdquo; online. Check the
          spelling, or confirm the company is real before you apply.
        </p>
      )}

      {state.status === "error" && (
        <p className="mt-2 text-sm">
          Company lookup isn&apos;t available right now.
          {state.detail && <span className="mt-1 block break-words text-xs">Details: {state.detail}</span>}
        </p>
      )}

      <div className={state.status === "off" ? "mt-2" : "mt-4 border-t border-sky-100 pt-3"}>
        <p className="text-xs font-semibold">
          {state.status === "off"
            ? "Look up these answers before your interview:"
            : "Questions to research before your interview"}
        </p>
        <div className="mt-2">{checklist}</div>
      </div>
    </div>
  );
}
