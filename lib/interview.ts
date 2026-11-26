/**
 * Interview practice scoring helpers. Every number is computed here in code,
 * from the per-answer scores the coach agent already returned.
 */

export type AnswerScore = {
  /** 0 to 100, or null when nothing could be scored. */
  score: number | null;
  breakdown: { area: string; score: number | null; max: number }[];
};

export type InterviewSummary = {
  answered: number;
  average: number | null;
  best: number | null;
  worst: number | null;
  /** Average percentage per rubric area, lowest first. */
  areas: { area: string; percent: number }[];
  weakestArea: string | null;
  grade: string;
};

export function gradeFor(score: number | null): string {
  if (score === null) return "Not scored";
  if (score >= 80) return "Interview ready";
  if (score >= 65) return "Getting there";
  if (score >= 45) return "Needs practice";
  return "Start with the basics";
}

export function summariseInterview(answers: AnswerScore[]): InterviewSummary {
  const scored = answers.filter((a) => a.score !== null) as (AnswerScore & { score: number })[];
  const average = scored.length
    ? Math.round(scored.reduce((sum, a) => sum + a.score, 0) / scored.length)
    : null;

  const totals = new Map<string, { points: number; max: number }>();
  for (const answer of answers) {
    for (const item of answer.breakdown) {
      if (item.score === null) continue;
      const entry = totals.get(item.area) ?? { points: 0, max: 0 };
      entry.points += item.score;
      entry.max += item.max;
      totals.set(item.area, entry);
    }
  }
  const areas = [...totals.entries()]
    .map(([area, t]) => ({ area, percent: t.max ? Math.round((t.points / t.max) * 100) : 0 }))
    .sort((a, b) => a.percent - b.percent);

  return {
    answered: scored.length,
    average,
    best: scored.length ? Math.max(...scored.map((a) => a.score)) : null,
    worst: scored.length ? Math.min(...scored.map((a) => a.score)) : null,
    areas,
    weakestArea: areas.length ? areas[0].area : null,
    grade: gradeFor(average),
  };
}
