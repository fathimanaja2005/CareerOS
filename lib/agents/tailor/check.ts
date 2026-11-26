import type { TailorInput } from "./prompt";
import type { TailorAnalysis, TailorResult } from "./schema";

/** Tailor agent: job-specific rewrites and a cover letter. The "found in resume" check is done in code. */

function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** True when the line (ignoring case, bullets and punctuation) appears in the resume. */
export function appearsInResume(line: string, resume: string): boolean {
  const needle = normalise(line);
  if (needle.length < 8) return false;
  return normalise(resume).includes(needle);
}

export function postProcessTailor(analysis: TailorAnalysis, input: TailorInput): TailorResult {
  const letter = analysis.cover_letter;
  return {
    roleTitle: input.roleTitle,
    company: input.company,
    headlineSuggestion: analysis.headline_suggestion,
    keywordsPresent: analysis.keywords_present,
    keywordsMissing: analysis.keywords_missing,
    rewrites: analysis.rewrites.map((rewrite) => ({
      ...rewrite,
      foundInResume: appearsInResume(rewrite.original, input.resumeText),
    })),
    coverLetter: [letter.greeting, ...letter.paragraphs, letter.closing].join("\n\n"),
    confidenceNote: analysis.confidence_note,
  };
}

