"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "working" | "failed";

// Supabase's default sign-in email (used until a custom email service is set up) sends people
// back with the session in the address fragment: /login#access_token=…&refresh_token=….
// This picks it up, saves it as a cookie session, and wipes the tokens from the address bar.
// setSession checks the tokens with Supabase, so a made-up token is rejected.
export function EmailLinkSession() {
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    // Remove tokens from the URL and browser history right away.
    window.history.replaceState(null, "", window.location.pathname);

    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    async function signIn(): Promise<Status> {
      if (params.get("error") || !access_token || !refresh_token) return params.get("error") ? "failed" : "idle";
      setStatus("working");
      const { error } = await createClient().auth.setSession({ access_token, refresh_token });
      if (error) return "failed";
      window.location.replace("/");
      return "working";
    }
    signIn().then(setStatus);
  }, []);

  if (status === "working") {
    return <p className="mb-6 rounded-xl bg-surface px-4 py-3 text-sm text-ink-soft ring-1 ring-line">Signing you in…</p>;
  }
  if (status === "failed") {
    return (
      <p className="mb-6 rounded-xl bg-accent-tint px-4 py-3 text-sm text-accent-strong">
        That sign-in link has expired or was already used. Request a fresh one below.
      </p>
    );
  }
  return null;
}
