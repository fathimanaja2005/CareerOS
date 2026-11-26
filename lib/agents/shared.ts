import { z } from "zod";
import type { RubricArea } from "../rubric";

/**
 * Building blocks shared by every agent's schema.
 *
 * An agent only owns its own area names and maxima; the shape of a scored
 * breakdown and a fix lives here so each agent's schema stays short.
 */

/** One scored area. `score: null` means "not provided" — never a zero. */
export const breakdownItemSchema = z.object({
  area: z.string().min(1).max(120),
  score: z.number().nullable(),
  max: z.number().positive().max(100),
  reason: z.string().min(1).max(800),
});

export type BreakdownItem = z.infer<typeof breakdownItemSchema>;

/** Totals computed in code (never by the model). */
export type SectionScore = {
  pointsAwarded: number;
  scoredOutOf: number;
  normalisedScore: number | null;
};

export const fixSchema = z.object({
  priority: z.number().int().min(1).max(9),
  issue: z.string().min(1).max(600),
  how_to_fix: z.string().min(1).max(800),
});

export type Fix = z.infer<typeof fixSchema>;

/** A before/after wording suggestion. Empty `needs_from_student` means nothing is missing. */
export const rewriteSchema = z.object({
  original: z.string().min(1).max(1500),
  improved: z.string().min(1).max(1500),
  needs_from_student: z.string().max(400).default(""),
});

export type Rewrite = z.infer<typeof rewriteSchema>;

/** A breakdown that accepts only the rubric's own area names, once each. */
export function breakdownSchema(rubric: readonly RubricArea[]) {
  const known = new Set(rubric.map((entry) => entry.area));

  return z
    .array(breakdownItemSchema)
    .min(1)
    .max(rubric.length)
    .superRefine((items, ctx) => {
      const seen = new Set<string>();

      items.forEach((item, index) => {
        if (!known.has(item.area)) {
          ctx.addIssue({
            code: "custom",
            path: [index, "area"],
            message: `Unknown area "${item.area}". Use only the rubric areas.`,
          });
        } else if (seen.has(item.area)) {
          ctx.addIssue({
            code: "custom",
            path: [index, "area"],
            message: `Duplicate area "${item.area}".`,
          });
        }
        seen.add(item.area);
      });
    });
}
