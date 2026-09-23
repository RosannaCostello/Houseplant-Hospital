import type { PlantStatus } from "@/lib/plant-status";

/** Treatment notes + care tips are draft until after surgery. */
export function showCustomerAftercare(status: PlantStatus): boolean {
  return status === "outpatient" || status === "collected" || status === "dead";
}
