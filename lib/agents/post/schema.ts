import { z } from "zod";

/** LinkedIn post generator: one short post and a few hashtags, built only from supplied facts. */

export const postAnalysisSchema = z.object({
  post: z.string().min(60).max(1800),
  hashtags: z.array(z.string().min(1).max(40)).max(5).default([]),
});

export type PostAnalysis = z.infer<typeof postAnalysisSchema>;

/** What /api/post returns to the browser. */
export type PostResult = {
  post: string;
  hashtags: string[];
  /** Numbers in the post that are not in the facts or the student's note, checked in code. */
  unsupportedNumbers: string[];
};
