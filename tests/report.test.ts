import test from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, reportToHtml, cleanReport, composePlanEmail, composeReportEmail } from "../lib/automation/email.ts";
import { coachReport, roadmapReport, shortlistReport } from "../lib/report.ts";

test("reportToHtml escapes markup and builds headings and lists", () => {
  const html = reportToHtml("# Title\n## Part\n- one <b>x</b>\n- two\nplain & text");
  assert.match(html, /<h2[^>]*>Title<\/h2>/);
  assert.match(html, /<h3[^>]*>Part<\/h3>/);
  assert.match(html, /<li[^>]*>one &lt;b&gt;x&lt;\/b&gt;<\/li>/);
  assert.match(html, /plain &amp; text/);
  assert.doesNotMatch(html, /<b>/);
});

test("escapeHtml handles quotes", () => {
  assert.equal(escapeHtml(`"a" & 'b'`), "&quot;a&quot; &amp; &#39;b&#39;");
});

test("cleanReport strips control characters and caps length", () => {
  const out = cleanReport("a\u0000b\r\n\n\n\nc", 100);
  assert.equal(out, "a b\n\nc");
  assert.equal(cleanReport("x".repeat(50), 10).length, 10);
});

test("composePlanEmail and composeReportEmail", () => {
  const plan = composePlanEmail({ topFixes: ["Fix <1>"], resumeScore: 57, linkedinScore: null, matchScore: null });
  assert.equal(plan.subject, "Your CareerOS action plan");
  assert.match(plan.html, /Fix &lt;1&gt;/);
  assert.match(plan.html, /Resume score: 57\/100/);
  const report = composeReportEmail("# Job match: A at B\n- x");
  assert.equal(report.subject, "Your CareerOS report: Job match: A at B");
});

test("shortlistReport lists ranking and failed jobs", () => {
  const text = shortlistReport([{ id: "1", company: "Acme", roleTitle: "Analyst", result: null, error: "boom" }]);
  assert.match(text, /Not scored: Analyst at Acme/);
  assert.match(text, /boom/);
});

test("roadmapReport and coachReport include their key sections", () => {
  const road = roadmapReport({
    roleTitle: "Data Analyst", requestedWeeks: 4, hoursPerWeek: 8,
    weeks: [{ week: 1, focus: "SQL", tasks: [{ task: "Practice SELECT", hours: 4 }], deliverable: "A query file", plannedHours: 4, overBudget: false }],
    totalHours: 4, budgetHours: 32, startingPoint: "Knows Excel", capstone: { title: "Dashboard", description: "Build one", skills_shown: ["SQL"] },
    resumeUpdates: ["Add SQL"], readinessChecks: ["Explain a JOIN"], note: "",
  });
  assert.match(road, /## Week 1: SQL \(4 h\)/);
  assert.match(road, /Portfolio project: Dashboard/);
  const coach = coachReport("Analyst", "Acme", [{ category: "technical", question: "What is a JOIN?", what_interviewer_looks_for: "SQL basics" }], {});
  assert.match(coach, /Question 1 \(technical\): What is a JOIN\?/);
});
