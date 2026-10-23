import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { getProjectBundle, signImagePaths } from "@/lib/data";
import { paymentState, progressOf, revisionRounds, whatsNext } from "@/lib/progress";
import { formatBytes, formatDate, formatMoney, formatRelative } from "@/lib/format";
import { STAGE_STATUS_LABEL, type StageStatus } from "@/lib/types";
import { PageSkeleton } from "@/components/skeleton";
import { WaitingChip } from "@/components/waiting-chip";
import { ActionForm } from "@/components/action-form";
import { IMAGE_TYPES, UploadForm } from "@/components/upload-form";
import { CheckIcon, DownloadIcon } from "@/components/icons";
import {
  addFile,
  createApproval,
  deleteApproval,
  deleteFile,
  deleteUpdate,
  postUpdate,
  resendInvite,
  updatePayment,
  updateProject,
  updateStage,
} from "@/app/admin/actions";

export const metadata: Metadata = { title: "Project" };

export default function AdminProjectPage(props: PageProps<"/admin/projects/[projectId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProjectAdmin {...props} />
    </Suspense>
  );
}

async function ProjectAdmin({ params, searchParams }: PageProps<"/admin/projects/[projectId]">) {
  await requireAdmin();
  const { projectId } = await params;
  const { invite } = await searchParams;
  const { project, client, stages, payments, updates, approvals, files } = await getProjectBundle(projectId);
  const progress = progressOf(stages);
  const next = whatsNext({ stages, payments, approvals });
  const rounds = revisionRounds(project, approvals);
  const images = await signImagePaths([...updates.map((u) => u.image_path), ...approvals.map((a) => a.image_path)]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-ink-soft hover:text-ink">
          ← All projects
        </Link>
        <h1 className="mt-4 font-serif text-[2.5rem] leading-tight">{project.name}</h1>
        <p className="mt-1 text-ink-soft">
          {client?.name}
          {client?.company ? ` · ${client.company}` : ""} · <span className="text-ink-faint">{client?.email}</span>
        </p>
      </div>

      {invite === "sent" && (
        <p className="rounded-xl bg-surface px-4 py-3 text-sm ring-1 ring-line">
          Project created. A sign-in email is on its way to {client?.email}.
        </p>
      )}
      {invite === "failed" && (
        <p className="rounded-xl bg-accent-tint px-4 py-3 text-sm text-accent-strong">
          Project created, but the invite email didn&apos;t send. Try “Resend sign-in email” below.
        </p>
      )}

      <section className="card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">The client sees</p>
          <WaitingChip on={next.waitingOn} />
        </div>
        <p className="font-serif text-2xl leading-tight">{next.title}</p>
        <p className="text-sm text-ink-soft">
          {progress.percent}% complete · Revision rounds {rounds.used} of {rounds.allowed} used
        </p>
        <Link href={`/portal/${project.id}`} className="inline-block text-sm text-ink underline underline-offset-4">
          Preview the client view
        </Link>
        {client && (
          <ActionForm action={resendInvite} submitLabel="Resend sign-in email" pendingLabel="Sending…" buttonClassName="btn-ghost">
            <input type="hidden" name="client_id" value={client.id} />
          </ActionForm>
        )}
      </section>

      <Section title="Stages" open>
        <ol className="divide-y divide-line">
          {stages.map((s) => (
            <li key={s.id} className="py-5 first:pt-0 last:pb-0">
              <div className="mb-3 flex items-center gap-3">
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] ${
                    s.status === "done"
                      ? "bg-ink text-white"
                      : s.id === progress.current?.id
                        ? "bg-accent text-white"
                        : "bg-canvas text-ink-soft"
                  }`}
                >
                  {s.status === "done" ? <CheckIcon className="size-3" /> : s.position}
                </span>
                <p className="font-medium">{s.name}</p>
              </div>
              <ActionForm action={updateStage} className="space-y-3" buttonClassName="btn-ghost min-h-9 px-4 text-xs">
                <input type="hidden" name="stage_id" value={s.id} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label" htmlFor={`status-${s.id}`}>
                      Status
                    </label>
                    <select id={`status-${s.id}`} name="status" defaultValue={s.status} className="field">
                      {(Object.keys(STAGE_STATUS_LABEL) as StageStatus[]).map((k) => (
                        <option key={k} value={k}>
                          {STAGE_STATUS_LABEL[k]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor={`due-${s.id}`}>
                      Due date
                    </label>
                    <input id={`due-${s.id}`} type="date" name="due_date" defaultValue={s.due_date ?? ""} className="field" />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor={`note-${s.id}`}>
                    Note for the client (shown while this is the current stage)
                  </label>
                  <textarea
                    id={`note-${s.id}`}
                    name="note"
                    rows={2}
                    maxLength={280}
                    defaultValue={s.note ?? ""}
                    className="field resize-y"
                  />
                </div>
              </ActionForm>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Payments">
        <div className="space-y-6">
          {[...payments]
            .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "deposit" ? -1 : 1))
            .map((p) => {
              const state = paymentState(p, stages);
              const stage = stages.find((s) => s.id === p.stage_id);
              return (
                <div key={p.id}>
                  <div className="mb-3 flex items-baseline justify-between">
                    <p className="font-medium">{p.kind === "deposit" ? "Deposit" : "Final payment"}</p>
                    <p className="text-xs text-ink-faint">
                      {state === "paid" ? `Paid ${formatDate(p.paid_at)}` : state === "due" ? "Due now" : `Due at ${stage?.name}`}
                    </p>
                  </div>
                  <ActionForm action={updatePayment} className="space-y-3" buttonClassName="btn-ghost min-h-9 px-4 text-xs">
                    <input type="hidden" name="payment_id" value={p.id} />
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="label" htmlFor={`amt-${p.id}`}>
                          Amount ({project.currency})
                        </label>
                        <input
                          id={`amt-${p.id}`}
                          name="amount"
                          inputMode="decimal"
                          defaultValue={(p.amount_cents / 100).toString()}
                          className="field"
                        />
                      </div>
                      <div>
                        <label className="label" htmlFor={`pdue-${p.id}`}>
                          Due date
                        </label>
                        <input id={`pdue-${p.id}`} type="date" name="due_date" defaultValue={p.due_date ?? ""} className="field" />
                      </div>
                      <div>
                        <label className="label" htmlFor={`paid-${p.id}`}>
                          Paid on
                        </label>
                        <input
                          id={`paid-${p.id}`}
                          type="date"
                          name="paid_on"
                          defaultValue={p.paid_at?.slice(0, 10) ?? ""}
                          className="field"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-ink-faint">
                      Set “Paid on” to mark it paid ({formatMoney(p.amount_cents, project.currency)}). Clear it to undo.
                    </p>
                  </ActionForm>
                </div>
              );
            })}
        </div>
      </Section>

      <Section title={`Updates (${updates.length})`}>
        <UploadForm action={postUpdate} projectId={project.id} folder="updates" accept={IMAGE_TYPES} submitLabel="Post update">
          <div>
            <label className="label" htmlFor="update-body">
              Update
            </label>
            <textarea id="update-body" name="body" rows={3} maxLength={2000} required className="field resize-y" />
          </div>
        </UploadForm>
        {updates.length > 0 && (
          <ul className="mt-6 divide-y divide-line border-t border-line">
            {updates.map((u) => (
              <li key={u.id} className="flex gap-4 py-4">
                {u.image_path && images[u.image_path] && (
                  // eslint-disable-next-line @next/next/no-img-element -- private, short-lived signed URL
                  <img src={images[u.image_path]} alt="" className="size-16 shrink-0 rounded-lg bg-canvas object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ink-faint">{formatRelative(u.created_at)}</p>
                  <p className="mt-1 line-clamp-3 text-sm whitespace-pre-line">{u.body}</p>
                </div>
                <DeleteButton action={deleteUpdate} id={u.id} what="this update" />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Approvals (${approvals.length})`}>
        <UploadForm
          action={createApproval}
          projectId={project.id}
          folder="approvals"
          accept={IMAGE_TYPES}
          submitLabel="Ask for approval"
        >
          <div>
            <label className="label" htmlFor="approval-title">
              What needs approving?
            </label>
            <input id="approval-title" name="title" required maxLength={120} className="field" placeholder="Concept directions, round 1" />
          </div>
          <div>
            <label className="label" htmlFor="approval-desc">
              Notes (optional)
            </label>
            <textarea id="approval-desc" name="description" rows={3} maxLength={2000} className="field resize-y" />
          </div>
          <div>
            <label className="label" htmlFor="approval-stage">
              Stage
            </label>
            <select id="approval-stage" name="stage_id" defaultValue={progress.current?.id ?? ""} className="field">
              <option value="">None</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.position}. {s.name}
                </option>
              ))}
            </select>
          </div>
        </UploadForm>
        {approvals.length > 0 && (
          <ul className="mt-6 divide-y divide-line border-t border-line">
            {approvals.map((a) => (
              <li key={a.id} className="flex gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <p className="text-ink">{a.title}</p>
                    <p
                      className={`text-xs font-medium ${
                        a.status === "pending" ? "text-ink-faint" : a.status === "approved" ? "text-ink" : "text-accent-strong"
                      }`}
                    >
                      {a.status === "pending" ? "Waiting on client" : a.status === "approved" ? "Approved" : "Changes requested"}
                      {a.responded_at ? ` · ${formatDate(a.responded_at)}` : ""}
                    </p>
                  </div>
                  {a.client_comment && (
                    <p className="mt-2 border-l-2 border-line pl-3 text-sm whitespace-pre-line text-ink-soft">{a.client_comment}</p>
                  )}
                </div>
                <DeleteButton action={deleteApproval} id={a.id} what="this approval request" />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Files (${files.length})`}>
        <UploadForm
          action={addFile}
          projectId={project.id}
          folder="deliverables"
          fileRequired
          fileLabel="File (PDF, ZIP, PNG, JPG, SVG, EPS · up to 50 MB)"
          submitLabel="Upload file"
        >
          <div>
            <label className="label" htmlFor="file-label">
              Label (optional)
            </label>
            <input id="file-label" name="label" maxLength={200} className="field" placeholder="Logo pack (all formats)" />
          </div>
        </UploadForm>
        {files.length > 0 && (
          <ul className="mt-6 divide-y divide-line border-t border-line">
            {files.map((f) => (
              <li key={f.id} className="flex items-center gap-4 py-4">
                <a href={`/portal/${project.id}/files/${f.id}`} className="flex min-w-0 flex-1 items-center gap-3 hover:text-accent-strong">
                  <DownloadIcon className="size-4 shrink-0 text-ink-faint" />
                  <span className="truncate">{f.label}</span>
                  <span className="shrink-0 text-xs text-ink-faint">{formatBytes(f.size_bytes)}</span>
                </a>
                <DeleteButton action={deleteFile} id={f.id} what="this file" />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Project settings">
        <ActionForm action={updateProject} className="space-y-4">
          <input type="hidden" name="project_id" value={project.id} />
          <div>
            <label className="label" htmlFor="p-name">
              Project name
            </label>
            <input id="p-name" name="name" required maxLength={120} defaultValue={project.name} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="p-summary">
              Summary
            </label>
            <textarea
              id="p-summary"
              name="summary"
              rows={2}
              maxLength={500}
              defaultValue={project.summary ?? ""}
              className="field resize-y"
            />
          </div>
          <div className="w-40">
            <label className="label" htmlFor="p-rounds">
              Revision rounds included
            </label>
            <input
              id="p-rounds"
              name="revision_rounds"
              type="number"
              min={0}
              max={20}
              defaultValue={project.revision_rounds_allowed}
              className="field"
            />
          </div>
        </ActionForm>
      </Section>
    </div>
  );
}

function Section({ title, open, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="card group">
      <summary className="flex cursor-pointer list-none items-center justify-between font-serif text-2xl [&::-webkit-details-marker]:hidden">
        {title}
        <span className="text-base text-ink-faint transition-transform group-open:rotate-45" aria-hidden>
          +
        </span>
      </summary>
      <div className="mt-6">{children}</div>
    </details>
  );
}

function DeleteButton({
  action,
  id,
  what,
}: {
  action: (fd: FormData) => Promise<{ ok?: boolean; error?: string }>;
  id: string;
  what: string;
}) {
  return (
    <ActionForm
      action={action}
      submitLabel="Delete"
      pendingLabel="…"
      confirm={`Delete ${what}? This can't be undone.`}
      buttonClassName="shrink-0 text-xs text-ink-faint hover:text-danger"
    >
      <input type="hidden" name="id" value={id} />
    </ActionForm>
  );
}
