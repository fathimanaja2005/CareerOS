import { NextResponse } from "next/server";
import { LlmError } from "@/lib/llm";
import { postAgent } from "@/lib/agents/post";
import { runAgent } from "@/lib/agents/run";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FACTS = 12;
const MAX_FACT_LENGTH = 200;
const MAX_NOTE_LENGTH = 400;

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  const limit = checkRateLimit(getClientIp(request));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests from this address. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return bad("Invalid JSON body.");
  }
  const body = (typeof payload === "object" && payload !== null ? payload : {}) as Record<
    string,
    unknown
  >;

  const facts = Array.isArray(body.facts)
    ? body.facts
        .filter((fact): fact is string => typeof fact === "string")
        .map((fact) => fact.trim().slice(0, MAX_FACT_LENGTH))
        .filter(Boolean)
        .slice(0, MAX_FACTS)
    : [];
  const note = typeof body.note === "string" ? body.note.trim() : "";

  if (facts.length === 0) return bad("Run a Career report or a profile review first, so there is something to share.");
  if (note.length > MAX_NOTE_LENGTH) return bad(`Your note is limited to ${MAX_NOTE_LENGTH} characters.`);

  // Note: no part of the request text is logged or stored.
  try {
    const result = await runAgent(postAgent, { facts, note });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof LlmError
        ? error.userMessage
        : "The AI returned an unexpected format. Please try again.";
    const status = error instanceof LlmError ? error.status : 422;
    return NextResponse.json({ error: message }, { status });
  }
}
