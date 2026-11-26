import test from "node:test";
import assert from "node:assert/strict";
import { changeOverTime, countByStatus, interviewRate, seriesFor } from "../lib/tracker.ts";

const S = ["Saved", "Applied", "Interview", "Offer", "Rejected"];

test("counts by status", () => {
  const c = countByStatus([{ status: "Saved" }, { status: "Applied" }, { status: "Applied" }], S);
  assert.equal(c.Applied, 2);
  assert.equal(c.Offer, 0);
});

test("interview rate ignores saved jobs", () => {
  assert.equal(interviewRate([{ status: "Saved" }]), null);
  assert.equal(
    interviewRate([{ status: "Saved" }, { status: "Applied" }, { status: "Interview" }, { status: "Rejected" }, { status: "Offer" }]),
    50,
  );
});

test("series are filtered and sorted, change is last minus first", () => {
  const scores = [
    { kind: "profile", score: 70, at: 3 },
    { kind: "match", score: 10, at: 2 },
    { kind: "profile", score: 50, at: 1 },
  ];
  const series = seriesFor(scores, "profile");
  assert.deepEqual(series.map((s) => s.score), [50, 70]);
  assert.equal(changeOverTime(series), 20);
  assert.equal(changeOverTime([series[0]]), null);
});
