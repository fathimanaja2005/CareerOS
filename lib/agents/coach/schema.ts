import { z } from "zod";
import { breakdownSchema, type BreakdownItem, type SectionScore } from "../shared";

/**
 * Interview Coach: two model calls share this file.
 *  1. questions: likely interview questions for one job
 *  2. feedback:  a scored review of the student's answer to one question
 * Area names and maxima for feedback live in COACH_RUBRIC, which scoring also uses.
 */

export const COACH_RUBRIC = [
  { area: "Relevance to the question", max: 30 },
  { area: "Evidence and specifics", max: 30 },
  { area: "Structure", max: 25 },
  { area: "Clarity and delivery", max: 15 },
] as const;

export const QUESTION_CATEGORIES = ["technical", "behavioural", "resume-based", "role-specific"] as const;

export const questionSchema = z.object({
  category: z.enum(QUESTION_CATEGORIES),
  question: z.string().min(1).max(500),
  what_interviewer_looks_for: z.string().min(1).max(500),
});

export const questionsAnalysisSchema = z.object({
  questions: z.array(questionSchema).min(3).max(8),
});

export type CoachQuestion = z.infer<typeof questionSchema>;
export type QuestionsAnalysis = z.infer<typeof questionsAnalysisSchema>;

/** What /api/coach returns for mode "questions". */
export type QuestionsResult = {
  mode: "questions";
  roleTitle: string;
  company: string;
  questions: CoachQuestion[];
};

export const feedbackAnalysisSchema = z.object({
  breakdown: breakdownSchema(COACH_RUBRIC),
  strengths: z.array(z.string().min(1).max(400)).max(4),
  improvements: z.array(z.string().min(1).max(500)).max(5),
  improved_answer: z.string().min(1).max(2500),
  needs_from_student: z.string().max(500).default(""),
});

export type FeedbackAnalysis = z.infer<typeof feedbackAnalysisSchema>;

/** What /api/coach returns for mode "feedback". */
export type FeedbackResult = {
  mode: "feedback";
  breakdown: BreakdownItem[];
  score: SectionScore;
  strengths: string[];
  improvements: string[];
  improvedAnswer: string;
  needsFromStudent: string;
};
