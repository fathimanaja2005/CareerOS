import test from "node:test";
import assert from "node:assert/strict";
import { atsChecks, atsSummary } from "../lib/ats.ts";

const GOOD = `Daniel Okafor
daniel@example.com | +91 98765 43210
linkedin.com/in/danielokafor | github.com/danielokafor

Education
B.Tech Computer Science, 2022 - 2026

Skills
Python, SQL, Excel, Power BI

Projects
- Sales dashboard built in Power BI for a campus club, 2025
- Cleaned and analysed a 20,000 row survey dataset in Python
- Built a small SQL database for event registrations
- Presented findings to a faculty panel
- Automated a weekly report with a Python script

Experience
- Data intern, Acme Analytics, 2025
${"Wrote queries and reports for the sales team. ".repeat(20)}`;

function status(text: string, id: string) {
  return atsChecks(text).find((check) => check.id === id)?.status;
}

test("a well-formed resume passes every check", () => {
  const checks = atsChecks(GOOD);
  assert.equal(checks.length, 8);
  assert.deepEqual(atsSummary(checks), { passed: 8, total: 8 });
});

test("missing contact details are flagged", () => {
  assert.equal(status("Just some words about me", "email"), "fail");
  assert.equal(status("Just some words about me", "phone"), "warn");
});

test("section headings are found regardless of case and trailing colon", () => {
  assert.equal(status("EDUCATION:\nxx\nSKILLS\nxx\nPROJECTS\nxx", "sections"), "pass");
  assert.equal(status("Education\nxx\nSkills\nxx", "sections"), "warn");
  assert.equal(status("nothing here", "sections"), "fail");
});

test("dates, length and links", () => {
  assert.equal(status("no years here", "dates"), "fail");
  assert.equal(status("joined in 2024", "dates"), "warn");
  assert.equal(status("short", "length"), "fail");
  assert.equal(status("word ".repeat(1000), "length"), "warn");
  assert.equal(status("github.com/a", "links"), "warn");
  assert.equal(status("linkedin.com/in/a github.com/a", "links"), "pass");
});

test("column-like text is flagged", () => {
  const columns = Array.from({ length: 10 }, () => "Python      SQL      Excel").join("\n");
  assert.equal(status(columns, "layout"), "warn");
  assert.equal(status(GOOD, "layout"), "pass");
});

test("empty text does not crash", () => {
  assert.equal(atsChecks("").length, 8);
});
