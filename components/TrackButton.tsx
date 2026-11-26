"use client";

import { useState } from "react";
import { addApplication } from "@/lib/history";

/** Adds one job to the browser-only job tracker. */
export default function TrackButton({ company, role, url }: { company: string; role: string; url?: string }) {
  const [state, setState] = useState<"idle" | "added" | "exists">("idle");
  return (
    <button
      type="button"
      disabled={state !== "idle"}
      onClick={() => setState(addApplication({ company, role, url }) ? "added" : "exists")}
      className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 disabled:text-emerald-700"
    >
      {state === "idle" ? "Add to job tracker" : state === "added" ? "Added to your tracker" : "Already in your tracker"}
    </button>
  );
}
