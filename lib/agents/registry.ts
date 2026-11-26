/**
 * The agents shown in the top navigation, in tab order.
 * The labels here are the only place tab names are written.
 */
export const AGENTS = [
  {
    id: "profile",
    label: "Profile review",
    tagline: "Score your resume and LinkedIn against a target role.",
  },
  {
    id: "match",
    label: "Job match",
    tagline: "Check how well your profile fits a specific job description.",
  },
] as const;

export type AgentId = (typeof AGENTS)[number]["id"];
