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
  { status: "check_in", label: "Check-in", accentClass: "border-t-hilda-gold" },
  { status: "quarantine", label: "Quarantine", accentClass: "border-t-hilda-heading" },
  { status: "in_surgery", label: "In Surgery", accentClass: "border-t-hilda-coral" },
  { status: "outpatient", label: "Outpatient", accentClass: "border-t-hilda-text" },
  { status: "collected", label: "Collected", accentClass: "border-t-hilda-border/40" },
  { status: "dead", label: "Dead", accentClass: "border-t-hilda-text-muted" },
] as const;

export function plantStatusLabel(status: PlantStatus): string {
  return PLANT_STATUS_LANES.find((lane) => lane.status === status)?.label ?? status;
}
