import { Wordmark } from "@/components/brand";
import { signOut } from "@/app/login/actions";

export function SiteHeader({ home, children }: { home: string; children?: React.ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 pt-6 pb-2 sm:px-6">
      <Wordmark href={home} />
      <div className="flex items-center gap-4">
        {children}
        <form action={signOut}>
          <button className="text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline">Sign out</button>
        </form>
      </div>
    </header>
  );
}
