import type { Stage } from "@/lib/types";
import { progressOf, sortStages } from "@/lib/progress";

export function ProgressSummary({ stages }: { stages: Stage[] }) {
  const { percent, current, finished, total } = progressOf(stages);
  const sorted = sortStages(stages);

  return (
    <section className="card" aria-label="Progress">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Progress</p>
          <p className="mt-2 font-serif text-6xl leading-none">
            {percent}
            <span className="text-3xl text-ink-faint">%</span>
          </p>
        </div>
        <p className="pb-1 text-right text-sm text-ink-soft">
          {finished ? (
            "Complete"
          ) : current ? (
            <>
              Stage {current.position} of {total}
              <br />
              <span className="text-ink">{current.name}</span>
            </>
          ) : null}
        </p>
      </div>
      <div className="mt-6 flex gap-1" aria-hidden>
        {sorted.map((s) => (
          <span
            key={s.id}
            className={`h-1.5 flex-1 rounded-full ${
              s.status === "done" ? "bg-ink" : s.id === current?.id ? "bg-accent" : "bg-line"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
