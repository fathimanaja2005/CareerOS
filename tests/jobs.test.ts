import test from "node:test";
import assert from "node:assert/strict";
import { htmlToText, normaliseJobs, searchPhrases } from "../lib/jobs/remotive.ts";

test("htmlToText strips tags and keeps list structure", () => {
  const text = htmlToText("<p>Hello &amp; welcome</p><ul><li>SQL</li><li>Excel</li></ul><script>x()</script>");
  assert.match(text, /Hello & welcome/);
  assert.match(text, /- SQL/);
  assert.match(text, /- Excel/);
  assert.doesNotMatch(text, /<|x\(\)/);
});

test("searchPhrases tries the role, then without seniority, then the last two words", () => {
  assert.deepEqual(searchPhrases("Junior Data Analyst"), ["Junior Data Analyst", "Data Analyst"]);
  assert.deepEqual(searchPhrases("Forward Deployed Engineer"), [
    "Forward Deployed Engineer",
    "Deployed Engineer",
  ]);
});

test("normaliseJobs keeps only complete Remotive posts", () => {
  const long = "<p>" + "We need someone who knows SQL and Excel. ".repeat(5) + "</p>";
  const jobs = normaliseJobs({
    jobs: [
      { id: 1, url: "https://remotive.com/remote-jobs/a", title: "Data Analyst", company_name: "Acme", description: long },
      { id: 2, url: "https://evil.example/x", title: "Data Analyst", company_name: "Bad", description: long },
      { id: 3, url: "https://remotive.com/remote-jobs/c", title: "No description", company_name: "Acme" },
      { id: 4, url: "https://remotive.com/remote-jobs/d", title: "Short", company_name: "Acme", description: "<p>tiny</p>" },
    ],
  });
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].company, "Acme");
  assert.equal(jobs[0].location, "Remote");
});

test("normaliseJobs returns nothing for bad input", () => {
  assert.deepEqual(normaliseJobs(null), []);
  assert.deepEqual(normaliseJobs({ jobs: "no" }), []);
});
