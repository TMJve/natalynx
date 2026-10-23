import { Suspense } from "react";
import { Wordmark } from "@/components/brand";
import { signOut } from "@/app/login/actions";
import { getViewer } from "@/lib/auth";

export function SiteHeader({ home, children }: { home: string; children?: React.ReactNode }) {
  return (
    <header className="mx-auto w-full max-w-2xl px-5 pt-6 pb-2 sm:px-6">
      <div className="flex items-center justify-between">
        <Wordmark href={home} />
        <div className="flex items-center gap-4">
          {children}
          <form action={signOut}>
            <button className="text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline">Sign out</button>
          </form>
        </div>
      </div>
      <Suspense fallback={null}>
        <SignedInAs />
      </Suspense>
    </header>
  );
}

// One browser holds one login, so make it obvious which account this is.
async function SignedInAs() {
  const viewer = await getViewer();
  if (!viewer?.email) return null;
  return (
    <p className="mt-2 text-right text-xs text-ink-faint">
      Signed in as <span className="text-ink-soft">{viewer.email}</span>
      {viewer.isAdmin ? " · admin" : ""}
    </p>
  );
}
