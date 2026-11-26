import { NextResponse } from "next/server";
import { searchJobs } from "@/lib/jobs/search";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Looks up real, current job posts for a role. No AI call is made here.
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  const limit = checkRateLimit(`jobs:${getClientIp(request)}`);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many searches from this address. Please wait a few minutes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const role = (new URL(request.url).searchParams.get("role") ?? "").trim();
  if (role.length < 3) {
    return NextResponse.json({ error: "Enter a role title to search for." }, { status: 400 });
  }
  if (role.length > 120) {
    return NextResponse.json({ error: "That role title is too long." }, { status: 400 });
  }

  try {
    const { jobs, sources, relaxed } = await searchJobs(role);
    return NextResponse.json({ jobs, sources, relaxed });
  } catch {
    return NextResponse.json(
      { error: "Job search is unavailable right now. You can still paste job posts yourself." },
      { status: 502 },
    );
  }
}
