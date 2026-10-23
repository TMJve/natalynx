"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm({ linkError }: { linkError?: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { step: "email" });

  if (state.step === "email") {
    return (
      <form action={action} className="space-y-5">
        <div>
          <h1 className="font-serif text-4xl leading-tight">Welcome back</h1>
          <p className="mt-2 text-ink-soft">Enter your email and I&apos;ll send you a link to your project.</p>
        </div>
        {linkError && !state.error && (
          <p className="rounded-xl bg-accent-tint px-4 py-3 text-sm text-accent-strong">
            That sign-in link has expired or was already used. Request a fresh one below.
          </p>
        )}
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            autoFocus
            className="field"
            placeholder="you@company.com"
          />
        </div>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Sending…" : "Email me a sign-in link"}
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <div>
        <h1 className="font-serif text-4xl leading-tight">Check your email</h1>
        <p className="mt-2 text-ink-soft">
          If <span className="text-ink">{state.email}</span> has a project with the studio, a sign-in link is on its way.
          Tap it to open your portal.
        </p>
        <p className="mt-3 text-sm text-ink-faint">
          The link works once and expires after 15 minutes. Nothing arrived? Check spam, or try again in a minute.
        </p>
      </div>
      <button
        type="submit"
        name="intent"
        value="restart"
        formNoValidate
        className="w-full text-sm text-ink-soft underline-offset-4 hover:underline"
      >
        Use a different email
      </button>
    </form>
  );
}
