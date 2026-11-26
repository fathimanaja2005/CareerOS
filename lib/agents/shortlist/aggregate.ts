import type { MatchResult } from "../match/schema";

/**
 * The Shortlister runs the Job Match agent on several real job posts the student
 * pasted, then ranks them and finds the skills missing from several posts.
 * Everything here is plain code: no model is asked to rank or count.
 */

export type ShortlistEntry = {
  id: string;
  company: string;
  roleTitle: string;
  /** null when this post failed. */
  result: MatchResult | null;
  error: string;
};

export type SharedGap = {
  skill: string;
  /** In how many of the scored posts this skill is missing. */
  jobs: number;
  /** In how many of those it is a must-have. */
  mustHaveJobs: number;
};

function mustHaveCount(entry: ShortlistEntry): number {
  return entry.result
    ? entry.result.missingSkills.filter((skill) => skill.importance === "must-have").length
    : 0;
}

/** Best match first. Ties go to the post with fewer missing must-haves. Failed posts go last. */
export function rankEntries(entries: ShortlistEntry[]): ShortlistEntry[] {
  return [...entries].sort((a, b) => {
    if (!a.result && !b.result) return 0;
    if (!a.result) return 1;
    if (!b.result) return -1;

    const scoreA = a.result.score.normalisedScore ?? -1;
    const scoreB = b.result.score.normalisedScore ?? -1;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return mustHaveCount(a) - mustHaveCount(b);
  });
}

/**
 * Count how many posts each missing skill appears in (once per post, ignoring case).
 * Most common first, then most often a must-have, then alphabetical.
 */
export function sharedGaps(entries: ShortlistEntry[]): SharedGap[] {
  const table = new Map<string, SharedGap>();

  for (const entry of entries) {
    if (!entry.result) continue;
    const seenInThisPost = new Set<string>();

    for (const missing of entry.result.missingSkills) {
      const key = missing.skill.trim().toLowerCase();
      if (!key || seenInThisPost.has(key)) continue;
      seenInThisPost.add(key);

      const gap = table.get(key) ?? { skill: missing.skill.trim(), jobs: 0, mustHaveJobs: 0 };
      gap.jobs += 1;
      if (missing.importance === "must-have") gap.mustHaveJobs += 1;
      table.set(key, gap);
    }
  }

  return [...table.values()].sort(
    (a, b) =>
      b.jobs - a.jobs || b.mustHaveJobs - a.mustHaveJobs || a.skill.localeCompare(b.skill),
  );
}
