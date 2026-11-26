"use client";

import { useState } from "react";
import MatchCard from "@/components/agents/MatchCard";
import ProfileCard from "@/components/agents/ProfileCard";
import { AGENTS, type AgentId } from "@/lib/agents/registry";

/**
 * One UI card per agent. Adding an agent means adding its entry here and a
 * tab label in lib/agents/registry.ts.
 */
const CARDS: Record<AgentId, React.ComponentType> = {
  profile: ProfileCard,
  match: MatchCard,
};

export default function HomePage() {
  const [active, setActive] = useState<AgentId>("profile");
  const ActiveCard = CARDS[active];

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 px-4 py-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            C
          </span>
          <span className="text-lg font-semibold tracking-tight">CareerOS</span>

          {/* One tab per agent */}
          <nav
            aria-label="Agents"
            className="ml-auto flex gap-1 rounded-xl bg-slate-100 p-1 text-sm"
          >
            {AGENTS.map((agent) => (
              <button
                key={agent.id}
                type="button"
                onClick={() => setActive(agent.id)}
                aria-current={active === agent.id ? "page" : undefined}
                className={
                  active === agent.id
                    ? "rounded-lg bg-white px-3 py-1.5 font-medium text-slate-900 shadow-sm"
                    : "rounded-lg px-3 py-1.5 font-medium text-slate-500 transition hover:text-slate-900"
                }
              >
                {agent.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        {/* Both cards stay mounted so switching tabs keeps what you typed. */}
        {AGENTS.map((agent) => {
          const Card = CARDS[agent.id];
          return (
            <div key={agent.id} hidden={active !== agent.id}>
              <Card />
            </div>
          );
        })}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6 text-xs text-slate-500">
          CareerOS gives an AI-assisted review, not a hiring decision. Always check advice against
          the job description you&apos;re applying to.
        </div>
      </footer>
    </div>
  );
}
