"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import CoachCard from "@/components/agents/CoachCard";
import MatchCard from "@/components/agents/MatchCard";
import RoadmapCard from "@/components/agents/RoadmapCard";
import ShortlistCard from "@/components/agents/ShortlistCard";
import ProfileCard from "@/components/agents/ProfileCard";
import ReportCard from "@/components/agents/ReportCard";
import TailorCard from "@/components/agents/TailorCard";
import ProgressCard from "@/components/agents/ProgressCard";
import AuthButton from "@/components/AuthButton";
import { NAV_EVENT } from "@/lib/history";
import { AGENTS, type AgentId } from "@/lib/agents/registry";

/**
 * One UI card per agent. Adding an agent means adding its entry here and a
 * tab label in lib/agents/registry.ts.
 */
const CARDS: Record<AgentId, React.ComponentType> = {
  report: ReportCard,
  tailor: TailorCard,
  progress: ProgressCard,
  profile: ProfileCard,
  match: MatchCard,
  coach: CoachCard,
  roadmap: RoadmapCard,
  shortlist: ShortlistCard,
};

export default function HomePage() {
  const [active, setActive] = useState<AgentId>("report");

  // Cards can switch tabs (for example "Open my progress") with a small window event.
  useEffect(() => {
    function onNavigate(event: Event) {
      const tab = (event as CustomEvent<{ tab: string }>).detail?.tab;
      if (AGENTS.some((agent) => agent.id === tab)) setActive(tab as AgentId);
    }
    window.addEventListener(NAV_EVENT, onNavigate);
    return () => window.removeEventListener(NAV_EVENT, onNavigate);
  }, []);

  // A thin underline slides to the active tab.
  const navRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    function place() {
      const el = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [active]);

  return (
    <div className="min-h-screen">
      <div className="ambient" aria-hidden="true">
        <span className="a" />
        <span className="b" />
        <span className="c" />
        <span className="d" />
      </div>

      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/50 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-4 pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-baseline gap-3">
              <span className="text-xl font-semibold tracking-tight text-slate-900">CareerOS</span>
              <span className="hidden truncate text-xs text-slate-500 md:inline">
                {AGENTS.find((agent) => agent.id === active)?.tagline}
              </span>
            </div>
            <AuthButton />
          </div>

          <nav
            ref={navRef}
            aria-label="Agents"
            className="relative mt-3 mb-3 flex w-fit max-w-full overflow-x-auto rounded-full bg-white/60 p-1 ring-1 ring-white/80 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <span
              aria-hidden="true"
              className="absolute top-1 bottom-1 rounded-full bg-slate-900 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.5)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ left: indicator.left, width: indicator.width }}
            />
            {AGENTS.map((agent) => (
              <button
                key={agent.id}
                type="button"
                onClick={() => setActive(agent.id)}
                aria-current={active === agent.id ? "page" : undefined}
                className={
                  "relative z-10 shrink-0 px-3 py-2 text-[13px] font-medium transition-colors duration-300 " +
                  (active === agent.id ? "text-white" : "text-slate-500 hover:text-slate-900")
                }
              >
                {agent.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        {/* Every card stays mounted so switching tabs keeps what you typed. */}
        {AGENTS.map((agent) => {
          const Card = CARDS[agent.id];
          return (
            <div key={agent.id} hidden={active !== agent.id} className="tab-enter">
              <Card />
            </div>
          );
        })}
      </main>

      <footer>
        <div className="mx-auto max-w-4xl px-4 py-6 text-xs text-slate-500">
          CareerOS gives an AI-assisted review, not a hiring decision. Always check advice against
          the job description you&apos;re applying to.
          <div className="mt-2">
            <Link href="/privacy" className="underline-offset-2 transition-colors hover:text-slate-900 hover:underline">
              Privacy policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
