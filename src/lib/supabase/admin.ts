import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { SUPABASE_URL } from "@/lib/env";

// The secret key bypasses RLS entirely. It is used for exactly one thing in the app:
// creating a login for a new client. Never import this from a file that runs in the browser
// (the "server-only" import above makes the build fail if that happens).
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("Missing environment variable SUPABASE_SECRET_KEY. See README → Environment variables.");
  return createClient<Database>(SUPABASE_URL, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
