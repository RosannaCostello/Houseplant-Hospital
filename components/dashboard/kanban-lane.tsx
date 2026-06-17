import { Children, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PlantStatusLane } from "@/lib/plant-status";

type KanbanLaneProps = {
  lane: PlantStatusLane;
  count?: number;
  children?: ReactNode;
};

export function KanbanLane({ lane, count, children }: KanbanLaneProps) {
  const childCount = Children.count(children);
  const displayCount = count ?? childCount;
  const isEmpty = displayCount === 0;

  return (
    <section
      aria-label={`${lane.label} lane`}
      className={cn(
        "flex w-[min(100%,14rem)] shrink-0 snap-start flex-col rounded-xl border border-zinc-200 border-t-4 bg-white shadow-sm",
        lane.accentClass,
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2.5">
        <h2 className="text-sm font-semibold text-zinc-900">{lane.label}</h2>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium tabular-nums text-zinc-600">
          {displayCount}
        </span>
      </header>

      <div className="flex min-h-[calc(100dvh-14rem)] flex-1 flex-col gap-2 p-2 sm:min-h-[calc(100dvh-12rem)]">
        {children}
        {isEmpty ? (
          <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-200 px-3 py-8 text-center text-xs text-zinc-400">
            No plants
          </p>
        ) : null}
      </div>
    </section>
  );
}
