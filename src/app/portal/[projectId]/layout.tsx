import { Suspense } from "react";
import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { getProjectBundle } from "@/lib/data";
import { ProjectNav } from "./project-nav";

export default function ProjectLayout({ children, params }: LayoutProps<"/portal/[projectId]">) {
  return (
    <>
      <Suspense fallback={null}>
        <AdminPreviewBanner params={params} />
      </Suspense>
      <main className="mx-auto w-full max-w-2xl px-5 pt-6 pb-32 sm:px-6">{children}</main>
      <Suspense fallback={null}>
        <Nav params={params} />
      </Suspense>
    </>
  );
}

async function Nav({ params }: { params: LayoutProps<"/portal/[projectId]">["params"] }) {
  const { projectId } = await params;
  const { approvals } = await getProjectBundle(projectId);
  return <ProjectNav projectId={projectId} pendingApprovals={approvals.filter((a) => a.status === "pending").length} />;
}

async function AdminPreviewBanner({ params }: { params: LayoutProps<"/portal/[projectId]">["params"] }) {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return null;
  const { projectId } = await params;
  return (
    <div className="mx-auto mt-3 flex w-full max-w-2xl items-center justify-between gap-3 px-5 sm:px-6">
      <p className="text-xs text-ink-faint">Previewing the client view</p>
      <Link href={`/admin/projects/${projectId}`} className="text-xs text-ink underline underline-offset-4">
        Back to admin
      </Link>
    </div>
  );
}
