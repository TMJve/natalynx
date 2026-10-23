"use server";

import { redirect } from "next/navigation";
import { createClient, createMailerClient } from "@/lib/supabase/server";

export type LoginState =
  | { step: "email"; error?: string }
  | { step: "code"; email: string; error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// One action for both steps, so the form works even before the page's JavaScript has loaded.
export async function login(prev: LoginState, formData: FormData): Promise<LoginState> {
  if (formData.get("intent") === "restart") return { step: "email" };
  return prev.step === "email" ? sendLoginEmail(formData) : verifyLoginCode(prev, formData);
}

async function sendLoginEmail(formData: FormData): Promise<LoginState> {
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
  return { step: "code", email };
}

async function verifyLoginCode(prev: Extract<LoginState, { step: "code" }>, formData: FormData): Promise<LoginState> {
  const token = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) {
    return { ...prev, error: "The code is the 6 digits from the email." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: prev.email, token, type: "email" });
  if (error) {
    return { ...prev, error: "That code didn't work. It may have expired, so request a new email." };
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
