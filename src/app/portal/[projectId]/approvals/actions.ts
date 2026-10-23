"use server";

import { refresh } from "next/cache";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type RespondState = { ok?: boolean; error?: string };

// All the real checks (is it yours? is it still open? is there a comment?) happen inside the
// database function, so they can't be skipped by calling this differently.
export async function respondToApproval(_prev: RespondState, formData: FormData): Promise<RespondState> {
  await requireClient();
  const approvalId = String(formData.get("approvalId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const comment = String(formData.get("comment") ?? "").slice(0, 2000);
  if (decision !== "approved" && decision !== "changes_requested") return { error: "Please choose an option." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_to_approval", {
    p_approval_id: approvalId,
    p_decision: decision,
    p_comment: comment,
  });
  if (error) {
    if (error.code === "22023") return { error: error.message };
    if (error.code === "55000") return { error: "This has already been answered." };
    return { error: "Something went wrong. Please try again." };
  }
  refresh();
  return { ok: true };
}
