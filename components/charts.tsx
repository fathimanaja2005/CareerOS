"use client";

import { useCountUp, useMounted } from "./motion";

/** Small SVG and CSS charts used by the dashboard, interview coach and progress tabs. No chart library. */

export function scoreTone(score: number | null): { text: string; stroke: string; fill: string } {
  // Soft pastel tones so the bars sit in the pearl background instead of fighting it.
  if (score === null) return { text: "text-slate-400", stroke: "#b9b6c9", fill: "linear-gradient(90deg, #d9d6e6, #c9c5da)" };
  if (score >= 75) return { text: "text-emerald-600", stroke: "#6cc596", fill: "linear-gradient(90deg, #a8e3c2, #6cc596)" };
  if (score >= 50) return { text: "text-amber-600", stroke: "#f2b266", fill: "linear-gradient(90deg, #f8d6a4, #f2b266)" };
  return { text: "text-rose-600", stroke: "#f08f86", fill: "linear-gradient(90deg, #f9c0ba, #f08f86)" };
}

export function ScoreRing({ score, label, size = 112 }: { score: number | null; label: string; size?: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const value = score === null ? 0 : Math.max(0, Math.min(100, score));
  const tone = scoreTone(score);
  const mounted = useMounted();
  const counted = useCountUp(score);
  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`${label}: ${score ?? "not scored"} out of 100`}>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#ece9f7" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={tone.stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${mounted ? (value / 100) * circumference : 0} ${circumference}`}
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dasharray 1.3s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
        <text x="50" y="57" textAnchor="middle" fontSize="27" fontWeight="600" fill="currentColor" className="text-slate-900" style={{ fontFamily: "var(--font-display)" }}>
          {counted === null ? "–" : counted}
        </text>
      </svg>
      <span className="mt-1 text-center text-xs font-medium text-slate-500">{label}</span>
    </div>
  );
}

export function Bar({ label, percent, note }: { label: string; percent: number; note?: string }) {
  const tone = scoreTone(percent);
  const mounted = useMounted();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="shrink-0 tabular-nums text-xs text-slate-500">{note ?? `${percent}%`}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ background: tone.fill, width: `${mounted ? Math.max(2, Math.min(100, percent)) : 0}%`, transition: "width 1.1s cubic-bezier(0.22, 1, 0.36, 1)" }} />
      </div>
    </div>
  );
}

export type Point = { at: number; score: number; label: string };

/** Line chart of scores over time for one series. Points are in the order given. */
export function LineChart({ points, title }: { points: Point[]; title: string }) {
  if (points.length === 0) return null;
  const w = 320;
  const h = 120;
  const pad = 14;
  const xs = (i: number) => (points.length === 1 ? w / 2 : pad + (i * (w - pad * 2)) / (points.length - 1));
  const ys = (score: number) => h - pad - (Math.max(0, Math.min(100, score)) / 100) * (h - pad * 2);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${xs(i).toFixed(1)},${ys(p.score).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={title}>
      {[0, 50, 100].map((g) => (
        <g key={g}>
          <line x1={pad} x2={w - pad} y1={ys(g)} y2={ys(g)} stroke="#d3d0e2" strokeDasharray="3 3" />
          <text x={2} y={ys(g) + 3} fontSize="8" fill="#9b98ad">
            {g}
          </text>
        </g>
      ))}
      {points.length > 1 && <path d={path} fill="none" stroke="#7c5cf0" strokeWidth="2" strokeLinejoin="round" />}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={xs(i)} cy={ys(p.score)} r="3.5" fill="#7c5cf0" />
          <title>{`${p.label}: ${p.score} (${new Date(p.at).toLocaleDateString()})`}</title>
        </g>
      ))}
    </svg>
  );
}
