import type { Metadata } from "next";
import { LoginShell } from "../login-shell";

export const metadata: Metadata = { title: "Sign in" };

// Where an expired or already-used email link lands.
export default function LinkExpiredPage() {
  return <LoginShell linkError />;
}
