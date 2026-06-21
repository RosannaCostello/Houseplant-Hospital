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
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({ visibility: "hidden" });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !triggerRef.current) return;

    function positionMenu() {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const menuWidth = Math.max(rect.width, 220);
      const left = Math.min(rect.left, window.innerWidth - menuWidth - 8);
      const itemHeight = 44;
      const menuHeight = PLANT_STATUS_LANES.length * itemHeight + 8;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openAbove = spaceBelow < menuHeight && rect.top > menuHeight;

      setMenuStyle({
        position: "fixed",
        left: Math.max(8, left),
        width: menuWidth,
        top: openAbove ? rect.top - menuHeight - 4 : rect.bottom + 4,
        zIndex: 50,
        visibility: "visible",
      });
    }

    positionMenu();
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);

    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
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
        className="flex w-full items-center justify-between gap-2 rounded-none border border-hilda-border/15 bg-hilda-surface px-2.5 py-2 text-left text-sm font-medium text-hilda-heading disabled:opacity-50"
        disabled={isPending}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="truncate">In {plantStatusLabel(currentStatus)}</span>
        <svg
          aria-hidden
          className={cn("h-4 w-4 shrink-0 text-hilda-text-muted transition-transform", open && "rotate-180")}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              id={listboxId}
              role="listbox"
              aria-label="Move to lane"
              style={menuStyle}
              className="max-h-[min(24rem,calc(100dvh-2rem))] overflow-y-auto rounded-none border border-hilda-border/15 bg-hilda-surface py-1 shadow-lg"
            >
              {PLANT_STATUS_LANES.map((lane) => {
                const isCurrent = lane.status === currentStatus;

                return (
                  <button
                    key={lane.status}
                    type="button"
                    role="option"
                    aria-selected={isCurrent}
                    className={cn(
                      "flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm text-hilda-text hover:bg-hilda-bg",
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
            </div>,
            document.body,
          )
        : null}

      {isPending ? (
        <span className="mt-1 block text-xs text-hilda-text-muted">Updating…</span>
      ) : null}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
