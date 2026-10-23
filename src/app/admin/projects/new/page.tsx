import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { NewProjectForm } from "./new-project-form";

export const metadata: Metadata = { title: "New project" };

export default function NewProjectPage() {
  return (
    <>
      <h1 className="font-serif text-4xl">New project</h1>
      <p className="mt-2 text-ink-soft">The 8 stages and both payments are set up automatically.</p>
      <div className="mt-8">
        <Suspense>
          <AdminOnly>
            <NewProjectForm />
          </AdminOnly>
        </Suspense>
      </div>
    </>
  );
}

async function AdminOnly({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}
