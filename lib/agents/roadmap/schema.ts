import { z } from "zod";

/**
 * Roadmap agent: a week-by-week learning plan to close the gaps for one role.
 * Hours are summed and checked against the student's budget in code.
 */

export const ALLOWED_WEEKS = [4, 6, 8, 12] as const;

export const taskSchema = z.object({
  task: z.string().min(1).max(400),
  hours: z.number().min(0.5).max(30),
});

export const weekSchema = z.object({
  week: z.number().int().min(1).max(12),
  focus: z.string().min(1).max(200),
  tasks: z.array(taskSchema).min(1).max(6),
  deliverable: z.string().min(1).max(300),
});

export const roadmapAnalysisSchema = z.object({
  starting_point: z.string().min(1).max(800),
  weeks: z.array(weekSchema).min(1).max(12),
  capstone_project: z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(800),
    skills_shown: z.array(z.string().min(1).max(100)).max(10),
  }),
  resume_updates_after: z.array(z.string().min(1).max(300)).max(6),
  readiness_checks: z.array(z.string().min(1).max(300)).max(6),
});

export type RoadmapAnalysis = z.infer<typeof roadmapAnalysisSchema>;
export type RoadmapWeek = z.infer<typeof weekSchema>;

export type RoadmapWeekResult = RoadmapWeek & {
  /** Sum of task hours, computed in code. */
  plannedHours: number;
  /** True when the week plans more than 25% over the student's weekly budget. */
  overBudget: boolean;
};

/** What /api/roadmap returns to the browser. */
export type RoadmapResult = {
  roleTitle: string;
  requestedWeeks: number;
  hoursPerWeek: number;
  weeks: RoadmapWeekResult[];
  totalHours: number;
  budgetHours: number;
  startingPoint: string;
  capstone: RoadmapAnalysis["capstone_project"];
  resumeUpdates: string[];
  readinessChecks: string[];
  /** Set when the model returned a different number of weeks than requested. */
  note: string;
};
