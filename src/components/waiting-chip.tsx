import type { WaitingOn } from "@/lib/progress";

export function WaitingChip({ on, audience = "client" }: { on: WaitingOn; audience?: "client" | "admin" }) {
  if (!on) return null;
  const isClient = on === "client";
  const text =
    audience === "client" ? (isClient ? "Waiting on you" : "Nata is on it") : isClient ? "Waiting on client" : "Waiting on you";
  const loud = audience === "client" ? isClient : !isClient;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        loud ? "bg-accent-tint text-accent-strong" : "bg-canvas text-ink-soft"
      }`}
    >
      <span className={`size-1.5 rounded-full ${loud ? "bg-accent" : "bg-ink-faint"}`} />
      {text}
    </span>
  );
}
