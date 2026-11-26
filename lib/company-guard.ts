import { companySearchEnabled, researchCompany } from "./company.ts";

const cache = new Map<string, { unknown: boolean; at: number }>();
const TTL_MS = 60 * 60_000;

/**
 * Returns a warning message when web search finds no sign the company exists.
 * Returns null when it exists OR when the lookup itself fails, so an outage never blocks a user.
 */
export async function unknownCompanyError(company: string, roleTitle: string): Promise<string | null> {
  if (!companySearchEnabled()) return null;
  const key = company.trim().toLowerCase();
  const hit = cache.get(key);
  let unknown: boolean;

  if (hit && Date.now() - hit.at < TTL_MS) {
    unknown = hit.unknown;
  } else {
    try {
      unknown = !(await researchCompany(company, roleTitle)).found;
      cache.set(key, { unknown, at: Date.now() });
    } catch {
      return null;
    }
  }

  return unknown
    ? `We couldn't verify "${company}" online, so this is based only on the job description you pasted. Double-check the company name.`
    : null;
}
