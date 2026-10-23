import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Viewer = { id: string; email: string | null; isAdmin: boolean };

// One place that answers "who is this?" for a request. Cached per request, so calling it
// from several components only checks once. Pages use it to route people to the right place;
// the database still enforces what they can actually see.
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: admin } = await supabase.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  return { id: userId, email: (data.claims.email as string | undefined) ?? null, isAdmin: Boolean(admin) };
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!viewer.isAdmin) redirect("/portal");
  return viewer;
}

export async function requireClient(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (viewer.isAdmin) redirect("/admin");
  return viewer;
}
