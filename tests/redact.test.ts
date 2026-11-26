import test from "node:test";
import assert from "node:assert/strict";
import { redactContacts } from "../lib/redact.ts";

test("removes emails and phone numbers", () => {
  const r = redactContacts("Kozhikode | +91 92072 54780 | someone@example.com\nPhone: (555) 123-4567");
  assert.equal(r.emails, 1);
  assert.equal(r.phones, 2);
  assert.match(r.text, /\[phone removed\]/);
  assert.match(r.text, /\[email removed\]/);
  assert.doesNotMatch(r.text, /92072|example\.com|123-4567/);
});

test("leaves dates, scores and years alone", () => {
  const text = "B.Sc. 2023 - Mar 2026 | CGPA 6.8 / 10 | Jul 2026 - Present | 2021-2024 | 670+ records | 1,200 rows";
  const r = redactContacts(text);
  assert.equal(r.text, text);
  assert.equal(r.phones, 0);
});

test("leaves a run of years alone", () => {
  const text = "Batches 2021 2022 2023 2024";
  assert.equal(redactContacts(text).text, text);
});
