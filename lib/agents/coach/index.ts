import { applyRubric, clampBreakdown, computeSectionScore } from "../../scoring";
import type { AgentConfig } from "../run";
import {
  buildFeedbackInput,
  buildQuestionsInput,
  FEEDBACK_PROMPT,
  QUESTIONS_PROMPT,
  type FeedbackInput,
  type QuestionsInput,
} from "./prompt";
import {
  COACH_RUBRIC,
  feedbackAnalysisSchema,
  questionsAnalysisSchema,
  type FeedbackAnalysis,
  type FeedbackResult,
  type QuestionsAnalysis,
  type QuestionsResult,
} from "./schema";

/** Interview Coach: question generator and answer reviewer, both through runAgent. */

export const questionsAgent: AgentConfig<QuestionsInput, QuestionsAnalysis, QuestionsResult> = {
  id: "coach-questions",
  systemPrompt: QUESTIONS_PROMPT,
  schema: questionsAnalysisSchema,
  buildUserInput: buildQuestionsInput,
  postProcess: (analysis, input) => ({
    mode: "questions",
    roleTitle: input.roleTitle,
    company: input.company,
    questions: analysis.questions,
  }),
};

export const feedbackAgent: AgentConfig<FeedbackInput, FeedbackAnalysis, FeedbackResult> = {
  id: "coach-feedback",
  systemPrompt: FEEDBACK_PROMPT,
  schema: feedbackAnalysisSchema,
  buildUserInput: buildFeedbackInput,
  postProcess: (analysis) => {
    const breakdown = clampBreakdown(applyRubric(analysis.breakdown, COACH_RUBRIC));
    return {
      mode: "feedback",
      breakdown,
      score: computeSectionScore(breakdown),
      strengths: analysis.strengths,
      improvements: analysis.improvements,
      improvedAnswer: analysis.improved_answer,
      needsFromStudent: analysis.needs_from_student,
    };
  },
};
