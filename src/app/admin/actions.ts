"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient, createMailerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StageStatus } from "@/lib/types";

export type ActionResult = { ok?: boolean; error?: string; message?: string };

const BUCKET = "project-files";
const STAGE_STATUSES: StageStatus[] = ["not_started", "in_progress", "waiting_on_client", "done"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// --- small helpers ----------------------------------------------------------

function text(fd: FormData, key: string, max = 2000): string {
  return String(fd.get(key) ?? "").trim().slice(0, max);
}
function optionalText(fd: FormData, key: string, max = 2000): string | null {
  return text(fd, key, max) || null;
}
function uuid(fd: FormData, key: string): string {
  const v = text(fd, key, 64);
  if (!UUID_RE.test(v)) throw new Error(`Invalid ${key}`);
  return v;
}
function optionalDate(fd: FormData, key: string): string | null {
  const v = text(fd, key, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}
function moneyToCents(value: string): number | null {
  const cleaned = value.replace(/[,\s$€£]/g, "");
  if (!cleaned) return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}
// Uploaded paths must live in this project's folder, in the expected sub-folder.
function ownedPath(path: string | null, projectId: string, folder: string): string | null {
  if (!path) return null;
  if (!path.startsWith(`${projectId}/${folder}/`) || path.includes("..")) throw new Error("Invalid file path");
  return path;
}
function failed(error: { message: string } | null, fallback = "Couldn't save. Please try again."): ActionResult {
  if (error) console.error(error);
  return { error: fallback };
}

async function sendSignInEmail(email: string) {
  const { error } = await createMailerClient().auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  return error;
}

// --- clients & projects -----------------------------------------------------

export async function createClientProject(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const email = text(fd, "email", 254).toLowerCase();
  const clientName = text(fd, "client_name", 120);
  const company = text(fd, "company", 120);
  const projectName = text(fd, "project_name", 120);
  const summary = text(fd, "summary", 500);
  const currency = (text(fd, "currency", 3) || "USD").toUpperCase();
  const rounds = Number(text(fd, "revision_rounds", 2) || 2);
  const deposit = moneyToCents(text(fd, "deposit", 20));
  const final = moneyToCents(text(fd, "final", 20));

  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email." };
  if (!clientName || !projectName) return { error: "Client name and project name are required." };
  if (deposit === null || final === null) return { error: "Amounts should look like 2500 or 2500.00." };
  if (!/^[A-Z]{3}$/.test(currency)) return { error: "Currency is a 3-letter code, like USD or EUR." };
  if (!Number.isInteger(rounds) || rounds < 0 || rounds > 20) return { error: "Revision rounds must be 0–20." };

  const supabase = await createClient();

  // Existing client? Give them another project. Otherwise create their login.
  const { data: existing } = await supabase.from("clients").select("id").eq("email", email).maybeSingle();
  let clientId = existing?.id;
  let createdLogin = false;
  if (!clientId) {
    const { data, error } = await createAdminClient().auth.admin.createUser({ email, email_confirm: true });
    if (error || !data.user) {
      return failed(error, "That email already has a login that isn't a client (is it your own?).");
    }
    clientId = data.user.id;
    createdLogin = true;
  }

  const { data: projectId, error } = await supabase.rpc("create_client_project", {
    p_client_id: clientId,
    p_email: email,
    p_client_name: clientName,
    p_company: company,
    p_project_name: projectName,
    p_summary: summary,
    p_deposit_cents: deposit,
    p_final_cents: final,
    p_currency: currency,
    p_revision_rounds: rounds,
  });
  if (error || !projectId) {
    if (createdLogin) await createAdminClient().auth.admin.deleteUser(clientId);
    return failed(error, "Couldn't create the project. Nothing was saved.");
  }

  const mailError = await sendSignInEmail(email);
  if (mailError) console.error(mailError);
  redirect(`/admin/projects/${projectId}?invite=${mailError ? "failed" : "sent"}`);
}

export async function resendInvite(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const clientId = uuid(fd, "client_id");
  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("email").eq("id", clientId).maybeSingle();
  if (!client) return { error: "Client not found." };
  const error = await sendSignInEmail(client.email);
  if (error) {
    return failed(error, error.status === 429 ? "Sent very recently. Wait a minute and try again." : "Couldn't send the email.");
  }
  return { ok: true, message: `Sign-in email sent to ${client.email}.` };
}

export async function updateProject(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const projectId = uuid(fd, "project_id");
  const rounds = Number(text(fd, "revision_rounds", 2));
  const name = text(fd, "name", 120);
  if (!name) return { error: "Project name is required." };
  if (!Number.isInteger(rounds) || rounds < 0 || rounds > 20) return { error: "Revision rounds must be 0–20." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ name, summary: optionalText(fd, "summary", 500), revision_rounds_allowed: rounds })
    .eq("id", projectId);
  if (error) return failed(error);
  refresh();
  return { ok: true };
}

// --- stages & payments ------------------------------------------------------

export async function updateStage(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const stageId = uuid(fd, "stage_id");
  const status = text(fd, "status", 32) as StageStatus;
  if (!STAGE_STATUSES.includes(status)) return { error: "Unknown status." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("stages")
    .update({ status, due_date: optionalDate(fd, "due_date"), note: optionalText(fd, "note", 280) })
    .eq("id", stageId);
  if (error) return failed(error);
  refresh();
  return { ok: true };
}

export async function updatePayment(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const paymentId = uuid(fd, "payment_id");
  const amount = moneyToCents(text(fd, "amount", 20));
  if (amount === null) return { error: "Amount should look like 2500 or 2500.00." };
  const paidOn = optionalDate(fd, "paid_on");

  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .update({
      amount_cents: amount,
      due_date: optionalDate(fd, "due_date"),
      // Noon UTC so the calendar day doesn't shift when shown in another time zone.
      paid_at: paidOn ? `${paidOn}T12:00:00Z` : null,
    })
    .eq("id", paymentId);
  if (error) return failed(error);
  refresh();
  return { ok: true };
}

// --- updates feed -----------------------------------------------------------

export async function postUpdate(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const projectId = uuid(fd, "project_id");
  const body = text(fd, "body", 2000);
  if (!body) return { error: "Write something first." };
  const imagePath = ownedPath(optionalText(fd, "storage_path", 500), projectId, "updates");

  const supabase = await createClient();
  const { error } = await supabase.from("updates").insert({ project_id: projectId, body, image_path: imagePath });
  if (error) return failed(error);
  refresh();
  return { ok: true };
}

export async function deleteUpdate(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("updates").delete().eq("id", uuid(fd, "id")).select("image_path").maybeSingle();
  if (error) return failed(error, "Couldn't delete.");
  if (data?.image_path) await supabase.storage.from(BUCKET).remove([data.image_path]);
  refresh();
  return { ok: true };
}

// --- approvals --------------------------------------------------------------

export async function createApproval(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const projectId = uuid(fd, "project_id");
  const title = text(fd, "title", 120);
  if (!title) return { error: "Give it a title." };
  const stageId = text(fd, "stage_id", 64);
  const imagePath = ownedPath(optionalText(fd, "storage_path", 500), projectId, "approvals");

  const supabase = await createClient();
  const { error } = await supabase.from("approvals").insert({
    project_id: projectId,
    title,
    description: optionalText(fd, "description", 2000),
    stage_id: UUID_RE.test(stageId) ? stageId : null,
    image_path: imagePath,
  });
  if (error) return failed(error);
  refresh();
  return { ok: true };
}

export async function deleteApproval(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("approvals")
    .delete()
    .eq("id", uuid(fd, "id"))
    .select("image_path")
    .maybeSingle();
  if (error) return failed(error, "Couldn't delete.");
  if (data?.image_path) await supabase.storage.from(BUCKET).remove([data.image_path]);
  refresh();
  return { ok: true };
}

// --- deliverable files ------------------------------------------------------

export async function addFile(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const projectId = uuid(fd, "project_id");
  const storagePath = ownedPath(optionalText(fd, "storage_path", 500), projectId, "deliverables");
  if (!storagePath) return { error: "Choose a file to upload." };
  const label = text(fd, "label", 200) || storagePath.split("/").pop()!.replace(/^[0-9a-f-]{36}-/, "");
  const size = Number(text(fd, "size_bytes", 20));

  const supabase = await createClient();
  const { error } = await supabase.from("files").insert({
    project_id: projectId,
    label,
    storage_path: storagePath,
    size_bytes: Number.isFinite(size) ? size : null,
    mime_type: optionalText(fd, "mime_type", 100),
  });
  if (error) return failed(error);
  refresh();
  return { ok: true };
}

export async function deleteFile(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("files").delete().eq("id", uuid(fd, "id")).select("storage_path").maybeSingle();
  if (error) return failed(error, "Couldn't delete.");
  if (data?.storage_path) await supabase.storage.from(BUCKET).remove([data.storage_path]);
  refresh();
  return { ok: true };
}
