"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { updatePlantStatusAction } from "@/app/actions/update-plant-status";
import {
  PLANT_STATUS_LANES,
  plantStatusLabel,
  type PlantStatus,
} from "@/lib/plant-status";
import { cn } from "@/lib/utils";

type PlantCardStatusMenuProps = {
  plantId: string;
  currentStatus: PlantStatus;
  className?: string;
};

function menuItemLabel(laneStatus: PlantStatus, currentStatus: PlantStatus, label: string): string {
  return laneStatus === currentStatus ? `In ${label}` : `Move to ${label}`;
}

export function PlantCardStatusMenu({
  plantId,
  currentStatus,
  className,
}: PlantCardStatusMenuProps) {
  const dialogTitleId = useId();
  const dialogDescriptionId = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      triggerRef.current?.focus();
    };
  }, [open]);

  function selectStatus(newStatus: PlantStatus) {
    setOpen(false);

    if (newStatus === currentStatus || isPending) return;

    setError(null);

    startTransition(async () => {
      const result = await updatePlantStatusAction(plantId, newStatus);

      if (!result.success) {
        setError(result.error);
      }
    });
  }

  return (
    <div
      className={cn("block", className)}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        className="flex w-full items-center justify-center rounded-none border border-hilda-border/15 bg-hilda-surface px-2.5 py-2 text-sm font-normal uppercase tracking-[0.08em] text-hilda-heading transition-colors hover:bg-hilda-bg disabled:opacity-50"
        disabled={isPending}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        Move
      </button>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <button
                type="button"
                className="absolute inset-0 bg-hilda-heading/40"
                aria-label="Close move options"
                onClick={() => setOpen(false)}
              />

              <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={dialogTitleId}
                aria-describedby={dialogDescriptionId}
                className="relative z-10 w-full max-w-sm border border-hilda-border/15 bg-hilda-surface shadow-xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="border-b border-hilda-border/10 px-4 py-3">
                  <h2 id={dialogTitleId} className="font-serif text-lg font-normal text-hilda-heading">
                    Move plant
                  </h2>
                  <p id={dialogDescriptionId} className="mt-1 text-sm text-hilda-text">
                    Currently in {plantStatusLabel(currentStatus)}
                  </p>
                </div>

                <div role="listbox" aria-label="Move to lane" className="max-h-[min(24rem,60dvh)] overflow-y-auto py-1">
                  {PLANT_STATUS_LANES.map((lane) => {
                    const isCurrent = lane.status === currentStatus;

                    return (
                      <button
                        key={lane.status}
                        type="button"
                        role="option"
                        aria-selected={isCurrent}
                        className={cn(
                          "flex min-h-11 w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm text-hilda-text hover:bg-hilda-bg",
                          isCurrent && "bg-hilda-bg font-medium text-hilda-heading",
                        )}
                        onClick={() => selectStatus(lane.status)}
                      >
                        <span>{menuItemLabel(lane.status, currentStatus, lane.label)}</span>
                        {isCurrent ? (
                          <svg
                            aria-hidden
                            className="h-4 w-4 shrink-0 text-hilda-heading"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-hilda-border/10 px-4 py-3">
                  <button
                    type="button"
                    className="w-full border border-hilda-border/20 bg-hilda-bg px-3 py-2 text-sm font-medium text-hilda-heading transition-colors hover:bg-hilda-surface"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {isPending ? (
        <span className="mt-1 block text-xs text-hilda-text-muted">Updating…</span>
      ) : null}
      {error ? <p className="mt-1 text-xs text-hilda-error-text">{error}</p> : null}
    </div>
  );
}
