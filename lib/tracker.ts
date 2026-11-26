/** Pure helpers for the application tracker and score history. */

export type StatusLike = { status: string };
export type ScoreLike = { kind: string; score: number; at: number };

export function countByStatus(items: StatusLike[], statuses: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(statuses.map((s) => [s, 0]));
  for (const item of items) {
    if (item.status in counts) counts[item.status] += 1;
  }
  return counts;
}

/**
 * Share of sent applications that reached an interview or an offer.
 * "Sent" means anything past Saved. Returns null until at least one is sent.
 */
export function interviewRate(items: StatusLike[]): number | null {
  const sent = items.filter((i) => i.status !== "Saved");
  if (sent.length === 0) return null;
  const reached = sent.filter((i) => i.status === "Interview" || i.status === "Offer").length;
  return Math.round((reached / sent.length) * 100);
}

/** Scores of one kind, oldest first. */
export function seriesFor<T extends ScoreLike>(scores: T[], kind: string): T[] {
  return scores.filter((s) => s.kind === kind).sort((a, b) => a.at - b.at);
}

/** Change between the first and the latest score of a series, or null with fewer than two. */
export function changeOverTime(series: ScoreLike[]): number | null {
  if (series.length < 2) return null;
  return series[series.length - 1].score - series[0].score;
}
