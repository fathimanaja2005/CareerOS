import { z } from "zod";
import { rewriteSchema } from "../shared";

/**
 * Tailor agent: rewrites resume lines for one job and drafts a cover letter.
 * Whether each "original" line really appears in the resume is checked in code.
 */

export const tailorAnalysisSchema = z.object({
  headline_suggestion: z.string().max(300).default(""),
  keywords_present: z.array(z.string().min(1).max(80)).max(20),
  keywords_missing: z.array(z.string().min(1).max(80)).max(15),
  rewrites: z.array(rewriteSchema).min(1).max(8),
  cover_letter: z.object({
    greeting: z.string().min(1).max(120),
    paragraphs: z.array(z.string().min(1).max(1200)).min(2).max(5),
    closing: z.string().min(1).max(120),
  }),
  confidence_note: z.string().max(800).default(""),
});

export type TailorAnalysis = z.infer<typeof tailorAnalysisSchema>;

export type TailoredRewrite = z.infer<typeof rewriteSchema> & {
  /** True when the original line was found in the resume, checked in code. */
  foundInResume: boolean;
};

/** What /api/tailor returns to the browser. */
export type TailorResult = {
  roleTitle: string;
  company: string;
  headlineSuggestion: string;
  keywordsPresent: string[];
  keywordsMissing: string[];
  rewrites: TailoredRewrite[];
  coverLetter: string;
  confidenceNote: string;
};
