"use client";

import { useState } from "react";
import { PlantCard } from "@/components/dashboard/plant-card";
import type { DashboardPlant } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

type PlantCardStackProps = {
  plants: DashboardPlant[];
  onSearchCustomer?: (email: string) => void;
};

const MAX_PEEK = 3;

function StackArrowButton({
  direction,
  onClick,
  label,
}: {
  direction: "left" | "right";
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "absolute top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full",
        "border border-hilda-border/20 bg-hilda-surface/90 text-hilda-heading shadow-sm",
        "hover:bg-hilda-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hilda-gold",
        direction === "left" ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2",
      )}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
        {direction === "left" ? (
          <path d="M10 3 5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  );
}

export function PlantCardStack({ plants, onSearchCustomer }: PlantCardStackProps) {
  const [index, setIndex] = useState(0);

  if (plants.length === 0) return null;
  if (plants.length === 1) {
    return <PlantCard plant={plants[0]!} onSearchCustomer={onSearchCustomer} />;
  }

  const safeIndex = ((index % plants.length) + plants.length) % plants.length;
  const front = plants[safeIndex]!;

  function go(delta: number) {
    setIndex((current) => current + delta);
  }

  const peekPlants = plants
    .map((plant, plantIndex) => ({ plant, plantIndex }))
    .filter(({ plantIndex }) => plantIndex !== safeIndex)
    .slice(0, MAX_PEEK);

  return (
    <div className="relative w-full px-5">
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

      <div className="relative">
        <StackArrowButton
          direction="left"
          label="Previous plant in stack"
          onClick={() => go(-1)}
        />
        <StackArrowButton
          direction="right"
          label="Next plant in stack"
          onClick={() => go(1)}
        />

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

        <div className="relative" style={{ zIndex: MAX_PEEK + 1 }}>
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
