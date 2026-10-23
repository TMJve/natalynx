import type { Metadata } from "next";
import { Suspense } from "react";
import { requireViewer } from "@/lib/auth";
import { getProjectBundle } from "@/lib/data";
import { formatBytes, formatDate } from "@/lib/format";
import { PageSkeleton } from "@/components/skeleton";
import { DownloadIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Files" };

export default function FilesPage({ params }: PageProps<"/portal/[projectId]/files">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Files params={params} />
    </Suspense>
  );
}

async function Files({ params }: { params: PageProps<"/portal/[projectId]/files">["params"] }) {
  await requireViewer();
  const { projectId } = await params;
  const { files } = await getProjectBundle(projectId);

  return (
    <>
      <h1 className="font-serif text-4xl">Files</h1>
      <p className="mt-2 text-ink-soft">Your final deliverables, ready to download.</p>
      {files.length === 0 ? (
        <p className="card mt-8 text-ink-soft">Final files arrive at handoff. They&apos;ll be waiting for you right here.</p>
      ) : (
        <ul className="card mt-8 divide-y divide-line p-0">
          {files.map((f) => (
            <li key={f.id}>
              {/* A plain link (not prefetched): each click asks the server for a fresh 60-second download link. */}
              <a
                href={`/portal/${projectId}/files/${f.id}`}
                className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-canvas/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-ink">{f.label}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {[formatBytes(f.size_bytes), formatDate(f.created_at)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-canvas text-ink">
                  <DownloadIcon />
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
