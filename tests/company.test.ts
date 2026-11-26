import test from "node:test";
import assert from "node:assert/strict";
import { parseCompanyReply } from "../lib/company.ts";

const g = { groundingChunks: [{ web: { uri: "https://a.com", title: "A" } }, { web: { uri: "https://a.com", title: "A" } }] };

test("parses a grounded reply and de-dupes sources", () => {
  const r = parseCompanyReply("FOUND: yes\nSUMMARY: Makes tools.\n- Based in Kochi\n- 50 staff", g);
  assert.equal(r.found, true);
  if (r.found) {
    assert.equal(r.facts.length, 2);
    assert.equal(r.sources.length, 1);
  }
});

test("FOUND: no means not found", () => {
  assert.equal(parseCompanyReply("FOUND: no", g).found, false);
});

test("no search sources means not found, even if the model sounds sure", () => {
  assert.equal(parseCompanyReply("FOUND: yes\nSUMMARY: Makes tools.\n- Fact", { groundingChunks: [] }).found, false);
  assert.equal(parseCompanyReply("FOUND: yes\nSUMMARY: Makes tools.", undefined).found, false);
});
