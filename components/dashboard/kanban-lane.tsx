import { Children, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PlantStatusLane } from "@/lib/plant-status";

/** Fixed lane width — ~288px; comfortable for card text on iPad with horizontal scroll. */
const LANE_WIDTH_CLASS = "w-[18rem] min-w-[18rem] max-w-[18rem] basis-[18rem]";

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
        "flex h-full min-h-0 shrink-0 grow-0 snap-center flex-col rounded-none border border-hilda-border/15 border-b-0 border-t-4 bg-hilda-surface",
        LANE_WIDTH_CLASS,
        lane.accentClass,
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-hilda-border/10 px-3 py-2.5">
        <h2 className="font-serif text-sm font-normal leading-snug text-hilda-heading">{lane.label}</h2>
        <span className="shrink-0 rounded-none bg-hilda-bg px-2 py-0.5 text-xs font-medium tabular-nums text-hilda-text">
          {displayCount}
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-2.5 pb-[var(--bottom-nav-inset)] [-webkit-overflow-scrolling:touch]">
        <div className="space-y-2.5">{children}</div>
        {isEmpty ? (
          <p className="flex min-h-[12rem] items-center justify-center rounded-none border border-dashed border-hilda-border/20 px-3 py-8 text-center text-xs text-hilda-text-muted">
            No plants
          </p>
        ) : null}
      </div>
    </section>
  );
}
