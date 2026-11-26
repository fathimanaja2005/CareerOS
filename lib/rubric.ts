/**
 * The rubric: the only place area names and maxima are defined.
 *
 * schema.ts validates the model's area names against these lists, scoring.ts
 * orders the breakdown and forces these maxima, and the UI just renders what
 * it is given. Change a name or a maximum here and nothing else needs editing.
 * Both sections must add up to 100 points.
 */

export type RubricArea = {
  readonly area: string;
  readonly max: number;
};

export const RESUME_RUBRIC: readonly RubricArea[] = [
  { area: "Impact and results", max: 25 },
  { area: "Relevance to target role", max: 20 },
  { area: "Projects and evidence", max: 15 },
  { area: "Structure and readability", max: 15 },
  { area: "Clarity of writing", max: 10 },
  { area: "ATS compatibility", max: 10 },
  { area: "Completeness and professionalism", max: 5 },
];

export const LINKEDIN_RUBRIC: readonly RubricArea[] = [
  { area: "Headline", max: 20 },
  { area: "About section", max: 20 },
  { area: "Experience and projects", max: 20 },
  { area: "Skills and keywords", max: 15 },
  { area: "Profile completeness", max: 10 },
  { area: "Proof and credibility", max: 10 },
  { area: "Activity and network", max: 5 },
];
