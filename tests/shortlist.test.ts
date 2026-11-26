import test from "node:test";
import assert from "node:assert/strict";
import { rankEntries, sharedGaps, type ShortlistEntry } from "../lib/agents/shortlist/aggregate.ts";

function entry(
  id: string,
  score: number | null,
  missing: [string, "must-have" | "nice-to-have"][],
  failed = false,
): ShortlistEntry {
  return {
    id,
    company: id,
    roleTitle: "Role",
    error: failed ? "failed" : "",
    result: failed
      ? null
      : ({
          score: { pointsAwarded: 0, scoredOutOf: 100, normalisedScore: score },
          missingSkills: missing.map(([skill, importance]) => ({
            skill,
            importance,
            how_to_learn: "x",
            time_estimate: "1 week",
          })),
        } as unknown as ShortlistEntry["result"]),
  };
}

test("ranks by score, then fewer missing must-haves, with failed posts last", () => {
  const ranked = rankEntries([
    entry("failed", null, [], true),
    entry("low", 40, []),
    entry("tieMore", 70, [["SQL", "must-have"], ["R", "must-have"]]),
    entry("tieFewer", 70, [["SQL", "must-have"]]),
  ]);
  assert.deepEqual(ranked.map((e) => e.id), ["tieFewer", "tieMore", "low", "failed"]);
});

test("counts a missing skill once per post, ignoring case, most common first", () => {
  const gaps = sharedGaps([
    entry("a", 60, [["SQL", "must-have"], ["sql", "must-have"], ["Tableau", "nice-to-have"]]),
    entry("b", 50, [["Sql", "nice-to-have"], ["Docker", "must-have"]]),
    entry("c", 55, [["SQL", "must-have"]]),
    entry("failed", null, [], true),
  ]);
  assert.deepEqual(gaps[0], { skill: "SQL", jobs: 3, mustHaveJobs: 2 });
  assert.equal(gaps.length, 3);
  assert.equal(gaps[1].jobs, 1);
});

test("a null score ranks below any real score", () => {
  const ranked = rankEntries([entry("none", null, []), entry("some", 10, [])]);
  assert.equal(ranked[0].id, "some");
});
