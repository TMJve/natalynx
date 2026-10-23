export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-2/3 animate-pulse rounded-xl bg-line/60" />
      <div className="h-36 animate-pulse rounded-[var(--radius-card)] bg-line/40" />
      <div className="h-28 animate-pulse rounded-[var(--radius-card)] bg-line/40" />
      <div className="h-48 animate-pulse rounded-[var(--radius-card)] bg-line/40" />
    </div>
  );
}
