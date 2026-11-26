import { getSupabase } from "./supabase";
import { mergeRecords } from "./merge";
import { readList, writeListLocal, type Application, type ScoreEntry } from "./history";

/** Copies scores and the job tracker between this browser and the signed-in account. Errors never break the app. */

type ScoreRow = { id: string; kind: string; label: string; score: number; at: number };
type AppRow = {
  id: string;
  company: string;
  role: string;
  url: string;
  status: string;
  notes: string;
  added_at: number;
  updated_at: number;
};

const toScoreRow = (s: ScoreEntry): ScoreRow => ({ id: s.id, kind: s.kind, label: s.label, score: s.score, at: s.at });
const fromScoreRow = (r: ScoreRow): ScoreEntry => ({ id: r.id, kind: r.kind as ScoreEntry["kind"], label: r.label, score: r.score, at: r.at });
const toAppRow = (a: Application): AppRow => ({
  id: a.id,
  company: a.company,
  role: a.role,
  url: a.url,
  status: a.status,
  notes: a.notes,
  added_at: a.addedAt,
  updated_at: a.updatedAt ?? a.addedAt,
});
const fromAppRow = (r: AppRow): Application => ({
  id: r.id,
  company: r.company,
  role: r.role,
  url: r.url,
  status: r.status as Application["status"],
  notes: r.notes,
  addedAt: r.added_at,
  updatedAt: r.updated_at,
});

/** Saves one list to the account and removes rows that were deleted on this device. */
export async function pushList(key: string, list: unknown[]): Promise<void> {
  const sb = getSupabase();
  if (!sb || (key !== "scores" && key !== "applications")) return;
  try {
    const { data } = await sb.auth.getSession();
    if (!data.session) return;

    const rows: Record<string, unknown>[] =
      key === "scores"
        ? (list as ScoreEntry[]).map(toScoreRow)
        : (list as Application[]).map(toAppRow);
    if (rows.length > 0) await sb.from(key).upsert(rows);

    const ids = (list as { id: string }[]).map((item) => item.id);
    const remove = sb.from(key).delete();
    if (ids.length > 0) await remove.not("id", "in", `(${ids.join(",")})`);
    else await remove.neq("id", "");
  } catch {
    // Offline or a server hiccup: the browser copy is still correct.
  }
}

/**
 * Copies the account's data down. "merge" is for the first sign-in on a device and keeps
 * anything saved as a guest; "replace" makes the account the source of truth afterwards.
 */
export async function pullAll(mode: "merge" | "replace"): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const [scores, apps] = await Promise.all([
      sb.from("scores").select("*"),
      sb.from("applications").select("*"),
    ]);
    if (scores.error || apps.error) return;

    const remoteScores = (scores.data as ScoreRow[]).map(fromScoreRow);
    const remoteApps = (apps.data as AppRow[]).map(fromAppRow);

    const nextScores =
      mode === "merge" ? mergeRecords(readList<ScoreEntry>("scores"), remoteScores) : remoteScores;
    const nextApps =
      mode === "merge" ? mergeRecords(readList<Application>("applications"), remoteApps) : remoteApps;

    nextScores.sort((a, b) => a.at - b.at);
    nextApps.sort((a, b) => b.addedAt - a.addedAt);

    writeListLocal("scores", nextScores.slice(-200));
    writeListLocal("applications", nextApps);

    if (mode === "merge") {
      await pushList("scores", nextScores.slice(-200));
      await pushList("applications", nextApps);
    }
  } catch {
    // Keep what is on this device.
  }
}

/** Deletes this person's rows from the account. Returns true when both deletes went through. */
export async function deleteCloudData(): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const [a, b] = await Promise.all([
      sb.from("scores").delete().neq("id", ""),
      sb.from("applications").delete().neq("id", ""),
    ]);
    return !a.error && !b.error;
  } catch {
    return false;
  }
}
