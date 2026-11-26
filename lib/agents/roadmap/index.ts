import type { AgentConfig } from "../run";
import { buildUserInput, SYSTEM_PROMPT, type RoadmapInput } from "./prompt";
import {
  roadmapAnalysisSchema,
  type RoadmapAnalysis,
  type RoadmapResult,
} from "./schema";

/** Roadmap agent: week-by-week plan. Hour totals and budget checks are done in code. */

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function postProcessRoadmap(analysis: RoadmapAnalysis, input: RoadmapInput): RoadmapResult {
  const weeks = [...analysis.weeks]
    .sort((a, b) => a.week - b.week)
    .map((week) => {
      const plannedHours = round1(week.tasks.reduce((sum, task) => sum + task.hours, 0));
      return { ...week, plannedHours, overBudget: plannedHours > input.hoursPerWeek * 1.25 };
    });

  const totalHours = round1(weeks.reduce((sum, week) => sum + week.plannedHours, 0));

  return {
    roleTitle: input.roleTitle,
    requestedWeeks: input.weeks,
    hoursPerWeek: input.hoursPerWeek,
    weeks,
    totalHours,
    budgetHours: input.weeks * input.hoursPerWeek,
    startingPoint: analysis.starting_point,
    capstone: analysis.capstone_project,
    resumeUpdates: analysis.resume_updates_after,
    readinessChecks: analysis.readiness_checks,
    note:
      weeks.length === input.weeks
        ? ""
        : `You asked for ${input.weeks} weeks but the plan has ${weeks.length}. Adjust the pace to fit your time.`,
  };
}

export const roadmapAgent: AgentConfig<RoadmapInput, RoadmapAnalysis, RoadmapResult> = {
  id: "roadmap",
  systemPrompt: SYSTEM_PROMPT,
  schema: roadmapAnalysisSchema,
  buildUserInput,
  postProcess: postProcessRoadmap,
};
