// Demo data: one admin, one client, one project halfway through.
// Run with `npm run seed` (local) — safe to re-run; it replaces the demo client's projects.
// Uses the secret key, so it bypasses RLS. Never point this at production with real clients.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/database.types";

const url = must("NEXT_PUBLIC_SUPABASE_URL");
const secret = must("SUPABASE_SECRET_KEY");
const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@natastudio.test").toLowerCase();
const clientEmail = (process.env.SEED_CLIENT_EMAIL ?? "client@example.com").toLowerCase();

const db = createClient<Database>(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const BUCKET = "project-files";

function must(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}. Run with --env-file=.env.local (npm run seed does this).`);
  return v;
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function timestampDaysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

async function ensureUser(email: string): Promise<string> {
  const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true });
  if (data.user) return data.user.id;
  if (error && error.code !== "email_exists") throw error;
  // Already exists: find it.
  for (let page = 1; ; page++) {
    const { data: list, error: listError } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (listError) throw listError;
    const found = list.users.find((u) => u.email?.toLowerCase() === email);
    if (found) return found.id;
    if (list.users.length < 200) throw new Error(`User ${email} exists but couldn't be found`);
  }
}

async function check<T extends { error: unknown }>(p: PromiseLike<T>): Promise<T> {
  const r = await p;
  if (r.error) throw r.error;
  return r;
}

async function main() {
  // Admin
  const adminId = await ensureUser(adminEmail);
  await check(db.from("admins").upsert({ user_id: adminId }));

  // Client
  const clientId = await ensureUser(clientEmail);
  await check(db.from("clients").upsert({ id: clientId, email: clientEmail, name: "Maya Ortiz", company: "Fern & Field" }));

  // Remove previous demo projects (and their stored files) so the seed is repeatable.
  const { data: old } = await check(db.from("projects").select("id").eq("client_id", clientId));
  for (const { id } of old ?? []) {
    for (const folder of ["updates", "approvals", "deliverables"]) {
      const { data: objects } = await db.storage.from(BUCKET).list(`${id}/${folder}`);
      if (objects?.length) await db.storage.from(BUCKET).remove(objects.map((o) => `${id}/${folder}/${o.name}`));
    }
    await check(db.from("projects").delete().eq("id", id));
  }

  // Project (the database trigger creates the 8 stages and 2 payments)
  const { data: project } = await check(
    db
      .from("projects")
      .insert({
        client_id: clientId,
        name: "Fern & Field identity",
        summary: "A warm, grounded brand identity for a farm-to-table café opening in spring.",
        revision_rounds_allowed: 2,
        currency: "USD",
      })
      .select()
      .single(),
  );
  const pid = project!.id;

  const { data: stages } = await check(db.from("stages").select("id, position").eq("project_id", pid).order("position"));
  const stageAt = (pos: number) => stages!.find((s) => s.position === pos)!.id;

  const plan: Record<number, { status: Database["public"]["Enums"]["stage_status"]; due: number; note?: string }> = {
    1: { status: "done", due: -34 },
    2: { status: "done", due: -27 },
    3: { status: "done", due: -12 },
    4: {
      status: "in_progress",
      due: 4,
      note: "Three directions are ready for you. Once you pick one, I'll take it into refinement.",
    },
    5: { status: "not_started", due: 14 },
    6: { status: "not_started", due: 24 },
    7: { status: "not_started", due: 31 },
    8: { status: "not_started", due: 60 },
  };
  for (const [pos, s] of Object.entries(plan)) {
    await check(
      db
        .from("stages")
        .update({ status: s.status, due_date: daysFromNow(s.due), note: s.note ?? null })
        .eq("id", stageAt(Number(pos))),
    );
  }
  // Backdate completion stamps so the timeline reads naturally.
  for (const [pos, ago] of [[1, 34], [2, 27], [3, 12]] as const) {
    await check(db.from("stages").update({ completed_at: timestampDaysAgo(ago) }).eq("id", stageAt(pos)));
  }

  await check(
    db.from("payments").update({ amount_cents: 300000, paid_at: timestampDaysAgo(26), due_date: daysFromNow(-28) })
      .eq("project_id", pid).eq("kind", "deposit"),
  );
  await check(
    db.from("payments").update({ amount_cents: 300000, due_date: daysFromNow(31) }).eq("project_id", pid).eq("kind", "final"),
  );

  // Images
  const upload = async (local: string, path: string, type: string) => {
    await check(
      db.storage.from(BUCKET).upload(path, readFileSync(join(import.meta.dirname, "seed-assets", local)), {
        contentType: type,
        upsert: true,
      }),
    );
    return path;
  };
  const moodboard = await upload("moodboard.svg", `${pid}/updates/moodboard.svg`, "image/svg+xml");
  const concepts = await upload("concepts.svg", `${pid}/approvals/concepts-round-1.svg`, "image/svg+xml");

  // Updates feed
  await check(
    db.from("updates").insert([
      {
        project_id: pid,
        body: "Welcome aboard! I've read through your discovery answers twice. The line about \"a kitchen that smells like a garden\" is going to guide a lot of this.",
        created_at: timestampDaysAgo(30),
      },
      {
        project_id: pid,
        body: "The moodboard is locked in. Earthy neutrals, one confident orange, and type with a bit of handmade warmth. Concepts start Monday.",
        image_path: moodboard,
        created_at: timestampDaysAgo(12),
      },
      {
        project_id: pid,
        body: "Concepts are in your Approvals tab. Take your time with them; it helps to look once, then again the next morning.",
        created_at: timestampDaysAgo(0),
      },
    ], { defaultToNull: false }),
  );

  // Approvals: one answered (moodboard), one waiting on the client (concepts)
  await check(
    db.from("approvals").insert([
      {
        project_id: pid,
        stage_id: stageAt(3),
        title: "Moodboard & strategy",
        description: "The direction we'll design toward.",
        status: "approved",
        client_comment: "Love it. The orange is exactly right.",
        responded_at: timestampDaysAgo(13),
        responded_by: clientId,
        created_at: timestampDaysAgo(15),
      },
      {
        project_id: pid,
        stage_id: stageAt(4),
        title: "Concept directions, round 1",
        description:
          "A · Sprout: friendly and organic.\nB · Arch: bold and modern, built for signage.\nC · Script: personal and handmade.\n\nApprove the one you'd like to refine, or tell me what to change.",
        image_path: concepts,
        created_at: timestampDaysAgo(0),
      },
    ], { defaultToNull: false }),
  );

  console.log(`
Seeded.
  Admin:  ${adminEmail}
  Client: ${clientEmail}  (project: ${project!.name})

Sign in at http://localhost:3000/login. Emails land in Mailpit: http://127.0.0.1:54324
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
