/**
 * Finds real job posts in India from Adzuna's free API. Needs ADZUNA_APP_ID and
 * ADZUNA_APP_KEY (free at developer.adzuna.com); without them this source is
 * skipped and only Remotive is used. Adzuna returns a short snippet of each
 * description, not the full text, so scores from these posts are rougher. Every
 * job keeps Adzuna's own link, as their terms ask. Nothing is invented.
 */
import { htmlToText, searchPhrases, significantWords, type FoundJob } from "./remotive.ts";

const COUNTRY = "in";

export function isAdzunaConfigured(): boolean {
  return Boolean(process.env.ADZUNA_APP_ID?.trim() && process.env.ADZUNA_APP_KEY?.trim());
}

type AdzunaJob = {
  id?: string | number;
  title?: string;
  description?: string;
  redirect_url?: string;
  contract_time?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
};

export function normaliseAdzuna(raw: unknown, max = 50): FoundJob[] {
  const list = (raw as { results?: unknown })?.results;
  if (!Array.isArray(list)) return [];
  const jobs: FoundJob[] = [];
  for (const item of list as AdzunaJob[]) {
    if (!item || typeof item.redirect_url !== "string" || !/^https:\/\/(www\.)?adzuna\./.test(item.redirect_url)) continue;
    const title = htmlToText(item.title ?? "").slice(0, 120);
    const company = (item.company?.display_name ?? "").slice(0, 120);
    const description = htmlToText(item.description ?? "").slice(0, 6000);
    if (!title || !company || description.length < 40) continue;
    jobs.push({
      id: `adzuna-${item.id ?? item.redirect_url}`,
      company,
      title,
      location: (item.location?.display_name || "India").slice(0, 80),
      jobType: (item.contract_time || "").replace(/_/g, " "),
      url: item.redirect_url,
      description,
      source: "Adzuna",
    });
    if (jobs.length >= max) break;
  }
  return jobs;
}

/** Query variants to try in order: the exact role, the role without seniority words, then any of its main words. */
export function adzunaQueries(role: string): { what?: string; what_or?: string }[] {
  const queries: { what?: string; what_or?: string }[] = searchPhrases(role).map((what) => ({ what }));
  const words = significantWords(role);
  if (words.length > 0) queries.push({ what_or: words.join(" ") });
  return queries;
}

export async function findAdzunaJobs(role: string): Promise<FoundJob[]> {
  const id = process.env.ADZUNA_APP_ID?.trim();
  const key = process.env.ADZUNA_APP_KEY?.trim();
  if (!id || !key) return [];

  // The first variant that returns posts wins, so a long, specific title still finds something.
  for (const query of adzunaQueries(role)) {
    const params = new URLSearchParams({
      app_id: id,
      app_key: key,
      ...query,
      results_per_page: "30",
      "content-type": "application/json",
    });
    const response = await fetch(`https://api.adzuna.com/v1/api/jobs/${COUNTRY}/search/1?${params}`, {
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 60 * 60 },
    });
    if (!response.ok) throw new Error(`Adzuna responded with ${response.status}`);
    const jobs = normaliseAdzuna(await response.json());
    if (jobs.length > 0) return jobs;
  }
  return [];
}
