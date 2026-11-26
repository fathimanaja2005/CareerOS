import { applyRubric, clampBreakdown, computeSectionScore } from "../../scoring";
import type { AgentConfig } from "../run";
import { buildUserInput, SYSTEM_PROMPT, type MatchInput } from "./prompt";
import {
  matchAnalysisSchema,
  MATCH_RUBRIC,
  type MatchAnalysis,
  type MatchResult,
} from "./schema";

/** Job match agent: compares a resume to one job description. */

/** Order the breakdown by the rubric, clamp it, and compute the match score. */
export function postProcessMatch(analysis: MatchAnalysis): MatchResult {
  const breakdown = clampBreakdown(applyRubric(analysis.breakdown, MATCH_RUBRIC));

  return {
    roleTitle: analysis.role_title,
    company: analysis.company,
    breakdown,
    score: computeSectionScore(breakdown),
    matchedSkills: analysis.matched_skills,
    missingSkills: analysis.missing_skills,
    resumeChanges: [...analysis.resume_changes_for_this_job].sort(
      (a, b) => a.priority - b.priority,
    ),
    tailoredBullets: analysis.tailored_bullets,
    interviewPrep: analysis.interview_prep,
    verdict: analysis.verdict,
    confidenceNote: analysis.confidence_note,
  };
}

export const matchAgent: AgentConfig<MatchInput, MatchAnalysis, MatchResult> = {
  id: "match",
  systemPrompt: SYSTEM_PROMPT,
  schema: matchAnalysisSchema,
  buildUserInput,
  postProcess: postProcessMatch,
};