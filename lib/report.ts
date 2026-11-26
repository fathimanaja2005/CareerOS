/**
 * Plain-text reports built from each agent's result, for the optional
 * "email me the full report" feature. Pure functions: the same result always
 * gives the same text, and nothing here touches the network.
 *
 * Format: lines starting "# " are headings, "## " are sub-headings, "- " are
 * list items, anything else is a paragraph. The server turns this into safe HTML.
 */
import type { AnalysisResult } from "./agents/profile/schema";
import type { MatchResult } from "./agents/match/schema";
import type { RoadmapResult } from "./agents/roadmap/schema";
import type { CoachQuestion, FeedbackResult } from "./agents/coach/schema";
import { rankEntries, sharedGaps, type ShortlistEntry } from "./agents/shortlist/aggregate.ts";
import type { BreakdownItem, Fix, SectionScore } from "./agents/shared";

const score = (value: number | null | undefined) => (value === null || value === undefined ? "not scored" : `${value}/100`);

function breakdownLines(items: BreakdownItem[]): string[] {
  return items.map(
    (item) => `- ${item.area}: ${item.score === null ? "not provided" : `${item.score}/${item.max}`}. ${item.reason}`,
  );
}

function fixLines(fixes: Fix[]): string[] {
  return fixes.map((fix) => `- ${fix.issue} How to fix: ${fix.how_to_fix}`);
}

function sectionTotal(label: string, section: SectionScore): string {
  return `${label}: ${score(section.normalisedScore)} (${section.pointsAwarded} of ${section.scoredOutOf} points)`;
}

export function profileReport(result: AnalysisResult): string {
  const lines: string[] = [`# Profile review for ${result.targetRole}`];
  lines.push(sectionTotal("Resume", result.resume.score), sectionTotal("LinkedIn", result.linkedin.score));

  if (result.resume.breakdown.length) {
    lines.push("## Resume score breakdown", ...breakdownLines(result.resume.breakdown));
  }
  if (result.resume.top_strengths.length) {
    lines.push("## What is already working", ...result.resume.top_strengths.map((s) => `- ${s}`));
  }
  if (result.resume.top_fixes.length) {
    lines.push("## Top resume fixes", ...fixLines(result.resume.top_fixes));
  }
  if (result.resume.rewrites.length) {
    lines.push("## Resume rewrites (replace [brackets] with your real numbers)");
    for (const rewrite of result.resume.rewrites) {
      lines.push(`- Original: ${rewrite.original}`, `- Improved: ${rewrite.improved}`);
      if (rewrite.needs_from_student) lines.push(`- Needs from you: ${rewrite.needs_from_student}`);
    }
  }
  if (result.linkedin.breakdown.length) {
    lines.push("## LinkedIn score breakdown", ...breakdownLines(result.linkedin.breakdown));
  }
  if (result.linkedin.top_fixes.length) {
    lines.push("## Top LinkedIn fixes", ...fixLines(result.linkedin.top_fixes));
  }
  if (result.linkedin.headline_options.length) {
    lines.push("## LinkedIn headline options", ...result.linkedin.headline_options.map((h) => `- ${h}`));
  }
  if (result.linkedin.about_rewrite) {
    lines.push("## LinkedIn About rewrite", result.linkedin.about_rewrite);
  }
  if (result.missing_skills_for_role.length) {
    lines.push("## Missing skills for this role", ...result.missing_skills_for_role.map((s) => `- ${s}`));
  }
  lines.push("## Confidence note", result.confidence_note);
  return lines.join("\n");
}

export function matchReport(result: MatchResult): string {
  const lines: string[] = [`# Job match: ${result.roleTitle} at ${result.company}`];
  lines.push(`Match score: ${score(result.score.normalisedScore)} (${result.score.pointsAwarded} of ${result.score.scoredOutOf} points)`);
  lines.push(`Verdict: ${result.verdict.label}. ${result.verdict.reason}`);
  lines.push("## Score breakdown", ...breakdownLines(result.breakdown));
  if (result.matchedSkills.length) {
    lines.push("## Skills you already show", ...result.matchedSkills.map((s) => `- ${s}`));
  }
  if (result.missingSkills.length) {
    lines.push("## Skills to learn");
    for (const skill of result.missingSkills) {
      lines.push(`- ${skill.skill} (${skill.importance}, about ${skill.time_estimate}). ${skill.how_to_learn}`);
    }
  }
  if (result.resumeChanges.length) {
    lines.push("## Change your resume for this job", ...fixLines(result.resumeChanges));
  }
  if (result.tailoredBullets.length) {
    lines.push("## Tailored resume bullets (replace [brackets] with your real numbers)");
    for (const bullet of result.tailoredBullets) {
      lines.push(`- Original: ${bullet.original}`, `- Improved: ${bullet.improved}`);
      if (bullet.needs_from_student) lines.push(`- Needs from you: ${bullet.needs_from_student}`);
    }
  }
  const prep = result.interviewPrep;
  if (prep.likely_questions.length) lines.push("## Likely interview questions", ...prep.likely_questions.map((q) => `- ${q}`));
  if (prep.topics_to_revise.length) lines.push("## Topics to revise", ...prep.topics_to_revise.map((t) => `- ${t}`));
  if (prep.company_research_checklist.length) {
    lines.push("## Research about the company (CareerOS did not research it)", ...prep.company_research_checklist.map((c) => `- ${c}`));
  }
  lines.push("## Confidence note", result.confidenceNote);
  return lines.join("\n");
}

