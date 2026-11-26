import { z } from "zod";
import { LINKEDIN_RUBRIC, RESUME_RUBRIC, type RubricArea } from "./rubric";

/**
 * The shape we ask the model to return, validated with Zod.
 * Anything the model sends that does not match this schema is rejected
 * and the request is retried once (see app/api/analyze/route.ts).
 *
 * Area names and maxima are never written here: they come from lib/rubric.ts.
 */

export const breakdownItemSchema = z.object({
  area: z.string().min(1).max(120),
  // null means "not provided" — it must never be treated as a zero score.
  score: z.number().nullable(),
  max: z.number().positive().max(100),
  reason: z.string().min(1).max(800),
});

/** A section's breakdown: only the rubric's area names are accepted. */
function breakdownSchema(rubric: readonly RubricArea[]) {
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

export const fixSchema = z.object({
  priority: z.number().int().min(1).max(9),
  issue: z.string().min(1).max(600),
  how_to_fix: z.string().min(1).max(800),
});

export const rewriteSchema = z.object({
  original: z.string().min(1).max(1500),
  improved: z.string().min(1).max(1500),
  // Empty when the rewrite needs nothing from the student.
  needs_from_student: z.string().max(400).default(""),
});

export const resumeSchema = z.object({
  breakdown: breakdownSchema(RESUME_RUBRIC),
  top_strengths: z.array(z.string().min(1).max(500)).max(8),
  top_fixes: z.array(fixSchema).max(8),
  rewrites: z.array(rewriteSchema).max(8),
});

export const linkedinSchema = z.object({
  breakdown: breakdownSchema(LINKEDIN_RUBRIC),
  headline_options: z.array(z.string().min(1).max(300)).max(6),
  about_rewrite: z.string().max(3000),
  top_fixes: z.array(fixSchema).max(8),
});

export const analysisSchema = z.object({
  target_role: z.string().min(1).max(200),
  resume: resumeSchema,
  linkedin: linkedinSchema,
  missing_skills_for_role: z.array(z.string().min(1).max(120)).max(12),
  confidence_note: z.string().min(1).max(1000),
});

/** Validated model output. */
export type Analysis = z.infer<typeof analysisSchema>;
export type BreakdownItem = z.infer<typeof breakdownItemSchema>;
export type Fix = z.infer<typeof fixSchema>;
export type ResumeSection = z.infer<typeof resumeSchema>;
export type LinkedinSection = z.infer<typeof linkedinSchema>;
export type Rewrite = z.infer<typeof rewriteSchema>;

/**
 * Totals computed in code (never by the model).
 * `normalisedScore` is null when nothing could be scored.
 */
export type SectionScore = {
  pointsAwarded: number;
  scoredOutOf: number;
  normalisedScore: number | null;
};

/** What the API returns to the browser. */
export type AnalysisResult = {
  targetRole: string;
  resume: ResumeSection & { score: SectionScore };
  linkedin: LinkedinSection & { score: SectionScore };
  missing_skills_for_role: string[];
  confidence_note: string;
};
