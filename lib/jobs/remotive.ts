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

export function normaliseJobs(raw: unknown, max = 10): FoundJob[] {
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
    });
    if (jobs.length >= max) break;
  }
  return jobs;
}

export async function findJobs(role: string): Promise<FoundJob[]> {
  for (const phrase of searchPhrases(role)) {
    const url = `${ENDPOINT}?search=${encodeURIComponent(phrase)}&limit=20`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 6 * 60 * 60 },
    });
    if (!response.ok) throw new Error(`Remotive responded with ${response.status}`);
    const jobs = normaliseJobs(await response.json());
    if (jobs.length > 0) return jobs;
  }
  return [];
}
