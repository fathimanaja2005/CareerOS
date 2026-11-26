import test from "node:test";
import assert from "node:assert/strict";
import {
  applyRubric,
  clampBreakdown,
  clampScore,
  computeSectionScore,
} from "../lib/scoring.ts";
import { RESUME_RUBRIC } from "../lib/rubric.ts";
import type { BreakdownItem } from "../lib/agents/shared.ts";

function item(area: string, score: number | null, max: number): BreakdownItem {
  return { area, score, max, reason: "test" };
}

test("sums only scored areas and normalises against their maxima", () => {
  const result = computeSectionScore([
    item("Impact", 15, 20),
    item("Relevance", 10, 20),
    item("Formatting", null, 20),
  ]);

  assert.deepEqual(result, { pointsAwarded: 25, scoredOutOf: 40, normalisedScore: 63 });
});

test("rounds the normalised score to the nearest integer", () => {
  // 23 / 30 = 76.66... -> 77
  assert.equal(computeSectionScore([item("A", 23, 30)]).normalisedScore, 77);
  // 25 / 40 = 62.5 -> 63
  assert.equal(computeSectionScore([item("A", 25, 40)]).normalisedScore, 63);
});

test("clamps scores above max down to max", () => {
  const result = computeSectionScore([item("A", 50, 20), item("B", 10, 20)]);
  assert.equal(result.pointsAwarded, 30);
  assert.equal(result.scoredOutOf, 40);
  assert.equal(result.normalisedScore, 75);
});

test("clamps negative scores up to zero", () => {
  const result = computeSectionScore([item("A", -5, 20), item("B", 10, 20)]);
  assert.equal(result.pointsAwarded, 10);
  assert.equal(result.scoredOutOf, 40);
  assert.equal(result.normalisedScore, 25);
});

test("treats null as not provided, never as zero", () => {
  const result = computeSectionScore([item("A", null, 20), item("B", null, 15)]);
  assert.deepEqual(result, { pointsAwarded: 0, scoredOutOf: 0, normalisedScore: null });
});

test("returns a null normalised score for an empty breakdown", () => {
  assert.deepEqual(computeSectionScore([]), {
    pointsAwarded: 0,
    scoredOutOf: 0,
    normalisedScore: null,
  });
});

test("a perfect score is 100", () => {
  const result = computeSectionScore([item("A", 20, 20), item("B", 15, 15)]);
  assert.deepEqual(result, { pointsAwarded: 35, scoredOutOf: 35, normalisedScore: 100 });
});

test("clampScore keeps null and NaN as null and clamps numbers", () => {
  assert.equal(clampScore(null, 10), null);
  assert.equal(clampScore(Number.NaN, 10), null);
  assert.equal(clampScore(-3, 10), 0);
  assert.equal(clampScore(4, 10), 4);
  assert.equal(clampScore(99, 10), 10);
});

test("applyRubric orders areas by the rubric and forces the rubric maxima", () => {
  // Deliberately out of order, with a max the model got wrong.
  const applied = applyRubric(
    [item("Clarity of writing", 5, 20), item("Impact and results", 12, 20)],
    RESUME_RUBRIC,
  );

  assert.deepEqual(
    applied.map((entry) => entry.area),
    RESUME_RUBRIC.map((entry) => entry.area),
  );
  assert.equal(applied[0].max, 25);
  assert.equal(applied[4].max, 10);
});

test("applyRubric marks areas the model left out as not provided", () => {
  const applied = applyRubric([item("Impact and results", 10, 25)], RESUME_RUBRIC);
  const missing = applied.find((entry) => entry.area === "ATS compatibility");

  assert.equal(missing?.score, null);
  assert.equal(missing?.max, 10);
  assert.equal(missing?.reason, "not provided");
});

test("full marks across the whole rubric normalise to 100", () => {
  const full = RESUME_RUBRIC.map((entry) => item(entry.area, entry.max, entry.max));
  const result = computeSectionScore(clampBreakdown(applyRubric(full, RESUME_RUBRIC)));

  assert.deepEqual(result, { pointsAwarded: 100, scoredOutOf: 100, normalisedScore: 100 });
});

test("clampBreakdown clamps scores without touching null areas", () => {
  const clamped = clampBreakdown([item("A", 40, 20), item("B", null, 15)]);
  assert.deepEqual(
    clamped.map((entry) => entry.score),
    [20, null],
  );
});
