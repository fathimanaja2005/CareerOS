/**
 * Finds real job posts from Remotive's free public API (remote jobs only).
 * Results are cached for six hours because Remotive asks for sparing use, and
 * every job keeps its link back to Remotive as their terms require.
 * Nothing is invented: if the API returns nothing, the student gets nothing.
 */

export type FoundJob = {
  id: string;
  company: string;
  title: string;
  location: string;
  jobType: string;
  url: string;
  description: string;
  /** Where the post came from, shown to the student with a link back. */
  source: string;
};

const ENDPOINT = "https://remotive.com/api/remote-jobs";
const MAX_DESCRIPTION = 6000;
const SENIORITY = /\b(junior|jr\.?|senior|sr\.?|associate|entry[- ]level|intern|trainee|fresher|lead|principal)\b/gi;

/** Turns Remotive's HTML description into plain text the Job Match agent can read. */
export function htmlToText(html: string): string {
  return html
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, " ")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|li|h[1-6]|tr|ul|ol)\s*>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Search phrases to try, most specific first: the role, the role without seniority words, its last two words. */
export function searchPhrases(role: string): string[] {
  const clean = role.replace(/\s+/g, " ").trim();
  const withoutSeniority = clean.replace(SENIORITY, "").replace(/\s+/g, " ").trim();
  const words = withoutSeniority.split(" ").filter(Boolean);
  const lastTwo = words.slice(-2).join(" ");
  const phrases = [clean, withoutSeniority, lastTwo].filter((p) => p.length >= 3);
  return [...new Set(phrases)];
}

type RemotiveJob = {
  id?: number;
  url?: string;
  title?: string;
  company_name?: string;
  job_type?: string;
  candidate_required_location?: string;
  description?: string;
};

const STOP_WORDS = new Set(["and", "of", "the", "for", "in", "at", "to", "a", "an", "or", "with"]);

function stem(word: string): string {
  return word.length > 3 ? word.replace(/s$/, "") : word;
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(SENIORITY, " ")
    .split(/[^a-z0-9+#.]+/)
    .filter((word) => word.length >= 2 && !STOP_WORDS.has(word))
    .map(stem);
}

/**
 * Remotive's search also matches words buried in descriptions, so a search for
 * "Data Analyst" can return a WordPress developer. We keep only posts whose
 * TITLE fits the role: it must contain the role's last word (the job noun, e.g.
 * "analyst"), or, for roles of three or more words, at least half of the role's words.
 * Best matches come first.
 */
export function rankByTitle(jobs: FoundJob[], role: string): FoundJob[] {
  const wanted = tokens(role);
  if (wanted.length === 0) return [];
  const noun = wanted[wanted.length - 1];

  return jobs
    .map((job) => {
      const have = new Set(tokens(job.title));
      const matched = wanted.filter((word) => have.has(word)).length;
      const fits = have.has(noun) || (wanted.length >= 3 && matched / wanted.length >= 0.5);
      return { job, matched, fits, ratio: matched / wanted.length };
    })
    .filter((entry) => entry.fits && entry.matched > 0)
    .sort((a, b) => b.ratio - a.ratio)
    .map((entry) => entry.job);
}

export function normaliseJobs(raw: unknown, max = 100): FoundJob[] {
  const list = (raw as { jobs?: unknown })?.jobs;
  if (!Array.isArray(list)) return [];
  const jobs: FoundJob[] = [];
  for (const item of list as RemotiveJob[]) {
    if (!item || typeof item.url !== "string" || !item.url.startsWith("https://remotive.com/")) continue;
    if (!item.title || !item.company_name || !item.description) continue;
    const description = htmlToText(item.description).slice(0, MAX_DESCRIPTION);
    if (description.length < 80) continue;
    jobs.push({
      id: String(item.id ?? item.url),
      company: item.company_name.slice(0, 120),
      title: item.title.slice(0, 120),
      location: (item.candidate_required_location || "Remote").slice(0, 80),
      jobType: (item.job_type || "").replace(/_/g, " "),
      url: item.url,
      description,
      source: "Remotive",
    });
    if (jobs.length >= max) break;
  }
  return jobs;
}

/** Every Remotive request worth making for a role: phrase searches, the job noun alone, and the data category for data-like roles. */
export function searchUrls(role: string): string[] {
  const urls = searchPhrases(role).map((phrase) => `${ENDPOINT}?search=${encodeURIComponent(phrase)}&limit=100`);
  const noun = tokens(role).pop();
  if (noun && noun.length >= 4) urls.push(`${ENDPOINT}?search=${encodeURIComponent(noun)}&limit=100`);
  if (/\b(data|analy\w*|bi|business intelligence|machine learning|ml|ai|statistic\w*)\b/i.test(role)) {
    urls.push(`${ENDPOINT}?category=data&limit=100`);
  }
  return [...new Set(urls)];
}

/** Remotive part only: remote jobs worldwide. See lib/jobs/search.ts for the combined search. */
export async function findRemotiveJobs(role: string): Promise<FoundJob[]> {
  const pool = new Map<string, FoundJob>();
  let reached = 0;
  for (const url of searchUrls(role)) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
        next: { revalidate: 6 * 60 * 60 },
      });
      if (!response.ok) continue;
      reached += 1;
      for (const job of normaliseJobs(await response.json())) pool.set(job.id, job);
    } catch {
      // One failed request should not hide results from the others.
    }
  }
  if (reached === 0) throw new Error("Remotive could not be reached");
  return [...pool.values()];
}
