import test from "node:test";
import assert from "node:assert/strict";
import { mergeSkills, overallReadiness, readinessLabel } from "../lib/career.ts";

test("overall readiness averages only real scores", () => {
  assert.equal(overallReadiness([70, null, 50]), 60);
  assert.equal(overallReadiness([null, undefined]), null);
});

test("labels follow the score bands", () => {
  assert.equal(readinessLabel(null), "Not scored");
  assert.equal(readinessLabel(90), "Ready to apply");
  assert.equal(readinessLabel(50), "Building: follow the plan below");
});

test("merges skills without repeats", () => {
  assert.deepEqual(mergeSkills(["SQL", "Tableau"], ["sql", " Power BI "]), ["SQL", "Tableau", "Power BI"]);
});
