// Print a one-time sign-in link without sending an email (handy while the built-in email sender
// is rate-limited). Usage: npm run login-link -- you@yourstudio.com
// The link signs whoever opens it in as that person, works once, and expires in 15 minutes.
// Treat it like a password: open it yourself, don't paste it anywhere.
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!email || !url || !secret) {
  console.error("Usage: npm run login-link -- you@yourstudio.com  (needs .env.production.local)");
  process.exit(1);
}

const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  // generateLink would silently create an account for an unknown email, so check first.
  let exists = false;
  for (let page = 1; !exists; page++) {
    const { data: list, error: listError } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (listError) throw listError;
    exists = list.users.some((u) => u.email?.toLowerCase() === email);
    if (list.users.length < 200) break;
  }
  if (!exists) {
    console.error(`No account for ${email}. Check the spelling.`);
    process.exit(1);
  }

  const { data, error } = await db.auth.admin.generateLink({ type: "magiclink", email: email! });
  if (error || !data.properties?.action_link) {
    console.error(error?.message ?? "Couldn't create a link. Does this email have an account?");
    process.exit(1);
  }
  console.log(`\nOne-time sign-in link for ${email} (expires in 15 minutes):\n\n${data.properties.action_link}\n`);
}

main();
