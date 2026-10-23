import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { paymentState, progressOf, whatsNext } from "@/lib/progress";
import { formatDate, formatRelative, isPast, isWithinDays } from "@/lib/format";
import { PageSkeleton } from "@/components/skeleton";
import { WaitingChip } from "@/components/waiting-chip";
import { ArrowRightIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Dashboard" };

export default function AdminDashboard() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

type Attention = { key: string; projectId: string; projectName: string; title: string; detail: string; loud: boolean };

async function Dashboard() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("*, clients(name, company), stages(*), payments(*), approvals(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const attention: Attention[] = [];
  const rows = projects.map((p) => {
    const progress = progressOf(p.stages);
    const next = whatsNext({ stages: p.stages, payments: p.payments, approvals: p.approvals });
    const current = progress.current;

    // Client answered recently: you probably need to act on it.
    for (const a of p.approvals) {
      if (a.status !== "pending" && a.responded_at && isWithinDays(a.responded_at, 14)) {
        attention.push({
          key: `a-${a.id}`,
          projectId: p.id,
          projectName: p.name,
          title: a.status === "approved" ? `Approved: ${a.title}` : `Changes requested: ${a.title}`,
          detail: a.client_comment ? `“${a.client_comment}”` : formatRelative(a.responded_at),
          loud: a.status === "changes_requested",
        });
      }
    }
    // Your turn on the current stage.
    if (current && next.waitingOn === "studio" && !p.approvals.some((a) => a.status === "pending")) {
      const overdue = isPast(current.due_date);
      attention.push({
        key: `s-${current.id}`,
        projectId: p.id,
        projectName: p.name,
        title: current.name,
        detail: current.due_date ? `${overdue ? "Overdue since" : "Due"} ${formatDate(current.due_date)}` : "No due date set",
        loud: overdue,
      });
    }
    // Money that's due: mark it paid when it lands.
    for (const pay of p.payments) {
      if (paymentState(pay, p.stages) === "due") {
        attention.push({
          key: `p-${pay.id}`,
          projectId: p.id,
          projectName: p.name,
          title: `${pay.kind === "deposit" ? "Deposit" : "Final payment"} due`,
          detail: "Mark it paid once it arrives",
          loud: isPast(pay.due_date),
        });
      }
    }
    return { p, progress, next };
  });

  return (
    <>
      <h1 className="font-serif text-4xl">Studio</h1>

      <section className="mt-8" aria-label="Waiting on you">
        <p className="eyebrow mb-3">Waiting on you</p>
        {attention.length === 0 ? (
          <p className="card text-ink-soft">All clear. Nothing needs you right now.</p>
        ) : (
          <ul className="card divide-y divide-line p-0">
            {attention.map((item) => (
              <li key={item.key}>
                <Link href={`/admin/projects/${item.projectId}`} className="flex items-center gap-4 px-6 py-4 hover:bg-canvas/60">
                  <span className={`size-2 shrink-0 rounded-full ${item.loud ? "bg-accent" : "bg-ink-faint"}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-ink">{item.title}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-faint">
                      {item.projectName} · {item.detail}
                    </p>
                  </div>
                  <ArrowRightIcon className="size-4 shrink-0 text-ink-faint" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10" aria-label="All projects">
        <p className="eyebrow mb-3">All projects</p>
        {rows.length === 0 ? (
          <div className="card">
            <p className="text-ink-soft">No projects yet.</p>
            <Link href="/admin/projects/new" className="btn-primary mt-4">
              Create the first one
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map(({ p, progress, next }) => (
              <li key={p.id}>
                <Link href={`/admin/projects/${p.id}`} className="card block py-5 hover:ring-line-strong">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-serif text-2xl">{p.name}</p>
                      <p className="mt-0.5 truncate text-sm text-ink-faint">
                        {p.clients?.name}
                        {p.clients?.company ? ` · ${p.clients.company}` : ""}
                      </p>
                    </div>
                    <WaitingChip on={next.waitingOn} audience="admin" />
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
                      <div className="h-full rounded-full bg-ink" style={{ width: `${progress.percent}%` }} />
                    </div>
                    <p className="shrink-0 text-xs text-ink-soft tabular-nums">{progress.percent}%</p>
                  </div>
                  <p className="mt-2 text-sm text-ink-soft">
                    {progress.current ? `Stage ${progress.current.position} · ${progress.current.name}` : "Complete"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
