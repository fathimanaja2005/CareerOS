"use client";

import { useEffect, useState } from "react";
import { getSupabase, isAuthConfigured } from "./supabase";

export type AuthUser = { id: string; email: string; name: string };

/** Who is signed in, if anyone. `configured` is false in guest-only deployments. */
export function useAuthUser(): { configured: boolean; user: AuthUser | null; ready: boolean } {
  const configured = isAuthConfigured();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(!configured);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    const apply = (session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null) => {
      if (!session) {
        setUser(null);
        return;
      }
      const meta = session.user.user_metadata ?? {};
      const name = typeof meta.full_name === "string" ? meta.full_name : typeof meta.name === "string" ? meta.name : "";
      setUser({ id: session.user.id, email: session.user.email ?? "", name });
    };
    sb.auth.getSession().then(({ data }) => {
      apply(data.session);
      setReady(true);
    });
    const { data } = sb.auth.onAuthStateChange((_event, session) => apply(session));
    return () => data.subscription.unsubscribe();
  }, []);

  return { configured, user, ready };
}

export async function signInWithGoogle(): Promise<void> {
  await getSupabase()?.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
}

export async function signOut(): Promise<void> {
  await getSupabase()?.auth.signOut();
}
