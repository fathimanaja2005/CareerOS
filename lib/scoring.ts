import type { BreakdownItem, SectionScore } from "./agents/shared";
import type { RubricArea } from "./rubric";

/**
 * All score maths lives here so we never trust the model's arithmetic.
 *
 * Rules (from the spec):
 *  - points_awarded  = sum of non-null scores
 *  - scored_out_of   = sum of `max` for non-null areas only
 *  - normalised      = round(points / scored_out_of * 100), or null if nothing was scored
 *  - every score is clamped to 0..max
 */

/** Clamp a score into 0..max. null and NaN stay null ("not provided"). */
export function clampScore(score: number | null, max: number): number | null {
  if (score === null || Number.isNaN(score)) return null;
  return Math.min(Math.max(score, 0), max);
}

/**
 * Put a section's breakdown in rubric order and force each area's `max` to the
 * rubric value, so names and maxima can never drift from lib/rubric.ts.
 * An area the model left out is shown as "not provided" rather than dropped.
 */
export function applyRubric(
  items: BreakdownItem[],
  rubric: readonly RubricArea[],
): BreakdownItem[] {
  return rubric.map((entry) => {
    const match = items.find((item) => item.area === entry.area);
    return match
      ? { ...match, max: entry.max }
      : { area: entry.area, score: null, max: entry.max, reason: "not provided" };
  });
}

/** Return a copy of the breakdown with every score clamped. Used for display too. */
export function clampBreakdown(items: BreakdownItem[]): BreakdownItem[] {
  return items.map((item) => ({ ...item, score: clampScore(item.score, item.max) }));
}

/** Compute one section's totals (resume or LinkedIn). */
export function computeSectionScore(items: BreakdownItem[]): SectionScore {
  let pointsAwarded = 0;
  let scoredOutOf = 0;

  for (const item of items) {
    const score = clampScore(item.score, item.max);
    if (score === null) continue; // not provided: excluded from both totals
    pointsAwarded += score;
    scoredOutOf += item.max;
  }

  const normalisedScore =
    scoredOutOf > 0 ? Math.round((pointsAwarded / scoredOutOf) * 100) : null;

  return { pointsAwarded, scoredOutOf, normalisedScore };
}
