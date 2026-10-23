import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Approval, Client, FileRow, Payment, Project, Stage, Update } from "@/lib/types";

// All reads go through the signed-in user's own session, so RLS decides what comes back.
// A client asking for someone else's project id simply gets nothing, and we show a 404.

export type ProjectBundle = {
  project: Project;
  client: Client | null;
  stages: Stage[];
  payments: Payment[];
  updates: Update[];
  approvals: Approval[];
  files: FileRow[];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getProjectBundle = cache(async (projectId: string): Promise<ProjectBundle> => {
  if (!UUID_RE.test(projectId)) notFound();
  const supabase = await createClient();

  const { data: project, error } = await supabase.from("projects").select("*").eq("id", projectId).maybeSingle();
  if (error) throw error;
  if (!project) notFound();

  const [client, stages, payments, updates, approvals, files] = await Promise.all([
    supabase.from("clients").select("*").eq("id", project.client_id).maybeSingle(),
    supabase.from("stages").select("*").eq("project_id", projectId).order("position"),
    supabase.from("payments").select("*").eq("project_id", projectId).order("kind"),
    supabase.from("updates").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("approvals").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("files").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
  ]);
  for (const r of [client, stages, payments, updates, approvals, files]) if (r.error) throw r.error;

  return {
    project,
    client: client.data,
    stages: stages.data ?? [],
    payments: payments.data ?? [],
    updates: updates.data ?? [],
    approvals: approvals.data ?? [],
    files: files.data ?? [],
  };
});

export async function getMyProjects() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, summary, created_at, stages(position, name, status)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// Signed URLs are temporary links to private files. Images shown on a page get 10 minutes.
export async function signImagePaths(paths: (string | null)[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (!unique.length) return {};
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("project-files").createSignedUrls(unique, 600);
  if (error) throw error;
  const out: Record<string, string> = {};
  for (const item of data) if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  return out;
}
