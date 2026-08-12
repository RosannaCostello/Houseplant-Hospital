"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { PlantCard } from "@/components/dashboard/plant-card";
import type { DashboardPlant } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

type PlantCardStackProps = {
  plants: DashboardPlant[];
  onSearchCustomer?: (email: string) => void;
};

const SWIPE_THRESHOLD_PX = 48;
const MAX_PEEK = 3;

export function PlantCardStack({ plants, onSearchCustomer }: PlantCardStackProps) {
  const [index, setIndex] = useState(0);
  const pointerStartX = useRef<number | null>(null);
  const capturing = useRef(false);
  const dragDx = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);

  if (plants.length === 0) return null;
  if (plants.length === 1) {
    return <PlantCard plant={plants[0]!} onSearchCustomer={onSearchCustomer} />;
  }

  const safeIndex = ((index % plants.length) + plants.length) % plants.length;
  const front = plants[safeIndex]!;

  function go(delta: number) {
    setIndex((current) => current + delta);
    setDragOffset(0);
    dragDx.current = 0;
    capturing.current = false;
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("button, a, input, textarea, select")) return;
    pointerStartX.current = event.clientX;
    dragDx.current = 0;
    capturing.current = false;
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointerStartX.current == null) return;
    const dx = event.clientX - pointerStartX.current;
    dragDx.current = dx;
    if (!capturing.current && Math.abs(dx) > 8) {
      capturing.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (capturing.current) {
      event.preventDefault();
      setDragOffset(dx);
    }
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointerStartX.current == null) return;
    const dx = dragDx.current;
    const wasCapturing = capturing.current;
    pointerStartX.current = null;
    if (wasCapturing) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }
    }
    capturing.current = false;

    if (wasCapturing && dx <= -SWIPE_THRESHOLD_PX) {
      go(1);
      return;
    }
    if (wasCapturing && dx >= SWIPE_THRESHOLD_PX) {
      go(-1);
      return;
    }
    setDragOffset(0);
    dragDx.current = 0;
  }

  const peekPlants = plants
    .map((plant, plantIndex) => ({ plant, plantIndex }))
    .filter(({ plantIndex }) => plantIndex !== safeIndex)
    .slice(0, MAX_PEEK);

  return (
    <div className="relative w-full">
      <div className="mb-1 flex items-center justify-end gap-1.5 px-0.5">
        <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 text-hilda-bugs" fill="currentColor">
          <rect x="1" y="1" width="6" height="6" rx="1" />
          <rect x="9" y="1" width="6" height="6" rx="1" />
          <rect x="1" y="9" width="6" height="6" rx="1" />
          <rect x="9" y="9" width="6" height="6" rx="1" />
        </svg>
        <span className="text-[11px] font-semibold text-hilda-bugs">
          {plants.length} plants · {safeIndex + 1}/{plants.length}
        </span>
      </div>

      <div
        className="relative"
        style={{ minHeight: "1px", touchAction: capturing.current || dragOffset !== 0 ? "none" : "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {peekPlants.map(({ plant }, peekIndex) => {
          const depth = peekIndex + 1;
          const rotate = depth % 2 === 0 ? -4 * depth : 5 * depth;
          const x = -6 * depth;
          const y = 4 * depth;
          return (
            <div
              key={plant.id}
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0"
              style={{
                zIndex: MAX_PEEK - depth,
                transform: `translate(${x}px, ${y}px) rotate(${rotate}deg)`,
              }}
            >
              <PlantCard plant={plant} draggableCard={false} className="opacity-90 shadow-md" />
            </div>
          );
        })}

        <div
          className={cn(
            "relative",
            dragOffset === 0 && "transition-transform duration-200 ease-out",
          )}
          style={{
            zIndex: MAX_PEEK + 1,
            transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.04}deg)`,
          }}
        >
          {/* Lane drag disabled in stacks so horizontal swipe works like iMessage photos. */}
          <PlantCard
            plant={front}
            draggableCard={false}
            onSearchCustomer={onSearchCustomer}
          />
        </div>
      </div>
    </div>
  );
}

/** Group same-visit plants in a lane into stackable batches. */
export function groupLanePlantsForStacking(
  plants: DashboardPlant[],
  stackingEnabled: boolean,
): Array<{ key: string; plants: DashboardPlant[] }> {
  if (!stackingEnabled) {
    return plants.map((plant) => ({ key: plant.id, plants: [plant] }));
  }

  const groups: Array<{ key: string; plants: DashboardPlant[] }> = [];
  const byVisit = new Map<string, DashboardPlant[]>();

  for (const plant of plants) {
    const list = byVisit.get(plant.visitId) ?? [];
    list.push(plant);
    byVisit.set(plant.visitId, list);
  }

  const seen = new Set<string>();
  for (const plant of plants) {
    if (seen.has(plant.visitId)) continue;
    seen.add(plant.visitId);
    const siblings = byVisit.get(plant.visitId) ?? [plant];
    groups.push({
      key: siblings.length > 1 ? `visit-${plant.visitId}` : plant.id,
      plants: siblings,
    });
  }

  return groups;
}
