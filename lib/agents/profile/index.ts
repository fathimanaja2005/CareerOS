import { applyRubric, clampBreakdown, computeSectionScore } from "../../scoring";
import { LINKEDIN_RUBRIC, RESUME_RUBRIC } from "../../rubric";
import type { AgentConfig } from "../run";
import { buildUserInput, SYSTEM_PROMPT, type ProfileInput } from "./prompt";
import { analysisSchema, type Analysis, type AnalysisResult } from "./schema";

/**
 * Profile review agent: the original CareerOS review.
 *
 * Everything specific to it lives in this folder — the prompt, the schema and
 * the optional scoring step below. app/api/analyze/route.ts only validates the
 * request body and calls runAgent().
 */

/**
 * Put each breakdown in rubric order with the rubric's maxima, clamp the
 * scores, and compute both section totals in code. The model never supplies a
 * total, and `targetRole` comes from the validated input, not the reply.
 */
export function postProcessAnalysis(analysis: Analysis, input: ProfileInput): AnalysisResult {
  const resumeBreakdown = clampBreakdown(applyRubric(analysis.resume.breakdown, RESUME_RUBRIC));
  const linkedinBreakdown = clampBreakdown(
    applyRubric(analysis.linkedin.breakdown, LINKEDIN_RUBRIC),
  );

  return {
    targetRole: input.targetRole,
    resume: {
      ...analysis.resume,
      breakdown: resumeBreakdown,
      top_fixes: sortByPriority(analysis.resume.top_fixes),
      score: computeSectionScore(resumeBreakdown),
    },
    linkedin: {
      ...analysis.linkedin,
      breakdown: linkedinBreakdown,
      top_fixes: sortByPriority(analysis.linkedin.top_fixes),
      score: computeSectionScore(linkedinBreakdown),
    },
    missing_skills_for_role: analysis.missing_skills_for_role,
    confidence_note: analysis.confidence_note,
  };
}

/** Top fixes are always shown in priority order (1 first). */
function sortByPriority<T extends { priority: number }>(fixes: T[]): T[] {
  return [...fixes].sort((a, b) => a.priority - b.priority);
}

export const profileAgent: AgentConfig<ProfileInput, Analysis, AnalysisResult> = {
  id: "profile",
  systemPrompt: SYSTEM_PROMPT,
  schema: analysisSchema,
  buildUserInput,
  postProcess: postProcessAnalysis,
};
