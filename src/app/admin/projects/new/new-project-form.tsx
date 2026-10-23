"use client";

import { useActionState } from "react";
import { createClientProject, type ActionResult } from "@/app/admin/actions";

export function NewProjectForm() {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createClientProject, {});

  return (
    <form action={action} className="space-y-8">
      <fieldset className="card space-y-4">
        <legend className="eyebrow float-left mb-2 w-full">Client</legend>
        <Field label="Email" name="email" type="email" required autoComplete="off" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" name="client_name" required />
          <Field label="Company (optional)" name="company" />
        </div>
        <p className="text-xs text-ink-faint">
          They&apos;ll get a sign-in email as soon as you create the project. Existing clients get the new project added.
        </p>
      </fieldset>

      <fieldset className="card space-y-4">
        <legend className="eyebrow float-left mb-2 w-full">Project</legend>
        <Field label="Project name" name="project_name" required />
        <div>
          <label className="label" htmlFor="summary">
            One-line summary (optional)
          </label>
          <textarea id="summary" name="summary" rows={2} maxLength={500} className="field resize-y" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Deposit" name="deposit" inputMode="decimal" placeholder="2500" />
          <Field label="Final payment" name="final" inputMode="decimal" placeholder="2500" />
          <Field label="Currency" name="currency" defaultValue="USD" maxLength={3} />
          <Field label="Revision rounds" name="revision_rounds" type="number" min={0} max={20} defaultValue="2" />
        </div>
      </fieldset>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full sm:w-auto">
        {pending ? "Creating…" : "Create project & send invite"}
      </button>
    </form>
  );
}

function Field({ label, name, ...rest }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} className="field" {...rest} />
    </div>
  );
}
