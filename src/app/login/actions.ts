"use server";

import { redirect } from "next/navigation";
import { createClient, createMailerClient } from "@/lib/supabase/server";

export type LoginState =
  | { step: "email"; error?: string }
  | { step: "sent"; email: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (formData.get("intent") === "restart") return { step: "email" };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { step: "email", error: "Please enter a valid email address." };
  }

  // shouldCreateUser: false — only people the studio has invited can get a sign-in email.
  // We show the same message whether or not the email has an account, so this form can't be
  // used to find out who the studio's clients are.
  const { error } = await createMailerClient().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (error && error.status === 429) {
    return { step: "email", error: "Too many attempts. Please wait a minute and try again." };
  }
  return { step: "sent", email };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
