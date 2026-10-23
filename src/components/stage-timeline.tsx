import type { Stage } from "@/lib/types";
import { progressOf, sortStages } from "@/lib/progress";
import { formatDate } from "@/lib/format";
import { CheckIcon } from "@/components/icons";

export function StageTimeline({ stages }: { stages: Stage[] }) {
  const sorted = sortStages(stages);
  const { current } = progressOf(sorted);

  return (
    <ol className="relative">
      {sorted.map((stage, i) => {
        const isDone = stage.status === "done";
        const isCurrent = stage.id === current?.id;
        const isLast = i === sorted.length - 1;
        return (
          <li key={stage.id} className="relative flex gap-4 pb-7 last:pb-0" aria-current={isCurrent ? "step" : undefined}>
            {!isLast && (
              <span
                aria-hidden
                className={`absolute top-7 bottom-1 left-[11px] w-px ${isDone ? "bg-ink/70" : "bg-line"}`}
              />
            )}
            <span
              aria-hidden
              className={`relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${
                isDone
                  ? "bg-ink text-white"
                  : isCurrent
                    ? "bg-accent-tint ring-2 ring-accent"
                    : "bg-surface ring-1 ring-line-strong"
              }`}
            >
              {isDone ? <CheckIcon className="size-3" /> : isCurrent ? <span className="size-2 rounded-full bg-accent" /> : null}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className={`${isCurrent ? "font-medium text-ink" : isDone ? "text-ink" : "text-ink-faint"}`}>
                  {stage.name}
                </p>
                <p className="shrink-0 text-xs text-ink-faint">
                  {isDone && stage.completed_at
                    ? formatDate(stage.completed_at)
                    : stage.due_date
                      ? `Est. ${formatDate(stage.due_date)}`
                      : ""}
                </p>
              </div>
              {isCurrent && stage.status === "waiting_on_client" && (
                <p className="mt-1 text-xs font-medium text-accent-strong">Waiting on you</p>
              )}
              {isCurrent && stage.note && <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{stage.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
