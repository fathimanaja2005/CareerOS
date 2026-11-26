import { z } from "zod";
import { breakdownSchema, fixSchema, rewriteSchema, type BreakdownItem, type Fix, type SectionScore } from "../shared";

/**
 * What the model returns for a job match, validated with Zod.
 * Area names and maxima live in MATCH_RUBRIC, which is also what scoring uses.
 */

export const MATCH_RUBRIC = [
  { area: "Skills match", max: 40 },
  { area: "Experience and project relevance", max: 25 },
  { area: "Keywords and ATS fit", max: 20 },
  { area: "Seniority and requirements fit", max: 15 },
] as const;

export const missingSkillSchema = z.object({
  skill: z.string().min(1).max(120),
  importance: z.enum(["must-have", "nice-to-have"]),
  how_to_learn: z.string().min(1).max(800),
  time_estimate: z.string().min(1).max(200),
});

export type MissingSkill = z.infer<typeof missingSkillSchema>;

export const interviewPrepSchema = z.object({
  likely_questions: z.array(z.string().min(1).max(500)).max(12),
  topics_to_revise: z.array(z.string().min(1).max(200)).max(15),
  company_research_checklist: z.array(z.string().min(1).max(300)).max(10),
});

export type InterviewPrep = z.infer<typeof interviewPrepSchema>;

export const verdictSchema = z.object({
  label: z.enum(["Apply now", "Apply after small fixes", "Build skills first"]),
  reason: z.string().min(1).max(500),
});

export type Verdict = z.infer<typeof verdictSchema>;

export const matchAnalysisSchema = z.object({
  role_title: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  breakdown: breakdownSchema(MATCH_RUBRIC),
  matched_skills: z.array(z.string().min(1).max(120)).max(30),
  missing_skills: z.array(missingSkillSchema).max(15),
  resume_changes_for_this_job: z.array(fixSchema).max(10),
  tailored_bullets: z.array(rewriteSchema).max(10),
  interview_prep: interviewPrepSchema,
  verdict: verdictSchema,
  confidence_note: z.string().min(1).max(1000),
});

/** Validated model output. */
export type MatchAnalysis = z.infer<typeof matchAnalysisSchema>;

/** What the match endpoint returns to the browser. */
export type MatchResult = {
  roleTitle: string;
  company: string;
  breakdown: BreakdownItem[];
  score: SectionScore;
  matchedSkills: string[];
  missingSkills: MissingSkill[];
  resumeChanges: Fix[];
  tailoredBullets: z.infer<typeof rewriteSchema>[];
  interviewPrep: InterviewPrep;
  verdict: Verdict;
  confidenceNote: string;
};