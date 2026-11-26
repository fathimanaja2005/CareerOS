/** Combines the scores of the career report in code. The AI never picks the overall number. */

export function overallReadiness(scores: (number | null | undefined)[]): number | null {
  const real = scores.filter((s): s is number => typeof s === "number" && Number.isFinite(s));
  if (real.length === 0) return null;
  return Math.round(real.reduce((sum, s) => sum + s, 0) / real.length);
}

export function readinessLabel(score: number | null): string {
  if (score === null) return "Not scored";
  if (score >= 80) return "Ready to apply";
  if (score >= 65) return "Close: fix a few things first";
  if (score >= 45) return "Building: follow the plan below";
  return "Early stage: start with the basics";
}

/** Merges skill lists, ignoring case and repeats, keeping the first spelling. */
export function mergeSkills(...lists: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const skill of list) {
      const key = skill.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(skill.trim());
    }
  }
  return out;
}
