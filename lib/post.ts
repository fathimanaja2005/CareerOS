/** Pure helpers for the LinkedIn post generator. No model call, no browser APIs. */


export type PostScore = { kind: string; score: number; at: number };
export type PostApp = { status: string };

const TITLES: { kind: string; title: string }[] = [
  { kind: "report", title: "Career report" },
  { kind: "profile", title: "Profile review" },
  { kind: "match", title: "Job match" },
  { kind: "interview", title: "Interview practice" },
];

/** Plain-language facts taken from the student's saved scores and tracker. The post may use only these. */
export function buildPostFacts(role: string, scores: PostScore[], apps: PostApp[]): string[] {
  const facts: string[] = [];
  if (role.trim()) facts.push(`Target role: ${role.trim()}.`);

  for (const { kind, title } of TITLES) {
    const series = scores.filter((s) => s.kind === kind).sort((a, b) => a.at - b.at);
    if (series.length === 0) continue;
    const first = series[0];
    const latest = series[series.length - 1];
    facts.push(`Latest ${title} score: ${latest.score} out of 100.`);
    if (series.length >= 2 && first.score !== latest.score) {
      facts.push(`${title} score moved from ${first.score} to ${latest.score} across ${series.length} runs.`);
    }
  }

  if (apps.length > 0) {
    facts.push(`Tracking ${apps.length} job application${apps.length === 1 ? "" : "s"}.`);
    const reached = apps.filter((a) => a.status === "Interview" || a.status === "Offer").length;
    if (reached > 0) facts.push(`${reached} of them reached the interview stage or beyond.`);
  }
  return facts;
}

/** Numbers that appear in the post but not in the facts or the student's own note. */
export function unsupportedNumbers(post: string, allowedText: string): string[] {
  const pick = (text: string) => text.match(/\d+(?:[.,]\d+)?/g) ?? [];
  const allowed = new Set(pick(allowedText));
  const unsupported: string[] = [];
  for (const n of pick(post)) {
    if (!allowed.has(n) && !unsupported.includes(n)) unsupported.push(n);
  }
  return unsupported;
}
