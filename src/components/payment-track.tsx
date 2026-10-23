import type { Payment, Project, Stage } from "@/lib/types";
import { paymentState } from "@/lib/progress";
import { formatDate, formatMoney } from "@/lib/format";
import { CheckIcon } from "@/components/icons";

export function PaymentTrack({ project, payments, stages }: { project: Project; payments: Payment[]; stages: Stage[] }) {
  const ordered = [...payments].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "deposit" ? -1 : 1));
  const total = ordered.reduce((sum, p) => sum + p.amount_cents, 0);
  const paid = ordered.filter((p) => p.paid_at).reduce((sum, p) => sum + p.amount_cents, 0);
  const pct = total ? Math.round((paid / total) * 100) : 0;

  return (
    <section className="card" aria-label="Payments">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow">Payments</p>
        {total > 0 && (
          <p className="text-sm text-ink-soft">
            <span className="text-ink">{formatMoney(paid, project.currency)}</span> of {formatMoney(total, project.currency)} paid
          </p>
        )}
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
        <div className="h-full rounded-full bg-ink transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <ul className="mt-5 divide-y divide-line">
        {ordered.map((p) => {
          const state = paymentState(p, stages);
          const stage = stages.find((s) => s.id === p.stage_id);
          return (
            <li key={p.id} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
              <div>
                <p className="text-ink">{p.kind === "deposit" ? "Deposit" : "Final payment"}</p>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {state === "paid"
                    ? `Paid ${formatDate(p.paid_at)}`
                    : state === "due"
                      ? p.due_date
                        ? `Due ${formatDate(p.due_date)}`
                        : "Due now"
                      : `Due at ${stage?.name ?? "a later stage"}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular-nums text-ink">{formatMoney(p.amount_cents, project.currency)}</span>
                <PaymentBadge state={state} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PaymentBadge({ state }: { state: ReturnType<typeof paymentState> }) {
  if (state === "paid")
    return (
      <span className="grid size-6 place-items-center rounded-full bg-ink text-white" aria-label="Paid">
        <CheckIcon className="size-3" />
      </span>
    );
  if (state === "due")
    return <span className="rounded-full bg-accent-tint px-2.5 py-1 text-xs font-medium text-accent-strong">Due</span>;
  return <span className="rounded-full bg-canvas px-2.5 py-1 text-xs text-ink-faint">Later</span>;
}
