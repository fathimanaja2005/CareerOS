import test from "node:test";
import assert from "node:assert/strict";
import { appearsInResume, postProcessTailor } from "../lib/agents/tailor/check.ts";

const resume = "• Built a sales dashboard in Power BI that cut weekly reporting time by 30%.\n• Cleaned data using SQL.";

test("finds a line ignoring bullets, case and punctuation", () => {
  assert.equal(appearsInResume("built a sales dashboard in power bi that cut weekly reporting time by 30", resume), true);
});

test("flags a line that is not in the resume", () => {
  assert.equal(appearsInResume("Led a team of ten engineers at Google", resume), false);
});

test("builds the cover letter and the found flag in code", () => {
  const result = postProcessTailor(
    {
      headline_suggestion: "",
      keywords_present: ["SQL"],
      keywords_missing: ["Tableau"],
      rewrites: [
        { original: "Cleaned data using SQL.", improved: "Cleaned datasets with SQL.", needs_from_student: "" },
        { original: "Invented line that is not there", improved: "x", needs_from_student: "" },
      ],
      cover_letter: { greeting: "Dear Hiring Team,", paragraphs: ["One.", "Two."], closing: "Sincerely," },
      confidence_note: "",
    },
    { roleTitle: "Analyst", company: "Acme", jobDescription: "jd", resumeText: resume },
  );
  assert.equal(result.rewrites[0].foundInResume, true);
  assert.equal(result.rewrites[1].foundInResume, false);
  assert.equal(result.coverLetter, "Dear Hiring Team,\n\nOne.\n\nTwo.\n\nSincerely,");
});
