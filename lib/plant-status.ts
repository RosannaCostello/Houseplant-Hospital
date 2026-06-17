/** Matches `plant_status` enum in Supabase (`0001_init.sql`). */
export const PLANT_STATUSES = [
  "check_in",
  "in_surgery",
  "outpatient",
  "quarantine",
  "dead",
  "collected",
] as const;

export type PlantStatus = (typeof PLANT_STATUSES)[number];

export type PlantStatusLane = {
  status: PlantStatus;
  label: string;
  accentClass: string;
};

/** Kanban lane order per scope (Dashboard UX). */
export const PLANT_STATUS_LANES: readonly PlantStatusLane[] = [
  { status: "check_in", label: "Check-in", accentClass: "border-t-sky-500" },
  { status: "in_surgery", label: "In Surgery", accentClass: "border-t-amber-500" },
  { status: "outpatient", label: "Outpatient", accentClass: "border-t-emerald-500" },
  { status: "quarantine", label: "Quarantine", accentClass: "border-t-orange-500" },
  { status: "dead", label: "Dead", accentClass: "border-t-zinc-400" },
  { status: "collected", label: "Collected", accentClass: "border-t-zinc-600" },
] as const;

export function plantStatusLabel(status: PlantStatus): string {
  return PLANT_STATUS_LANES.find((lane) => lane.status === status)?.label ?? status;
}
