/** Matches `plant_status` enum in Supabase (`0001_init.sql`). */
export const PLANT_STATUSES = [
  "check_in",
  "propagation",
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
  { status: "propagation", label: "Propagation", accentClass: "border-t-hilda-bugs" },
  { status: "in_surgery", label: "In Surgery", accentClass: "border-t-hilda-coral" },
  { status: "outpatient", label: "Outpatient", accentClass: "border-t-hilda-text" },
  { status: "collected", label: "Collected", accentClass: "border-t-hilda-border/40" },
  { status: "dead", label: "Dead", accentClass: "border-t-hilda-text-muted" },
] as const;

const PLANT_STATUS_TRANSITIONS: Readonly<Record<PlantStatus, readonly PlantStatus[]>> = {
  check_in: ["quarantine", "in_surgery"],
  quarantine: ["in_surgery"],
  propagation: ["in_surgery"],
  in_surgery: ["outpatient", "dead"],
  outpatient: ["collected"],
  collected: [],
  dead: [],
};

export function plantStatusLabel(status: PlantStatus): string {
  return PLANT_STATUS_LANES.find((lane) => lane.status === status)?.label ?? status;
}

export function allowedPlantStatusTransitions(status: PlantStatus): readonly PlantStatus[] {
  return PLANT_STATUS_TRANSITIONS[status];
}

export function canTransitionPlantStatus(
  currentStatus: PlantStatus,
  newStatus: PlantStatus,
): boolean {
  return allowedPlantStatusTransitions(currentStatus).includes(newStatus);
}
