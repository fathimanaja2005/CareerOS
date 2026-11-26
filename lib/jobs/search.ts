import { findAdzunaJobs, isAdzunaConfigured } from "./adzuna.ts";
import { findRemotiveJobs, rankByTitle, type FoundJob } from "./remotive.ts";

/**
 * Combined job search: Adzuna (India and local, when configured) and Remotive
 * (remote worldwide). Results are filtered by title fit and interleaved so both
 * sources show up. A source that fails is skipped; only when every source fails
 * does the search report an error.
 */
export async function searchJobs(role: string): Promise<{ jobs: FoundJob[]; sources: string[] }> {
  const attempts: { name: string; run: () => Promise<FoundJob[]> }[] = [];
  if (isAdzunaConfigured()) attempts.push({ name: "Adzuna", run: () => findAdzunaJobs(role) });
  attempts.push({ name: "Remotive", run: () => findRemotiveJobs(role) });

  const settled = await Promise.allSettled(attempts.map((attempt) => attempt.run()));
  const lists: FoundJob[][] = [];
  const sources: string[] = [];
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      sources.push(attempts[index].name);
      lists.push(rankByTitle(result.value, role));
    }
  });
  if (sources.length === 0) throw new Error("No job source could be reached");

  // Interleave so the student sees both local and remote posts, then cap.
  const jobs: FoundJob[] = [];
  for (let i = 0; jobs.length < 12 && lists.some((list) => i < list.length); i++) {
    for (const list of lists) if (i < list.length && jobs.length < 12) jobs.push(list[i]);
  }
  return { jobs, sources };
}
