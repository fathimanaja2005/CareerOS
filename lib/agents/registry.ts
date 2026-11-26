/**
 * The agents shown in the top navigation, in tab order.
 * The labels here are the only place tab names are written.
 */
export const AGENTS = [
  {
    id: "report",
    label: "Career report",
    tagline: "Run every agent at once and get one readiness dashboard.",
  },
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
  {
    id: "coach",
    label: "Interview coach",
    tagline: "Practise likely questions for one job and get your answers reviewed.",
  },
  {
    id: "roadmap",
    label: "Roadmap",
    tagline: "A week-by-week plan to close your skill gaps for a role.",
  },
  {
    id: "shortlist",
    label: "Shortlister",
    tagline: "Rank several real job posts against your resume.",
  },
  {
    id: "tailor",
    label: "Tailor",
    tagline: "Resume lines and a cover letter for one specific job.",
  },
  {
    id: "progress",
    label: "Progress",
    tagline: "Score history and your job application tracker.",
  },
] as const;

export type AgentId = (typeof AGENTS)[number]["id"];
