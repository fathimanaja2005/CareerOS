import { findAdzunaJobs, isAdzunaConfigured } from "./adzuna.ts";
import { findRemotiveJobs, rankByTitle, rankLoosely, type FoundJob } from "./remotive.ts";

/**
 * Combined job search: Adzuna (India and local, when configured) and Remotive
 * (remote worldwide). Results are filtered by title fit and interleaved so both
 * sources show up. A source that fails is skipped; only when every source fails
 * does the search report an error.
 */
export async function searchJobs(role: string): Promise<{ jobs: FoundJob[]; sources: string[]; relaxed: boolean }> {
  const attempts: { name: string; run: () => Promise<FoundJob[]> }[] = [];
  if (isAdzunaConfigured()) attempts.push({ name: "Adzuna", run: () => findAdzunaJobs(role) });
  attempts.push({ name: "Remotive", run: () => findRemotiveJobs(role) });

  const settled = await Promise.allSettled(attempts.map((attempt) => attempt.run()));
  const lists: FoundJob[][] = [];
  const raw: FoundJob[][] = [];
  const sources: string[] = [];
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      sources.push(attempts[index].name);
      raw.push(result.value);
      lists.push(rankByTitle(result.value, role));
    }
  });
  if (sources.length === 0) throw new Error("No job source could be reached");

  // When no title fits exactly, fall back to related posts instead of an empty list.
  const relaxed = lists.every((list) => list.length === 0);
  const sourceLists = relaxed ? raw.map((list) => rankLoosely(list, role)) : lists;

  // Interleave so the student sees both local and remote posts, then cap.
  const jobs: FoundJob[] = [];
  for (let i = 0; jobs.length < 12 && sourceLists.some((list) => i < list.length); i++) {
    for (const list of sourceLists) if (i < list.length && jobs.length < 12) jobs.push(list[i]);
  }
  return { jobs, sources, relaxed: relaxed && jobs.length > 0 };
}
