import { z } from "zod";
import { LINKEDIN_RUBRIC, RESUME_RUBRIC } from "../../rubric";
import { breakdownSchema, fixSchema, type SectionScore } from "../shared";

/**
 * What the model returns for a profile review, validated with Zod.
 *
 * Area names and maxima are never written here: they come from lib/rubric.ts.
 */

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
export type ResumeSection = z.infer<typeof resumeSchema>;
export type LinkedinSection = z.infer<typeof linkedinSchema>;
export type Rewrite = z.infer<typeof rewriteSchema>;

/** What the profile endpoint returns to the browser. */
export type AnalysisResult = {
  targetRole: string;
  resume: ResumeSection & { score: SectionScore };
  linkedin: LinkedinSection & { score: SectionScore };
  missing_skills_for_role: string[];
  confidence_note: string;
};
