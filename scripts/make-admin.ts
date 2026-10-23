// Make an email address an admin (creates the login if needed).
// Usage: npm run make-admin -- you@yourstudio.com
// For production, run it with your production values in an env file:
//   node --env-file=.env.production.local --import tsx scripts/make-admin.ts you@yourstudio.com
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/database.types";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Usage: npm run make-admin -- you@yourstudio.com");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.");
  process.exit(1);
}
const db = createClient<Database>(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  let userId: string | undefined;
  const { data, error } = await db.auth.admin.createUser({ email: email!, email_confirm: true });
  if (data.user) userId = data.user.id;
  else if (error?.code === "email_exists") {
    for (let page = 1; !userId; page++) {
      const { data: list, error: e } = await db.auth.admin.listUsers({ page, perPage: 200 });
      if (e) throw e;
      userId = list.users.find((u) => u.email?.toLowerCase() === email)?.id;
      if (list.users.length < 200) break;
    }
  } else if (error) throw error;
  if (!userId) throw new Error("Couldn't find or create that user.");

  const { data: isClient } = await db.from("clients").select("id").eq("id", userId).maybeSingle();
  if (isClient) throw new Error("That email belongs to a client. Use a separate email for the admin.");

  const { error: insertError } = await db.from("admins").upsert({ user_id: userId });
  if (insertError) throw insertError;
  console.log(`${email} is now an admin. Sign in at /login.`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
