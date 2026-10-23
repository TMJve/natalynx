import type { Metadata } from "next";
import { Suspense } from "react";
import { requireViewer } from "@/lib/auth";
import { getProjectBundle, signImagePaths } from "@/lib/data";
import { revisionRounds } from "@/lib/progress";
import { formatDate, formatRelative } from "@/lib/format";
import { PageSkeleton } from "@/components/skeleton";
import { CheckIcon } from "@/components/icons";
import type { Approval, Stage } from "@/lib/types";
import { RespondForm } from "./respond-form";

export const metadata: Metadata = { title: "Approvals" };

export default function ApprovalsPage({ params }: PageProps<"/portal/[projectId]/approvals">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Approvals params={params} />
    </Suspense>
  );
}

async function Approvals({ params }: { params: PageProps<"/portal/[projectId]/approvals">["params"] }) {
  const viewer = await requireViewer();
  const { projectId } = await params;
  const { project, approvals, stages } = await getProjectBundle(projectId);
  const rounds = revisionRounds(project, approvals);
  const images = await signImagePaths(approvals.map((a) => a.image_path));
  const pending = approvals.filter((a) => a.status === "pending");
  const answered = approvals.filter((a) => a.status !== "pending");

  return (
    <>
      <h1 className="font-serif text-4xl">Approvals</h1>
      <div className="mt-4 flex items-center gap-3">
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: Math.max(rounds.allowed, rounds.used) }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full ${
                i < rounds.used ? (i >= rounds.allowed ? "bg-accent" : "bg-ink") : "bg-line"
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-ink-soft">
          Revision rounds: <span className="text-ink">{rounds.used} of {rounds.allowed}</span> used
        </p>
      </div>

      <section className="mt-8 space-y-4" aria-label="Waiting for you">
        {pending.length === 0 ? (
          <p className="card text-ink-soft">Nothing needs your approval right now.</p>
        ) : (
          pending.map((a) => (
            <ApprovalCard key={a.id} approval={a} stages={stages} image={a.image_path ? images[a.image_path] : undefined}>
              {viewer.isAdmin ? (
                <p className="mt-5 rounded-xl bg-canvas px-4 py-3 text-sm text-ink-soft">
                  Preview: your client sees Approve / Request changes here.
                </p>
              ) : (
                <RespondForm approvalId={a.id} roundsUsed={rounds.used} roundsAllowed={rounds.allowed} />
              )}
            </ApprovalCard>
          ))
        )}
      </section>

      {answered.length > 0 && (
        <section className="mt-12" aria-label="History">
          <p className="eyebrow mb-4">History</p>
          <ul className="space-y-3">
            {answered.map((a) => (
              <li key={a.id} className="card py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-ink">{a.title}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">{formatDate(a.responded_at)}</p>
                  </div>
                  {a.status === "approved" ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-ink">
                      <CheckIcon className="size-3.5" /> Approved
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs font-medium text-accent-strong">Changes requested</span>
                  )}
                </div>
                {a.client_comment && (
                  <p className="mt-3 border-l-2 border-line pl-3 text-sm leading-relaxed whitespace-pre-line text-ink-soft">
                    {a.client_comment}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function ApprovalCard({
  approval,
  stages,
  image,
  children,
}: {
  approval: Approval;
  stages: Stage[];
  image?: string;
  children: React.ReactNode;
}) {
  const stage = stages.find((s) => s.id === approval.stage_id);
  return (
    <article className="card ring-accent/30">
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow text-accent-strong">Needs your approval</p>
        <p className="text-xs text-ink-faint">{formatRelative(approval.created_at)}</p>
      </div>
      <h2 className="mt-3 font-serif text-[1.75rem] leading-tight">{approval.title}</h2>
      {stage && <p className="mt-1 text-sm text-ink-faint">{stage.name}</p>}
      {image && (
        <a href={image} target="_blank" rel="noreferrer" className="mt-4 block">
          {/* eslint-disable-next-line @next/next/no-img-element -- private, short-lived signed URL */}
          <img src={image} alt="" className="w-full rounded-xl bg-canvas object-cover" />
        </a>
      )}
      {approval.description && (
        <p className="mt-4 leading-relaxed whitespace-pre-line text-ink-soft">{approval.description}</p>
      )}
      {children}
    </article>
  );
}
