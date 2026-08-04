import "server-only";

import { getEnv } from "@/lib/env";
import type { PrintJobPayload } from "@/lib/printing/types";

export type PlantPrintSource = {
  id: string;
  name: string | null;
  species: string | null;
  size: string;
  bugsFound: boolean | null;
  checkedInAt: string;
  visitPosition: string;
  customer: {
    lastName: string;
  };
};

function plantDisplayName(plant: PlantPrintSource): string {
  const name = plant.name?.trim();
  const species = plant.species?.trim();
  if (name && species) return `${name} (${species})`.slice(0, 120);
  if (name) return name.slice(0, 120);
  if (species) return species.slice(0, 120);
  return "Plant";
}

function toCheckedInAt(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString();
}

/** Build bridge payload from plant detail fields. */
export function buildPrintJobPayload(
  plant: PlantPrintSource,
  jobId?: string,
): PrintJobPayload {
  const env = getEnv();
  const caseUrl = env.APP_BASE_URL
    ? `${env.APP_BASE_URL.replace(/\/$/, "")}/hh/case/${plant.id}`
    : undefined;

  const surname = plant.customer.lastName.trim() || "Customer";

  return {
    ...(jobId ? { jobId } : {}),
    plantId: plant.id,
    ...(caseUrl ? { caseUrl } : {}),
    customerSurname: surname.slice(0, 80),
    plantName: plantDisplayName(plant),
    size: plant.size.trim().slice(0, 40) || "—",
    pestsFound: plant.bugsFound === true,
    visitPosition: plant.visitPosition,
    checkedInAt: toCheckedInAt(plant.checkedInAt),
  };
}
