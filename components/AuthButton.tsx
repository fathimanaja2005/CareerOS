"use client";

import { useEffect, useRef } from "react";
import { signInWithGoogle, signOut, useAuthUser } from "@/lib/auth";
import { pullAll, pushList } from "@/lib/cloud";
import { setSyncHook, writeListLocal } from "@/lib/history";

const SYNCED_KEY = "careeros:cloud-user";

/**
 * Header control for optional Google sign-in. Hidden when Supabase is not configured.
 * It also keeps this browser and the account in step while someone is signed in.
 * Only scores and the job tracker are saved to the account. The resume never is.
 */
export default function AuthButton() {
  const { configured, user, ready } = useAuthUser();
  const pulled = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      setSyncHook(null);
      pulled.current = null;
      return;
    }
    setSyncHook((key, list) => void pushList(key, list));
    if (pulled.current === user.id) return;
    pulled.current = user.id;

    // First sign-in on this device keeps guest data; later visits trust the account.
    let first = true;
    try {
      first = window.localStorage.getItem(SYNCED_KEY) !== user.id;
      window.localStorage.setItem(SYNCED_KEY, user.id);
    } catch {
      // Storage blocked: fall back to merging.
    }
    void pullAll(first ? "merge" : "replace");
  }, [user]);

  if (!configured || !ready) return null;

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => void signInWithGoogle()}
        className="flex items-center gap-2 border border-slate-300 bg-white px-3.5 py-1.5 text-[13px] font-medium text-slate-800 transition hover:border-slate-400"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
          <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
          <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9z" />
        </svg>
        Sign in with Google
      </button>
    );
  }

  const label = user.name || user.email;
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span className="hidden max-w-[10rem] truncate text-slate-600 sm:inline" title={user.email}>
        {label}
      </span>
      <button
        type="button"
        onClick={async () => {
          await signOut();
          // Their data is safe in the account, so clear this device (it may be shared).
          writeListLocal("scores", []);
          writeListLocal("applications", []);
          try {
            window.localStorage.removeItem(SYNCED_KEY);
          } catch {
            // Nothing to clear.
          }
        }}
        className="border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:border-slate-400"
      >
        Sign out
      </button>
    </div>
  );
}
