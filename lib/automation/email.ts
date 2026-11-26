/**
 * Builds the email the n8n workflow sends. The app composes the subject and
 * HTML so the Gmail node only needs to read two fields. Everything that came
 * from a user or a model is HTML-escaped here.
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Cleans report text: no control characters except newlines, bounded length. */
export function cleanReport(value: string, maxLength = 20_000): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

/** Turns the report format (# heading, ## sub-heading, - item) into simple safe HTML. */
export function reportToHtml(report: string): string {
  const out: string[] = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  for (const raw of report.split("\n")) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }
    if (line.startsWith("## ")) {
      closeList();
      out.push(`<h3 style="margin:18px 0 6px">${escapeHtml(line.slice(3))}</h3>`);
    } else if (line.startsWith("# ")) {
      closeList();
      out.push(`<h2 style="margin:0 0 8px">${escapeHtml(line.slice(2))}</h2>`);
    } else if (line.startsWith("- ")) {
      if (!inList) {
        out.push('<ul style="margin:4px 0 4px 18px;padding:0">');
        inList = true;
      }
      out.push(`<li style="margin:3px 0">${escapeHtml(line.slice(2))}</li>`);
    } else {
      closeList();
      out.push(`<p style="margin:6px 0">${escapeHtml(line)}</p>`);
    }
  }
  closeList();
  return out.join("\n");
}

const WRAP = (inner: string) =>
  `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1e293b;max-width:640px">${inner}</div>`;

/** The short email: top fixes and scores. */
export function composePlanEmail(input: {
  topFixes: string[];
  resumeScore: number | null;
  linkedinScore: number | null;
  matchScore: number | null;
}): { subject: string; html: string } {
  const scores = [
    input.resumeScore !== null ? `Resume score: ${input.resumeScore}/100` : "",
    input.linkedinScore !== null ? `LinkedIn score: ${input.linkedinScore}/100` : "",
    input.matchScore !== null ? `Match score: ${input.matchScore}/100` : "",
  ].filter(Boolean);

  const html = WRAP(
    `<p>Hi,</p><p>Here are your top fixes from CareerOS:</p>` +
      `<ul>${input.topFixes.map((fix) => `<li>${escapeHtml(fix)}</li>`).join("")}</ul>` +
      scores.map((line) => `<p>${escapeHtml(line)}</p>`).join("") +
      `<p>Run CareerOS again after making these changes to see your progress.</p>`,
  );
  return { subject: "Your CareerOS action plan", html };
}

/** The long email: the full report shown on screen. */
export function composeReportEmail(report: string): { subject: string; html: string } {
  const title = report.split("\n")[0]?.replace(/^#\s*/, "").slice(0, 100) || "your results";
  const html = WRAP(
    reportToHtml(report) +
      `<p style="margin-top:18px;color:#64748b;font-size:12px">CareerOS gives an AI-assisted review, not a hiring decision. Always check advice against the job description you are applying to.</p>`,
  );
  return { subject: `Your CareerOS report: ${title}`, html };
}
