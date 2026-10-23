"use client";

import { useActionState, useState } from "react";
import { respondToApproval, type RespondState } from "./actions";

export function RespondForm({
  approvalId,
  roundsUsed,
  roundsAllowed,
}: {
  approvalId: string;
  roundsUsed: number;
  roundsAllowed: number;
}) {
  const [state, action, pending] = useActionState<RespondState, FormData>(respondToApproval, {});
  const [mode, setMode] = useState<"choose" | "changes">("choose");
  const extraRound = roundsUsed >= roundsAllowed;

  if (mode === "changes") {
    return (
      <form action={action} className="mt-5 space-y-3">
        <input type="hidden" name="approvalId" value={approvalId} />
        <input type="hidden" name="decision" value="changes_requested" />
        <label htmlFor={`comment-${approvalId}`} className="label">
          What would you like changed?
        </label>
        <textarea
          id={`comment-${approvalId}`}
          name="comment"
          required
          rows={4}
          maxLength={2000}
          autoFocus
          className="field resize-y"
          placeholder="Be as specific as you can: what's working, what isn't, and why."
        />
        <p className={`text-xs ${extraRound ? "text-accent-strong" : "text-ink-faint"}`}>
          {extraRound
            ? `You've used all ${roundsAllowed} included revision rounds, so this will be an extra round. We'll talk about it before work starts.`
            : `This uses revision round ${roundsUsed + 1} of ${roundsAllowed}.`}
        </p>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="btn-primary flex-1">
            {pending ? "Sending…" : "Send feedback"}
          </button>
          <button type="button" onClick={() => setMode("choose")} className="btn-ghost">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <form action={action} className="mt-5">
      <input type="hidden" name="approvalId" value={approvalId} />
      <input type="hidden" name="decision" value="approved" />
      {state.error && <p className="mb-3 text-sm text-danger">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-accent flex-1">
          {pending ? "Saving…" : "Approve"}
        </button>
        <button type="button" onClick={() => setMode("changes")} className="btn-ghost flex-1">
          Request changes
        </button>
      </div>
    </form>
  );
}
