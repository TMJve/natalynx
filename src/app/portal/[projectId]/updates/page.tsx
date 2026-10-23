import type { Metadata } from "next";
import { Suspense } from "react";
import { requireViewer } from "@/lib/auth";
import { getProjectBundle, signImagePaths } from "@/lib/data";
import { formatRelative } from "@/lib/format";
import { PageSkeleton } from "@/components/skeleton";

export const metadata: Metadata = { title: "Updates" };

export default function UpdatesPage({ params }: PageProps<"/portal/[projectId]/updates">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Feed params={params} />
    </Suspense>
  );
}

async function Feed({ params }: { params: PageProps<"/portal/[projectId]/updates">["params"] }) {
  await requireViewer();
  const { projectId } = await params;
  const { updates } = await getProjectBundle(projectId);
  const images = await signImagePaths(updates.map((u) => u.image_path));

  return (
    <>
      <h1 className="font-serif text-4xl">Updates</h1>
      <p className="mt-2 text-ink-soft">Notes and work-in-progress from the studio.</p>
      {updates.length === 0 ? (
        <p className="card mt-8 text-ink-soft">No updates yet. The first one will land here soon.</p>
      ) : (
        <ol className="mt-8 space-y-4">
          {updates.map((u) => (
            <li key={u.id} className="card">
              <p className="text-xs text-ink-faint">{formatRelative(u.created_at)}</p>
              {u.image_path && images[u.image_path] && (
                <a href={images[u.image_path]} target="_blank" rel="noreferrer" className="mt-3 block">
                  {/* eslint-disable-next-line @next/next/no-img-element -- private, short-lived signed URL */}
                  <img src={images[u.image_path]} alt="" className="w-full rounded-xl bg-canvas object-cover" />
                </a>
              )}
              <p className="mt-3 leading-relaxed whitespace-pre-line">{u.body}</p>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
