import Link from "next/link";
import { Suspense } from "react";
import { requireViewer } from "@/lib/auth";
import { getProjectBundle, signImagePaths } from "@/lib/data";
import { whatsNext } from "@/lib/progress";
import { formatDate, formatRelative } from "@/lib/format";
import { PageSkeleton } from "@/components/skeleton";
import { ProgressSummary } from "@/components/progress-summary";
import { StageTimeline } from "@/components/stage-timeline";
import { PaymentTrack } from "@/components/payment-track";
import { WaitingChip } from "@/components/waiting-chip";
import { ArrowRightIcon } from "@/components/icons";

export default function ProjectOverviewPage({ params }: PageProps<"/portal/[projectId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Overview params={params} />
    </Suspense>
  );
}

async function Overview({ params }: { params: PageProps<"/portal/[projectId]">["params"] }) {
  await requireViewer();
  const { projectId } = await params;
  const bundle = await getProjectBundle(projectId);
  const { project, stages, payments, approvals, updates } = bundle;
  const next = whatsNext({ stages, payments, approvals });
  const latest = updates[0];
  const images = await signImagePaths([latest?.image_path ?? null]);

  return (
    <div className="space-y-4">
      <header className="pb-4">
        <p className="eyebrow">Your project</p>
        <h1 className="mt-2 font-serif text-[2.75rem] leading-[1.05]">{project.name}</h1>
        {project.summary && <p className="mt-3 leading-relaxed text-ink-soft">{project.summary}</p>}
      </header>

      <ProgressSummary stages={stages} />

      <section className="card" aria-label="What's next">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">What&apos;s next</p>
          <WaitingChip on={next.waitingOn} />
        </div>
        <p className="mt-3 font-serif text-[1.75rem] leading-tight">{next.title}</p>
        {next.detail && <p className="mt-2 leading-relaxed text-ink-soft">{next.detail}</p>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          {next.date ? (
            <p className="text-sm text-ink-soft">
              Expected <span className="text-ink">{formatDate(next.date, { weekday: true })}</span>
            </p>
          ) : (
            <span />
          )}
          {next.href === "approvals" && (
            <Link href={`/portal/${project.id}/approvals`} className="btn-accent">
              Review now <ArrowRightIcon />
            </Link>
          )}
        </div>
      </section>

      <PaymentTrack project={project} payments={payments} stages={stages} />

      {latest && (
        <Link href={`/portal/${project.id}/updates`} className="card block hover:ring-line-strong">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow">Latest update</p>
            <p className="text-xs text-ink-faint">{formatRelative(latest.created_at)}</p>
          </div>
          {latest.image_path && images[latest.image_path] && (
            // eslint-disable-next-line @next/next/no-img-element -- private, short-lived signed URL
            <img
              src={images[latest.image_path]}
              alt=""
              className="mt-4 aspect-[4/3] w-full rounded-xl bg-canvas object-cover"
            />
          )}
          <p className="mt-3 line-clamp-3 leading-relaxed">{latest.body}</p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-ink-soft">
            All updates <ArrowRightIcon className="size-3.5" />
          </p>
        </Link>
      )}

      <section className="card" aria-label="Timeline">
        <p className="eyebrow mb-6">The journey</p>
        <StageTimeline stages={stages} />
      </section>
    </div>
  );
}
