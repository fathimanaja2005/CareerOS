import { NextResponse } from "next/server";
import { companySearchEnabled, researchCompany } from "@/lib/company";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Status check: open /api/company in the browser to see whether the lookup is on. */
export async function GET() {
  return NextResponse.json({
    lookupEnabled: companySearchEnabled(),
    companySearchSetting: process.env.COMPANY_SEARCH ?? null,
    groqKeyPresent: Boolean(process.env.GROQ_API_KEY),
    build: "company-off-v3",
  });
}

export async function POST(request: Request) {
  if (!companySearchEnabled()) return NextResponse.json({ disabled: true });

  const limit = checkRateLimit(getClientIp(request));
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a few minutes." }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const company = typeof body.company === "string" ? body.company.trim().slice(0, 120) : "";
  const roleTitle = typeof body.roleTitle === "string" ? body.roleTitle.trim().slice(0, 120) : "";
  if (!company) return NextResponse.json({ error: "Company name is required." }, { status: 400 });

  try {
    return NextResponse.json(await researchCompany(company, roleTitle));
  } catch {
    return NextResponse.json({ error: "Company lookup is unavailable right now." }, { status: 502 });
  }
}
