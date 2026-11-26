/**
 * Consistency check: runs every sample profile through the real API three times
 * and prints the per-area scores, the normalised section scores and their spread.
 *
 * Usage:
 *   1. npm run dev            (in another terminal)
 *   2. npm run consistency
 *
 * Options (env vars):
 *   BASE_URL   default http://localhost:3000
 *   RUNS       default 3
 *   DELAY_MS   pause between requests, default 0
 *
 * Note: the API allows 10 requests per 10 minutes per IP, and this script makes
 * RUNS x 3 requests. If you re-run it straight away, wait or raise
 * RATE_LIMIT_MAX in .env.local and restart the dev server.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const RUNS = Number(process.env.RUNS ?? 3);
const DELAY_MS = Number(process.env.DELAY_MS ?? 0);
const samplesDir = path.join(process.cwd(), "tests", "samples");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function formatScore(value) {
  return value === null || value === undefined ? "n/a" : String(value);
}

function spread(values) {
  const numbers = values.filter((value) => typeof value === "number");
  if (numbers.length === 0) return "n/a";
  return String(Math.max(...numbers) - Math.min(...numbers));
}

function mean(values) {
  const numbers = values.filter((value) => typeof value === "number");
  if (numbers.length === 0) return "n/a";
  return (numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(1);
}

/**
 * One row per area, in the order the API returned them (which is rubric order),
 * with that area's score from each successful run.
 */
function areaRows(runs, section) {
  const rows = new Map();

  runs.forEach((data, runIndex) => {
    for (const item of data[section].breakdown) {
      if (!rows.has(item.area)) {
        rows.set(item.area, {
          area: item.area,
          max: item.max,
          scores: Array(runs.length).fill(null),
        });
      }
      const row = rows.get(item.area);
      row.max = item.max;
      row.scores[runIndex] = item.score;
    }
  });

  return [...rows.values()];
}

function printAreas(label, rows) {
  if (rows.length === 0) return;

  console.log(`  ${label} areas:`);
  const nameWidth = Math.max(...rows.map((row) => row.area.length));

  for (const row of rows) {
    const latest = row.scores[row.scores.length - 1];
    console.log(
      `    ${row.area.padEnd(nameWidth)}  ${formatScore(latest).padStart(3)}/${row.max}` +
        `   runs: ${row.scores.map(formatScore).join(", ")}` +
        `   spread: ${spread(row.scores)}`,
    );
  }
}

async function runSample(sample) {
  const resumeScores = [];
  const linkedinScores = [];
  const successes = [];

  for (let run = 1; run <= RUNS; run++) {
    const response = await fetch(`${BASE_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetRole: sample.targetRole,
        resumeText: sample.resumeText,
        linkedinText: sample.linkedinText,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message = data?.error ?? `HTTP ${response.status}`;
      console.log(`  run ${run}: ERROR — ${message}`);
      resumeScores.push(null);
      linkedinScores.push(null);
    } else {
      const resume = data.resume.score.normalisedScore;
      const linkedin = data.linkedin.score.normalisedScore;
      resumeScores.push(resume);
      linkedinScores.push(linkedin);
      successes.push(data);
      console.log(
        `  run ${run}: resume ${formatScore(resume)}  linkedin ${formatScore(linkedin)}` +
          `  (resume ${data.resume.score.pointsAwarded}/${data.resume.score.scoredOutOf} pts,` +
          ` linkedin ${data.linkedin.score.pointsAwarded}/${data.linkedin.score.scoredOutOf} pts)`,
      );
    }

    if (DELAY_MS > 0 && run < RUNS) await sleep(DELAY_MS);
  }

  printAreas("Resume", areaRows(successes, "resume"));
  printAreas("LinkedIn", areaRows(successes, "linkedin"));

  console.log(
    `  spread: resume ${spread(resumeScores)}, linkedin ${spread(linkedinScores)}` +
      `   |   mean: resume ${mean(resumeScores)}, linkedin ${mean(linkedinScores)}`,
  );
}

async function main() {
  const files = (await readdir(samplesDir)).filter((file) => file.endsWith(".json")).sort();

  if (files.length === 0) {
    console.error(`No samples found in ${samplesDir}`);
    process.exit(1);
  }

  console.log(`Running ${files.length} samples x ${RUNS} against ${BASE_URL}\n`);

  for (const file of files) {
    const sample = JSON.parse(await readFile(path.join(samplesDir, file), "utf8"));
    console.log(`${sample.name ?? file} — target: ${sample.targetRole}`);
    await runSample(sample);
    console.log("");
  }

  console.log("Lower spread = more consistent scoring. A spread of 0–5 is a good result.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
