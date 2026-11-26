/**
 * The one place to configure the model.
 * To switch providers later: change `provider`/`model` here and add a matching
 * case to `buildRequest` below. Nothing else in the app needs to change.
 */
export const LLM_CONFIG = {
  provider: "gemini" as "gemini",
  // gemini-2.5-flash is closed to new API keys (404); the full 3.x flash models
  // take 90s+ per analysis, which breaks Vercel's 60s function limit. Lite is fast (~5s).
  model: "gemini-3.5-flash-lite",
  temperature: 0.2, // low temperature = more consistent scores
  timeoutMs: 55_000,
  retries: 1, // retry once on network errors, timeouts, 429 and 5xx
  maxOutputTokens: 8192,
} as const;

/** An error that is safe to show to the user, with a separate technical detail. */
export class LlmError extends Error {
  readonly userMessage: string;
  readonly retryable: boolean;
  readonly status: number;

  constructor(userMessage: string, detail: string, retryable = false, status = 502) {
    super(detail);
    this.name = "LlmError";
    this.userMessage = userMessage;
    this.retryable = retryable;
    this.status = status;
  }
}

const FRIENDLY = {
  missingKey:
    "The AI service isn't configured yet. Add GEMINI_API_KEY to .env.local (or to your Vercel environment variables) and restart the app.",
  badKey:
    "The AI service rejected the API key. Check that GEMINI_API_KEY is valid and has access to the Gemini API.",
  rateLimit:
    "The AI service is receiving too many requests right now. Please wait a few seconds and try again.",
  timeout: "The AI service took too long to respond. Please try again.",
  unavailable: "The AI service is temporarily unavailable. Please try again.",
  blocked:
    "The AI service couldn't analyse this text. Remove anything unusual and try again.",
  empty: "The AI service returned an empty response. Please try again.",
};

/**
 * Call the model and return its raw text.
 * Retries once for transient failures; never logs the user's text.
 */
export async function callModel(systemPrompt: string, userInput: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new LlmError(FRIENDLY.missingKey, "GEMINI_API_KEY is missing or empty", false, 500);
  }

  let lastError: LlmError | undefined;

  for (let attempt = 0; attempt <= LLM_CONFIG.retries; attempt++) {
    try {
      return await requestOnce(systemPrompt, userInput, apiKey);
    } catch (error) {
      const llmError =
        error instanceof LlmError
          ? error
          : new LlmError(FRIENDLY.unavailable, String(error), true);

      lastError = llmError;
      if (!llmError.retryable || attempt === LLM_CONFIG.retries) break;

      // Small pause before the single retry.
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
  }

  throw lastError ?? new LlmError(FRIENDLY.unavailable, "Unknown model error", true);
}

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string; thought?: boolean }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
};

async function requestOnce(
  systemPrompt: string,
  userInput: string,
  apiKey: string,
): Promise<string> {
  const request = buildRequest(systemPrompt, userInput);

  let response: Response;
  try {
    response = await fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(request.body),
      signal: AbortSignal.timeout(LLM_CONFIG.timeoutMs),
      cache: "no-store",
    });
  } catch (error) {
    // AbortSignal.timeout() throws a TimeoutError; anything else here is a network failure.
    const isTimeout = error instanceof Error && error.name === "TimeoutError";
    throw new LlmError(
      isTimeout ? FRIENDLY.timeout : FRIENDLY.unavailable,
      isTimeout ? "Request timed out" : String(error),
      true,
      isTimeout ? 504 : 503,
    );
  }

  if (!response.ok) {
    const detail = await readErrorDetail(response);

    if (response.status === 429) {
      throw new LlmError(FRIENDLY.rateLimit, `429 ${detail}`, true, 429);
    }
    if (response.status === 401 || response.status === 403) {
      throw new LlmError(FRIENDLY.badKey, `${response.status} ${detail}`, false, 500);
    }
    if (response.status >= 500) {
      throw new LlmError(FRIENDLY.unavailable, `${response.status} ${detail}`, true, 503);
    }
    throw new LlmError(FRIENDLY.blocked, `${response.status} ${detail}`, false, 422);
  }

  const data = (await response.json().catch(() => null)) as GeminiResponse | null;
  if (!data) {
    throw new LlmError(FRIENDLY.unavailable, "Response was not valid JSON", true);
  }
  if (data.promptFeedback?.blockReason) {
    throw new LlmError(FRIENDLY.blocked, `Blocked: ${data.promptFeedback.blockReason}`, false);
  }

  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .filter((part) => part.text && !part.thought) // ignore internal "thinking" parts
    .map((part) => part.text)
    .join("")
    .trim();

  if (!text) {
    throw new LlmError(
      FRIENDLY.empty,
      `Empty response (finishReason: ${candidate?.finishReason ?? "unknown"})`,
      true,
    );
  }

  return text;
}

/** Provider-specific request. Add a case here to support another provider. */
function buildRequest(systemPrompt: string, userInput: string) {
  if (LLM_CONFIG.provider !== "gemini") {
    throw new LlmError(FRIENDLY.unavailable, `Unsupported provider: ${LLM_CONFIG.provider}`);
  }

  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${LLM_CONFIG.model}:generateContent`,
    headers: {
      "Content-Type": "application/json",
      // Key travels in a header, not the URL, so it stays out of request logs.
      "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
    },
    body: {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userInput }] }],
      generationConfig: {
        temperature: LLM_CONFIG.temperature,
        maxOutputTokens: LLM_CONFIG.maxOutputTokens,
        responseMimeType: "application/json",
      },
    },
  };
}

async function readErrorDetail(response: Response): Promise<string> {
  const body = await response.text().catch(() => "");
  return body.slice(0, 300);
}
