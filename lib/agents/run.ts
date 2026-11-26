import type { z } from "zod";
import { callModel, LlmError } from "@/lib/llm";

/**
 * The one runner every agent goes through.
 *
 * It handles the model call, JSON extraction, Zod validation with one retry,
 * and turns every failure into an LlmError whose `userMessage` is safe to show.
 * It never logs or stores the user's text.
 *
 * Adding an agent means writing a prompt, a Zod schema, an optional
 * postProcess (scoring) and a UI card — nothing in this file changes.
 */

export type AgentConfig<TInput, TOutput, TResult = TOutput> = {
  /** Short id, also used in error details ("profile", "match"). */
  id: string;
  systemPrompt: string;
  schema: z.ZodType<TOutput>;
  /** Builds the user message from the agent's own form fields. */
  buildUserInput: (input: TInput) => string;
  /** Optional: score, order and rename the validated output for the browser. */
  postProcess?: (output: TOutput, input: TInput) => TResult;
};

const INVALID_FORMAT_MESSAGE = "The AI returned an unexpected format. Please try again.";

const RETRY_SUFFIX =
  "Your previous reply was not valid JSON for the required schema. " +
  "Reply with ONLY the JSON object, no code fences and no commentary.";

export async function runAgent<TInput, TOutput, TResult = TOutput>(
  agent: AgentConfig<TInput, TOutput, TResult>,
  input: TInput,
): Promise<TResult> {
  const userInput = agent.buildUserInput(input);
  let lastError: unknown;

  // Two attempts total: the first reply, then one corrective retry.
  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = attempt === 0 ? userInput : `${userInput}\n\n${RETRY_SUFFIX}`;

    // callModel already retries transient network/429/5xx failures.
    const raw = await callModel(agent.systemPrompt, prompt);

    const json = extractJson(raw);
    if (json === null) {
      lastError = new Error("Model reply did not contain a JSON object");
      continue;
    }

    const parsed = agent.schema.safeParse(json);
    if (!parsed.success) {
      lastError = parsed.error;
      continue;
    }

    return agent.postProcess
      ? agent.postProcess(parsed.data, input)
      : (parsed.data as unknown as TResult);
  }

  // Only the error summary is kept — never the model output or the user's text.
  throw new LlmError(
    INVALID_FORMAT_MESSAGE,
    `Agent "${agent.id}" failed validation: ${String(lastError).slice(0, 300)}`,
    false,
    422,
  );
}

/** Pull the JSON object out of a reply, tolerating stray code fences. */
export function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}
