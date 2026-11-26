/**
 * Company research: a Gemini call grounded in Google Search.
 * Facts come only from search results and every one is shown with its source.
 * If search finds nothing reliable, the result says so instead of guessing.
 */

/**
 * Company lookup is OFF by default. Tested providers:
 *  - COMPANY_SEARCH=on    Gemini + Google Search tool (needs paid quota; free keys get 429)
 *  - COMPANY_SEARCH=groq  Groq browser_search (free key, but returned "not found" for large
 *                         real companies in testing, so it is not used for the release)
 */
export function companySearchEnabled(): boolean {
  return process.env.COMPANY_SEARCH === "on" || process.env.COMPANY_SEARCH === "groq";
}

export type CompanySource = { title: string; url: string };

export type CompanyResearch =
  | { found: true; summary: string; facts: string[]; sources: CompanySource[] }
  | { found: false };

import { LLM_CONFIG } from "./llm.ts";

// Same model as the rest of the app first (fast, known to work with this key), then a backup.
export const COMPANY_MODELS = [LLM_CONFIG.model, "gemini-3.5-flash"] as const;

export const COMPANY_PROMPT = `You research companies for a job applicant using web search.
Rules:
- Use ONLY what the web search results say. Never add facts from memory. Never guess.
- Several companies can share a name. Pick the one that fits the role title; if you cannot tell, say so in the summary.
- If the search finds no reliable evidence that this company exists, reply with exactly: FOUND: no
- Otherwise reply in exactly this format and nothing else:
FOUND: yes
SUMMARY: two plain sentences on what the company does.
- one short fact an interviewee should know (products, customers, size, location, recent news)
- up to 5 such fact lines, each starting with "- "
Plain text only, no markdown, no links in the text.`;

export function buildCompanyInput(company: string, roleTitle: string): string {
  return `Company: ${company}\nRole the applicant is applying for: ${roleTitle}`;
}

type Grounding = {
  groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
};

/** Turn the model's text plus search metadata into a result. Pure, so it can be tested. */
export function parseCompanyReply(
  text: string,
  grounding: Grounding | undefined,
  requireSources = true,
): CompanyResearch {
  const lines = text
    .replace(/\*\*/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const found = lines.find((l) => /^FOUND:/i.test(l));
  if (!found || /no/i.test(found.replace(/^FOUND:/i, "").trim().slice(0, 3))) return { found: false };

  const summary = lines.find((l) => /^SUMMARY:/i.test(l))?.replace(/^SUMMARY:\s*/i, "").trim() ?? "";
  const facts = lines
    .filter((l) => /^[-•*]\s+/.test(l))
    .map((l) => l.replace(/^[-•*]\s+/, "").trim())
    .filter((l) => l.length > 0 && l.length <= 300)
    .slice(0, 5);

  const seen = new Set<string>();
  const sources: CompanySource[] = [];
  for (const chunk of grounding?.groundingChunks ?? []) {
    const url = chunk.web?.uri;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    sources.push({ title: chunk.web?.title || url, url });
    if (sources.length >= 5) break;
  }

  // No search sources means nothing can be verified, so treat it as not found.
  if (!summary || (requireSources && sources.length === 0)) return { found: false };
  return { found: true, summary: summary.slice(0, 500), facts, sources };
}

async function searchWith(model: string, apiKey: string, company: string, roleTitle: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: COMPANY_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: buildCompanyInput(company, roleTitle) }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
      }),
      signal: AbortSignal.timeout(25_000),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 200);
    throw new Error(`${model} ${response.status} ${detail}`);
  }
  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string; thought?: boolean }> };
      groundingMetadata?: Grounding;
    }>;
  };
  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .filter((p) => p.text && !p.thought)
    .map((p) => p.text)
    .join("\n");
  return parseCompanyReply(text, candidate?.groundingMetadata);
}

type GroqMessage = {
  content?: string;
  executed_tools?: Array<{
    search_results?: { results?: Array<{ title?: string; url?: string }> };
  }>;
};

async function searchWithGroq(apiKey: string, company: string, roleTitle: string) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: COMPANY_PROMPT },
        { role: "user", content: buildCompanyInput(company, roleTitle) },
      ],
      tools: [{ type: "browser_search" }],
      tool_choice: "required",
      reasoning_effort: "low",
      temperature: 0.1,
      max_completion_tokens: 2048,
    }),
    signal: AbortSignal.timeout(40_000),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 200);
    throw new Error(`groq ${response.status} ${detail}`);
  }
  const data = (await response.json()) as { choices?: Array<{ message?: GroqMessage }> };
  const message = data.choices?.[0]?.message;
  const raw = (message?.content ?? "").replace(/\u3010[^\u3011]*\u3011/g, "");

  // The reply holds search snippets first, then the answer: keep only the last FOUND block.
  const start = raw.lastIndexOf("FOUND:");
  // No verdict at all means the reply could not be read: report a failure, not "company not found".
  if (start < 0) throw new Error(`groq reply had no verdict: ${raw.replace(/\s+/g, " ").slice(-300)}`);
  const text = raw.slice(start);

  const chunks: Grounding["groundingChunks"] = [];
  for (const tool of message?.executed_tools ?? []) {
    for (const r of tool.search_results?.results ?? []) {
      if (r.url) chunks.push({ web: { uri: r.url, title: r.title } });
    }
  }
  // Sources are shown when Groq returns them; otherwise the model's own verdict is used.
  return parseCompanyReply(text, { groundingChunks: chunks }, false);
}

export async function researchCompany(company: string, roleTitle: string): Promise<CompanyResearch> {
  const groqKey = process.env.GROQ_API_KEY;
  if (process.env.COMPANY_SEARCH === "groq" && groqKey) return searchWithGroq(groqKey, company, roleTitle);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing");

  const errors: string[] = [];
  for (const model of COMPANY_MODELS) {
    try {
      return await searchWith(model, apiKey, company, roleTitle);
    } catch (error) {
      errors.push(String(error).replace(/\s+/g, " ").slice(0, 220));
      console.error("[company lookup]", errors[errors.length - 1]);
    }
  }
  throw new Error(errors.join(" || "));
}
