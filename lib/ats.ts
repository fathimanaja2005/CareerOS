/**
 * Resume readability checks for applicant tracking systems.
 * Pure code, no model call: the same text always gives the same result.
 */

export type AtsStatus = "pass" | "warn" | "fail";

export type AtsCheck = {
  id: string;
  label: string;
  status: AtsStatus;
  detail: string;
};

const SECTION_WORDS = {
  experience: /^(work |professional )?(experience|employment|internships?)( history)?$/,
  education: /^education( and training)?$|^academics?$|^academic (background|qualifications?)$/,
  skills: /^(technical |key |core )?skills( and tools)?$|^technologies$/,
  projects: /^(academic |personal |key )?projects?$/,
};

function sectionsFound(text: string): Set<string> {
  const found = new Set<string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/[:\-–—|]+$/, "").trim().toLowerCase();
    if (!line || line.length > 40) continue;
    for (const [name, pattern] of Object.entries(SECTION_WORDS)) {
      if (pattern.test(line)) found.add(name);
    }
  }
  return found;
}

export function atsChecks(text: string): AtsCheck[] {
  const checks: AtsCheck[] = [];
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  // 1. Email
  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(text);
  checks.push({
    id: "email",
    label: "Email address",
    status: hasEmail ? "pass" : "fail",
    detail: hasEmail ? "Found an email address." : "No email address found. Recruiters cannot reply without one.",
  });

  // 2. Phone
  const hasPhone = /(\+?\d[\d\s().-]{8,}\d)/.test(text);
  checks.push({
    id: "phone",
    label: "Phone number",
    status: hasPhone ? "pass" : "warn",
    detail: hasPhone ? "Found a phone number." : "No phone number found. Add one with your country code.",
  });

  // 3. Section headings
  const sections = sectionsFound(text);
  const core = ["education", "skills"].filter((name) => sections.has(name)).length +
    (sections.has("experience") || sections.has("projects") ? 1 : 0);
  const missing: string[] = [];
  if (!sections.has("education")) missing.push("Education");
  if (!sections.has("skills")) missing.push("Skills");
  if (!sections.has("experience") && !sections.has("projects")) missing.push("Experience or Projects");
  checks.push({
    id: "sections",
    label: "Standard section headings",
    status: core === 3 ? "pass" : core === 2 ? "warn" : "fail",
    detail:
      core === 3
        ? "Education, Skills and Experience or Projects are all labelled clearly."
        : `Missing a clear heading for: ${missing.join(", ")}. Use plain names, on their own line.`,
  });

  // 4. Dates
  const years = text.match(/\b(19|20)\d{2}\b/g) ?? [];
  checks.push({
    id: "dates",
    label: "Dates",
    status: years.length >= 2 ? "pass" : years.length === 1 ? "warn" : "fail",
    detail:
      years.length >= 2
        ? "Dates are written as years, which systems read reliably."
        : "Few or no dates found. Add years for your education, projects and roles.",
  });

  // 5. Length
  checks.push({
    id: "length",
    label: "Length",
    status: words < 120 ? "fail" : words < 200 || words > 900 ? "warn" : "pass",
    detail:
      words < 120
        ? `Only ${words} words. This is too short to score well.`
        : words < 200
          ? `${words} words. A little short for a one-page resume.`
          : words > 900
            ? `${words} words. Over two pages is hard to scan. Trim it.`
            : `${words} words, a good length.`,
  });

  // 6. Bullets
  const bullets = lines.filter((line) => /^\s*[•\-*·–▪●◦]\s+/.test(line)).length;
  checks.push({
    id: "bullets",
    label: "Bullet points",
    status: bullets >= 5 ? "pass" : "warn",
    detail:
      bullets >= 5
        ? `${bullets} bullet points found.`
        : "Few bullet points found. Short bullets make achievements easier for systems and people to read.",
  });

  // 7. Tables and columns
  const layoutLines = lines.filter((line) => /\t| {3,}/.test(line) || (line.match(/\|/g) ?? []).length >= 3).length;
  const layoutShare = lines.length ? layoutLines / lines.length : 0;
  checks.push({
    id: "layout",
    label: "Simple layout",
    status: layoutShare > 0.2 ? "warn" : "pass",
    detail:
      layoutShare > 0.2
        ? "The text looks like columns or a table, which many systems read out of order. Use one column."
        : "No sign of tables or multi-column text.",
  });

  // 8. Links
  const hasLinkedin = /linkedin\.com/i.test(text);
  const hasGithub = /github\.com/i.test(text);
  checks.push({
    id: "links",
    label: "Profile links",
    status: hasLinkedin && hasGithub ? "pass" : hasLinkedin || hasGithub ? "warn" : "fail",
    detail:
      hasLinkedin && hasGithub
        ? "LinkedIn and GitHub links found."
        : hasLinkedin
          ? "LinkedIn found. A GitHub or portfolio link would help for technical roles."
          : hasGithub
            ? "GitHub found. Add your LinkedIn link too."
            : "No LinkedIn or GitHub link found. Add at least one.",
  });

  return checks;
}

export function atsSummary(checks: AtsCheck[]): { passed: number; total: number } {
  return { passed: checks.filter((check) => check.status === "pass").length, total: checks.length };
}
