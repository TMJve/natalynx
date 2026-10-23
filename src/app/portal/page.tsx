import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { getMyProjects } from "@/lib/data";
import { PageSkeleton } from "@/components/skeleton";
import { ArrowRightIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Your projects" };

export default function PortalHome() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-8 pb-16 sm:px-6">
      <Suspense fallback={<PageSkeleton />}>
        <ProjectList />
      </Suspense>
    </main>
  );
}

async function ProjectList() {
  await requireClient();
  const projects = await getMyProjects();
  if (projects.length === 1) redirect(`/portal/${projects[0].id}`);

  if (!projects.length) {
    return (
      <div className="pt-10">
        <h1 className="font-serif text-4xl">Nothing here yet</h1>
        <p className="mt-3 text-ink-soft">Your project will show up here as soon as it&apos;s set up.</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="font-serif text-4xl">Your projects</h1>
      <ul className="mt-8 space-y-3">
        {projects.map((p) => {
          const stages = [...p.stages].sort((a, b) => a.position - b.position);
          const done = stages.filter((s) => s.status === "done").length;
          const current = stages.find((s) => s.status !== "done");
          return (
            <li key={p.id}>
              <Link href={`/portal/${p.id}`} className="card flex items-center justify-between gap-4 hover:ring-line-strong">
                <div>
                  <p className="font-serif text-2xl">{p.name}</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {current ? current.name : "Complete"} · {Math.round((done / (stages.length || 1)) * 100)}%
                  </p>
                </div>
                <ArrowRightIcon className="size-5 text-ink-faint" />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
