import test from "node:test";
import assert from "node:assert/strict";
import { adzunaQueries, normaliseAdzuna } from "../lib/jobs/adzuna.ts";
import { htmlToText, normaliseJobs, rankByTitle, rankLoosely, searchPhrases, searchUrls, significantWords } from "../lib/jobs/remotive.ts";

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

test("rankByTitle drops posts whose title does not fit the role", () => {
  const make = (title: string) => ({
    id: title, company: "Co", title, location: "Remote", jobType: "", url: "https://remotive.com/x", description: "d".repeat(100), source: "Remotive",
  });
  const ranked = rankByTitle(
    [
      make("WordPress Theme & Plugin Developer"),
      make("Senior Data Engineer"),
      make("Junior Data Analyst"),
      make("Customer Service Representative"),
      make("Business Analyst"),
    ],
    "Data Analyst",
  );
  const titles = ranked.map((job) => job.title);
  assert.equal(titles[0], "Junior Data Analyst");
  assert.ok(titles.includes("Business Analyst"));
  assert.ok(!titles.includes("Senior Data Engineer"));
  assert.ok(!titles.includes("WordPress Theme & Plugin Developer"));
  assert.ok(!titles.includes("Customer Service Representative"));
});

test("rankByTitle returns nothing when no title fits", () => {
  const job = { id: "1", company: "Co", title: "Chef", location: "Remote", jobType: "", url: "https://remotive.com/x", description: "d".repeat(100), source: "Remotive" };
  assert.deepEqual(rankByTitle([job], "Data Analyst"), []);
});

test("searchUrls adds the job noun and the data category for data roles", () => {
  const urls = searchUrls("Data Analyst");
  assert.ok(urls.some((u) => u.includes("search=Data%20Analyst")));
  assert.ok(urls.some((u) => u.includes("search=analyst")));
  assert.ok(urls.some((u) => u.includes("category=data")));
  assert.ok(!searchUrls("Chef").some((u) => u.includes("category=data")));
});

test("normaliseAdzuna keeps complete Adzuna posts and labels the source", () => {
  const jobs = normaliseAdzuna({
    results: [
      { id: 1, title: "Data Analyst", company: { display_name: "Acme" }, location: { display_name: "Kochi, Kerala" }, description: "Work with SQL and Excel dashboards for retail clients every day.", redirect_url: "https://www.adzuna.in/details/1", contract_time: "full_time" },
      { id: 2, title: "Bad", company: { display_name: "X" }, description: "Work with SQL and Excel dashboards for retail clients every day.", redirect_url: "https://evil.example/2" },
      { id: 3, title: "No company", description: "Work with SQL and Excel dashboards for retail clients every day.", redirect_url: "https://www.adzuna.in/details/3" },
    ],
  });
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].source, "Adzuna");
  assert.equal(jobs[0].location, "Kochi, Kerala");
  assert.deepEqual(normaliseAdzuna(null), []);
});

const job = (title: string, description = "A role at a company that needs good people. ".repeat(3)) => ({
  id: title, company: "Acme", title, location: "Remote", jobType: "", url: "https://remotive.com/x", description, source: "Remotive",
});

test("a long fresher title finds nothing strictly but related posts loosely", () => {
  const jobs = [job("Senior Backend Engineer"), job("Automation Engineer"), job("QA Analyst", "We automate testing for web apps."), job("Chef")];
  assert.equal(rankByTitle(jobs, "IT & Automation Intern").length, 1);
  assert.deepEqual(significantWords("IT & Automation Intern"), ["automation"]);
  assert.deepEqual(rankLoosely(jobs, "IT & Automation Intern").map((j) => j.title), ["Automation Engineer"]);
});

test("loose ranking returns nothing when no significant word matches", () => {
  assert.deepEqual(rankLoosely([job("Chef")], "IT & Automation Intern"), []);
  assert.deepEqual(rankLoosely([job("Chef")], "IT"), []);
});

test("Adzuna queries go from exact to broad", () => {
  assert.deepEqual(adzunaQueries("Junior Data Analyst"), [
    { what: "Junior Data Analyst" },
    { what: "Data Analyst" },
    { what_or: "data analyst" },
  ]);
  assert.deepEqual(adzunaQueries("IT & Automation Intern")[0], { what: "IT & Automation Intern" });
  assert.deepEqual(adzunaQueries("IT & Automation Intern").at(-1), { what_or: "automation" });
});
