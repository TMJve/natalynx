// Everything the client sees about "where are we" is calculated from the stored rows,
// so there is no second copy of the truth that could drift out of sync.
import type { Approval, Payment, Project, Stage } from "@/lib/types";

export type WaitingOn = "client" | "studio" | null;

export function sortStages(stages: Stage[]): Stage[] {
  return [...stages].sort((a, b) => a.position - b.position);
}

export function progressOf(stages: Stage[]) {
  const sorted = sortStages(stages);
  const done = sorted.filter((s) => s.status === "done").length;
  const current = sorted.find((s) => s.status !== "done") ?? null;
  return {
    done,
    total: sorted.length,
    percent: sorted.length ? Math.round((done / sorted.length) * 100) : 0,
    current,
    finished: sorted.length > 0 && current === null,
  };
}

export type PaymentState = "paid" | "due" | "upcoming";

export function paymentState(payment: Payment, stages: Stage[]): PaymentState {
  if (payment.paid_at) return "paid";
  const stage = stages.find((s) => s.id === payment.stage_id);
  return stage && stage.status !== "not_started" ? "due" : "upcoming";
}

export function revisionRounds(project: Project, approvals: Approval[]) {
  const used = approvals.filter((a) => a.status === "changes_requested").length;
  return { used, allowed: project.revision_rounds_allowed, exhausted: used >= project.revision_rounds_allowed };
}

export type NextStep = {
  title: string;
  detail: string | null;
  waitingOn: WaitingOn;
  date: string | null;
  href?: "approvals";
};

export function whatsNext(input: {
  stages: Stage[];
  payments: Payment[];
  approvals: Approval[];
}): NextStep {
  const { stages, payments, approvals } = input;

  // 1. Anything the client needs to review comes first: it's the quickest way to move forward.
  const pending = approvals
    .filter((a) => a.status === "pending")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (pending.length) {
    return {
      title: pending.length === 1 ? `Review “${pending[0].title}”` : `Review ${pending.length} items`,
      detail: "Approve it, or tell me what you'd like changed.",
      waitingOn: "client",
      date: null,
      href: "approvals",
    };
  }

  // 2. A payment that's due.
  const due = payments.find((p) => paymentState(p, stages) === "due");
  if (due) {
    return {
      title: due.kind === "deposit" ? "Deposit to get started" : "Final payment",
      detail:
        due.kind === "deposit"
          ? "Once the deposit is in, strategy work begins."
          : "Once the final payment is in, your files are handed over.",
      waitingOn: "client",
      date: due.due_date,
    };
  }

  // 3. Otherwise, whatever stage we're in.
  const { current } = progressOf(stages);
  if (!current) {
    return { title: "All wrapped up", detail: "Thank you. It was a joy.", waitingOn: null, date: null };
  }
  return {
    title: current.name,
    detail: current.note,
    waitingOn: current.status === "waiting_on_client" ? "client" : "studio",
    date: current.due_date,
  };
}
