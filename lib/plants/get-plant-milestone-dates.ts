import type { PlantStatus } from "@/lib/plant-status";

export type PlantMilestoneDates = {
  quarantinedAt: string | null;
  surgeryAt: string | null;
  propagatedAt: string | null;
  outpatientAt: string | null;
  collectedAt: string | null;
};

const MILESTONE_STATUSES: PlantStatus[] = [
  "quarantine",
  "in_surgery",
  "propagation",
  "outpatient",
  "collected",
];

function milestoneKey(status: PlantStatus): keyof PlantMilestoneDates | null {
  switch (status) {
    case "quarantine":
      return "quarantinedAt";
    case "in_surgery":
      return "surgeryAt";
    case "propagation":
      return "propagatedAt";
    case "outpatient":
      return "outpatientAt";
    case "collected":
      return "collectedAt";
    default:
      return null;
  }
}

/** Earliest status_history timestamp per milestone status for one plant. */
export function buildPlantMilestoneDatesFromHistory(
  rows: Array<{ new_status: string; created_at: string }>,
): PlantMilestoneDates {
  const dates: PlantMilestoneDates = {
    quarantinedAt: null,
    surgeryAt: null,
    propagatedAt: null,
    outpatientAt: null,
    collectedAt: null,
  };

  const sorted = [...rows].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  for (const row of sorted) {
    const status = row.new_status as PlantStatus;
    if (!MILESTONE_STATUSES.includes(status)) continue;

    const key = milestoneKey(status);
    if (!key || dates[key]) continue;

    dates[key] = row.created_at;
  }

  return dates;
}

export function formatPlantMilestoneDate(at: string): string {
  return new Date(at).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
