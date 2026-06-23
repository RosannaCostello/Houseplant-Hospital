"use client";

import { Children, type ReactNode } from "react";
import {
  dashboardLaneSortLabel,
  type DashboardLaneSortOrder,
} from "@/lib/dashboard/sort-dashboard-plants";
import { cn } from "@/lib/utils";
import type { PlantStatusLane } from "@/lib/plant-status";

/** Fixed lane width — ~288px; comfortable for card text on iPad with horizontal scroll. */
const LANE_WIDTH_CLASS = "w-[18rem] min-w-[18rem] max-w-[18rem] basis-[18rem]";

type KanbanLaneProps = {
  lane: PlantStatusLane;
  count?: number;
  sortOrder?: DashboardLaneSortOrder;
  onToggleSort?: () => void;
  children?: ReactNode;
};

export function KanbanLane({ lane, count, sortOrder, onToggleSort, children }: KanbanLaneProps) {
  const childCount = Children.count(children);
  const displayCount = count ?? childCount;
  const isEmpty = displayCount === 0;

  return (
    <section
      aria-label={`${lane.label} lane`}
      className={cn(
        "flex h-full min-h-0 shrink-0 grow-0 snap-center flex-col gap-2.5 overflow-visible",
        LANE_WIDTH_CLASS,
      )}
    >
      <header
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 rounded-hilda border border-hilda-border/15 border-t-4 bg-hilda-surface px-3 py-2.5 shadow-sm",
          lane.accentClass,
        )}
      >
        <h2 className="min-w-0 truncate font-serif text-sm font-normal leading-snug text-hilda-heading">
          {lane.label}
        </h2>
        <div className="flex shrink-0 items-center gap-1.5">
          {onToggleSort && sortOrder ? (
            <button
              type="button"
              className="rounded-hilda-sm border border-hilda-border/15 bg-hilda-bg px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-hilda-text transition-colors hover:bg-hilda-bg/80 hover:text-hilda-heading"
              aria-label={`Sort ${lane.label} lane: ${dashboardLaneSortLabel(sortOrder)} first. Activate to change order.`}
              onClick={onToggleSort}
            >
              {dashboardLaneSortLabel(sortOrder)}
            </button>
          ) : null}
          <span className="rounded-hilda-sm bg-hilda-bg px-2 py-0.5 text-xs font-medium tabular-nums text-hilda-text">
            {displayCount}
          </span>
        </div>
      </header>

      <div className="-mx-6 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 pb-[var(--bottom-nav-inset)] [overflow-clip-margin:1.5rem] [-webkit-overflow-scrolling:touch]">
        <div className="space-y-2.5">{children}</div>
        {isEmpty ? (
          <p className="flex min-h-[12rem] items-center justify-center rounded-hilda border border-dashed border-hilda-border/20 px-3 py-8 text-center text-xs text-hilda-text-muted">
            No plants
          </p>
        ) : null}
      </div>
    </section>
  );
}
