/** Pure helpers for combining a device's saved lists with the signed-in account's lists. */

export type Mergeable = { id: string; updatedAt?: number };

/**
 * Union of two lists by id. When both have the same id, the newer updatedAt wins
 * (a tie goes to the account copy). Used the first time someone signs in on a device,
 * so nothing they did as a guest is lost.
 */
export function mergeRecords<T extends Mergeable>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of remote) byId.set(item.id, item);
  for (const item of local) {
    const existing = byId.get(item.id);
    if (!existing || (item.updatedAt ?? 0) > (existing.updatedAt ?? 0)) byId.set(item.id, item);
  }
  return [...byId.values()];
}