export function roadmapReport(result: RoadmapResult): string {
  const lines: string[] = [`# Learning roadmap for ${result.roleTitle}`];
  lines.push(`${result.weeks.length} weeks, ${result.hoursPerWeek} hours a week. Planned ${result.totalHours} of ${result.budgetHours} hours.`);
  if (result.note) lines.push(result.note);
  lines.push("## Where you start", result.startingPoint);
  for (const week of result.weeks) {
    lines.push(`## Week ${week.week}: ${week.focus} (${week.plannedHours} h)`);
    lines.push(...week.tasks.map((task) => `- ${task.task} (${task.hours} h)`));
    lines.push(`You will have: ${week.deliverable}`);
  }
  lines.push(`## Portfolio project: ${result.capstone.title}`, result.capstone.description);
  if (result.capstone.skills_shown.length) lines.push(`Shows: ${result.capstone.skills_shown.join(", ")}`);
  if (result.resumeUpdates.length) lines.push("## Update your resume when you finish", ...result.resumeUpdates.map((u) => `- ${u}`));
  if (result.readinessChecks.length) lines.push("## Are you ready? Check yourself", ...result.readinessChecks.map((r) => `- ${r}`));
  lines.push("This plan is an AI-assisted suggestion. Choose learning resources you trust.");
  return lines.join("\n");
}

export function shortlistReport(entries: ShortlistEntry[]): string {
  const ranked = rankEntries(entries);
  const lines: string[] = ["# Your job shortlist"];
  ranked.forEach((entry, index) => {
    if (!entry.result) {
      lines.push(`## Not scored: ${entry.roleTitle} at ${entry.company}`, entry.error || "This job could not be scored.");
      return;
    }
    const r = entry.result;
    lines.push(`## #${index + 1} ${entry.roleTitle} at ${entry.company}: ${score(r.score.normalisedScore)}`);
    lines.push(`${r.verdict.label}. ${r.verdict.reason}`);
    lines.push(`You show ${r.matchedSkills.length} of the skills this job names.`);
    if (r.missingSkills.length) {
      lines.push(...r.missingSkills.map((s) => `- To learn: ${s.skill} (${s.importance})`));
    }
  });
  const gaps = sharedGaps(entries).filter((gap) => gap.jobs >= 2);
  if (gaps.length) {
    lines.push("## Learn these first (missing in several jobs)");
    lines.push(...gaps.map((g) => `- ${g.skill}: missing in ${g.jobs} jobs, must-have in ${g.mustHaveJobs}`));
  }
  lines.push("Scores are AI-assisted opinions based only on the text you pasted.");
  return lines.join("\n");
}

export function coachReport(
  roleTitle: string,
  company: string,
  questions: CoachQuestion[],
  feedbacks: Record<number, FeedbackResult>,
): string {
  const lines: string[] = [`# Interview practice for ${roleTitle} at ${company}`];
  questions.forEach((q, index) => {
    lines.push(`## Question ${index + 1} (${q.category}): ${q.question}`);
    lines.push(`What they look for: ${q.what_interviewer_looks_for}`);
    const fb = feedbacks[index];
    if (!fb) return;
    lines.push(`Your answer scored ${score(fb.score.normalisedScore)}.`);
    lines.push(...breakdownLines(fb.breakdown));
    if (fb.strengths.length) lines.push("What worked:", ...fb.strengths.map((s) => `- ${s}`));
    if (fb.improvements.length) lines.push("What to improve:", ...fb.improvements.map((s) => `- ${s}`));
    lines.push(`A stronger version of your answer: ${fb.improvedAnswer}`);
    if (fb.needsFromStudent) lines.push(`Needed from you: ${fb.needsFromStudent}`);
  });
  lines.push("CareerOS does not research the company. Questions are built only from the job description you pasted.");
  return lines.join("\n");
}
