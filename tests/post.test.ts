import test from "node:test";
import assert from "node:assert/strict";
import { buildPostFacts, unsupportedNumbers } from "../lib/post.ts";

test("facts use the latest score and the change over time", () => {
  const facts = buildPostFacts("Data Analyst", [
    { kind: "report", score: 50, at: 1 },
    { kind: "report", score: 64, at: 3 },
    { kind: "match", score: 61, at: 2 },
  ], []);
  assert.ok(facts.includes("Target role: Data Analyst."));
  assert.ok(facts.includes("Latest Career report score: 64 out of 100."));
  assert.ok(facts.includes("Career report score moved from 50 to 64 across 2 runs."));
  assert.ok(facts.includes("Latest Job match score: 61 out of 100."));
  assert.ok(!facts.some((f) => f.includes("Job match score moved")));
});

test("tracker facts count applications and interviews", () => {
  const facts = buildPostFacts("", [], [{ status: "Applied" }, { status: "Interview" }, { status: "Offer" }]);
  assert.deepEqual(facts, ["Tracking 3 job applications.", "2 of them reached the interview stage or beyond."]);
  assert.deepEqual(buildPostFacts("", [], [{ status: "Saved" }]), ["Tracking 1 job application."]);
});

test("no data gives no facts", () => {
  assert.deepEqual(buildPostFacts("  ", [], []), []);
});

test("numbers not in the facts are caught", () => {
  const allowed = "Latest Career report score: 64 out of 100.\nCareer report score moved from 50 to 64 across 2 runs.";
  assert.deepEqual(unsupportedNumbers("My score went from 50 to 64 out of 100.", allowed), []);
  assert.deepEqual(unsupportedNumbers("I got 3 offers and a 90 score", allowed), ["3", "90"]);
  assert.deepEqual(unsupportedNumbers("No digits here", allowed), []);
});

test("the student's own note counts as allowed", () => {
  assert.deepEqual(unsupportedNumbers("I built 2 dashboards", "I built 2 dashboards this month"), []);
});
