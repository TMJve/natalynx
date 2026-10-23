"use client";

import { useRef, useState, useTransition } from "react";
import type { ActionResult } from "@/app/admin/actions";

// A form that calls a server action and shows "Saved" or the error inline.
// Submitting via onSubmit (rather than <form action>) keeps the typed values in place
// after saving, instead of React resetting the form.
export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  pendingLabel = "Saving…",
  resetOnSuccess = false,
  confirm,
  className = "",
  buttonClassName = "btn-primary",
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  children?: React.ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
  className?: string;
  buttonClassName?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = await action(fd);
          setResult(res);
          if (res.ok && resetOnSuccess) formRef.current?.reset();
          if (res.ok) setTimeout(() => setResult((r) => (r === res ? null : r)), 2500);
        });
      }}
    >
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClassName}>
          {pending ? pendingLabel : submitLabel}
        </button>
        <FormStatus result={result} />
      </div>
    </form>
  );
}

export function FormStatus({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  if (result.error) return <p className="text-sm text-danger">{result.error}</p>;
  return <p className="text-sm text-ink-soft">{result.message ?? "Saved"}</p>;
}
