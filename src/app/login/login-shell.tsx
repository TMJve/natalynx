import { Wordmark } from "@/components/brand";
import { EmailLinkSession } from "./email-link-session";
import { LoginForm } from "./login-form";

export function LoginShell({ linkError = false }: { linkError?: boolean }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col px-6 pt-16 pb-10">
      <Wordmark href="/login" />
      <div className="mt-16">
        <EmailLinkSession />
        <LoginForm linkError={linkError} />
      </div>
      <p className="mt-auto pt-16 text-xs text-ink-faint">Branding & identity design. This portal is for current clients.</p>
    </main>
  );
}
