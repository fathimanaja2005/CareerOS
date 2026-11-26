import test from "node:test";
import assert from "node:assert/strict";
import { gradeFor, summariseInterview } from "../lib/interview.ts";

test("averages scores and finds the weakest area", () => {
  const s = summariseInterview([
    { score: 80, breakdown: [{ area: "Structure", score: 20, max: 25 }, { area: "Evidence", score: 30, max: 30 }] },
    { score: 60, breakdown: [{ area: "Structure", score: 10, max: 25 }, { area: "Evidence", score: 25, max: 30 }] },
  ]);
  assert.equal(s.average, 70);
  assert.equal(s.best, 80);
  assert.equal(s.worst, 60);
  assert.equal(s.weakestArea, "Structure");
  assert.equal(s.areas[0].percent, 60);
});

test("ignores unscored answers and handles none", () => {
  assert.equal(summariseInterview([{ score: null, breakdown: [] }]).average, null);
  assert.equal(summariseInterview([]).weakestArea, null);
  assert.equal(gradeFor(null), "Not scored");
  assert.equal(gradeFor(85), "Interview ready");
});
