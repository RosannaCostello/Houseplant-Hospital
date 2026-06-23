"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const LANE_WIDTH_CLASS = "w-[18rem] min-w-[18rem] max-w-[18rem] basis-[18rem]";

type IncompleteCheckInsLaneProps = {
  count?: number;
  children?: ReactNode;
};

export function IncompleteCheckInsLane({ count = 0, children }: IncompleteCheckInsLaneProps) {
  const isEmpty = count === 0;

  return (
    <section
      aria-label="Incomplete check-ins lane"
      className={cn(
        "flex h-full min-h-0 shrink-0 grow-0 snap-center flex-col gap-2.5 overflow-visible",
        LANE_WIDTH_CLASS,
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 rounded-hilda border border-hilda-border/15 border-t-4 border-t-hilda-text-muted bg-hilda-surface px-3 py-2.5 shadow-sm">
        <h2 className="min-w-0 truncate font-serif text-sm font-normal leading-snug text-hilda-heading">
          Incomplete check-ins
        </h2>
        <span className="rounded-hilda-sm bg-hilda-bg px-2 py-0.5 text-xs font-medium tabular-nums text-hilda-text">
          {count}
        </span>
      </header>

      <div className="-mx-6 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 pb-[var(--bottom-nav-inset)] [overflow-clip-margin:1.5rem] [-webkit-overflow-scrolling:touch]">
        <div className="space-y-2.5">{children}</div>
        {isEmpty ? (
          <p className="flex min-h-[12rem] items-center justify-center rounded-hilda border border-dashed border-hilda-border/20 px-3 py-8 text-center text-xs text-hilda-text-muted">
            No incomplete check-ins
          </p>
        ) : null}
      </div>
    </section>
  );
}
