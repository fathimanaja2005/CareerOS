import test from "node:test";
import assert from "node:assert/strict";
import { mergeRecords } from "../lib/merge.ts";

test("keeps guest-only and account-only items", () => {
  const out = mergeRecords([{ id: "a" }], [{ id: "b" }]);
  assert.deepEqual(out.map((x) => x.id).sort(), ["a", "b"]);
});

test("newer updatedAt wins for the same id", () => {
  const out = mergeRecords([{ id: "a", updatedAt: 5, v: "local" }], [{ id: "a", updatedAt: 3, v: "remote" }]);
  assert.equal(out.length, 1);
  assert.equal(out[0].v, "local");
});

test("a tie goes to the account copy", () => {
  const out = mergeRecords([{ id: "a", updatedAt: 3, v: "local" }], [{ id: "a", updatedAt: 3, v: "remote" }]);
  assert.equal(out[0].v, "remote");
});
