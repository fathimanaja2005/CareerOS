"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Progress history and the application tracker.
 * Everything lives in this browser's localStorage and is never sent anywhere.
 * Storage can be blocked, so every read and write is wrapped in try/catch.
 */
const PREFIX = "careeros:";
const EVENT = "careeros:list-changed";

export type ScoreKind = "profile" | "match" | "interview" | "report";

export type ScoreEntry = {
  id: string;
  kind: ScoreKind;
  /** Short label, for example the role or company. */
  label: string;
  /** 0 to 100. */
  score: number;
  at: number;
};

export const APP_STATUSES = ["Saved", "Applied", "Interview", "Offer", "Rejected"] as const;
export type AppStatus = (typeof APP_STATUSES)[number];

export type Application = {
  id: string;
  company: string;
  role: string;
  url: string;
  status: AppStatus;
  notes: string;
  addedAt: number;
  /** Used to pick the newer copy when an account and a device disagree. */
  updatedAt?: number;
};

export function readList<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** Writes a list to this browser only. Used when an account's data is copied down. */
export function writeListLocal<T>(key: string, list: T[]): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(list));
  } catch {
    // Storage blocked or full: the app keeps working without history.
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { key } }));
}

/** Set by the sign-in button while someone is signed in, so each save is also copied to their account. */
let syncHook: ((key: string, list: unknown[]) => void) | null = null;
export function setSyncHook(hook: ((key: string, list: unknown[]) => void) | null): void {
  syncHook = hook;
}

export function writeList<T>(key: string, list: T[]): void {
  writeListLocal(key, list);
  syncHook?.(key, list as unknown[]);
}

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** Records one score. Keeps the latest 200 entries. */
export function recordScore(kind: ScoreKind, label: string, score: number | null | undefined): void {
  if (typeof score !== "number" || !Number.isFinite(score)) return;
  const list = readList<ScoreEntry>("scores");
  list.push({ id: newId(), kind, label: label.slice(0, 80), score: Math.round(score), at: Date.now() });
  writeList("scores", list.slice(-200));
}

/** Adds a job to the tracker unless the same company and role is already there. */
export function addApplication(input: {
  company: string;
  role: string;
  url?: string;
  status?: AppStatus;
}): boolean {
  const list = readList<Application>("applications");
  const key = `${input.company}|${input.role}`.toLowerCase();
  if (list.some((item) => `${item.company}|${item.role}`.toLowerCase() === key)) return false;
  list.unshift({
    id: newId(),
    company: input.company.slice(0, 120),
    role: input.role.slice(0, 120),
    url: input.url ?? "",
    status: input.status ?? "Saved",
    notes: "",
    addedAt: Date.now(),
    updatedAt: Date.now(),
  });
  writeList("applications", list);
  return true;
}

/** A list kept in localStorage that stays in sync across tabs of the app. */
export function useStoredList<T>(key: string): [T[], (next: T[]) => void] {
  const [list, setList] = useState<T[]>([]);

  useEffect(() => {
    setList(readList<T>(key));
    function onChange(event: Event) {
      const detail = (event as CustomEvent<{ key: string }>).detail;
      if (detail?.key === key) setList(readList<T>(key));
    }
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, [key]);

  const update = useCallback(
    (next: T[]) => {
      setList(next);
      writeList(key, next);
    },
    [key],
  );

  return [list, update];
}

/** Lets any card switch the visible tab. */
const NAV_EVENT = "careeros:navigate";
export function navigateTo(tab: string): void {
  window.dispatchEvent(new CustomEvent(NAV_EVENT, { detail: { tab } }));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
export { NAV_EVENT };
