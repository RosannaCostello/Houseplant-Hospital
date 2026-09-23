import type { PlantStatus } from "@/lib/plant-status";

export type CustomerPlantStatus = {
  label: string;
  message: string;
};

/**
 * Customer-facing status copy for Care Cards.
 * Uses Hospital lane names (Quarantine, In Surgery, etc.) — same nomenclature as staff.
 */
export function customerPlantStatus(status: PlantStatus): CustomerPlantStatus {
  switch (status) {
    case "check_in":
      return {
        label: "Checked in",
        message: "Your plant has arrived at the Hospital and is waiting to be seen.",
      };
    case "quarantine":
      return {
        label: "Quarantine",
        message: "Your plant is in quarantine at the Hospital.",
      };
    case "in_surgery":
      return {
        label: "In Surgery",
        message: "Your plant is in surgery with our team. We'll let you know when it's ready.",
      };
    case "propagation":
      return {
        label: "Propagation",
        message: "Your new plant propagation is settling in with our team.",
      };
    case "outpatient":
      return {
        label: "Ready for collection",
        message: "Your plant is ready to pick up from Hilda.",
      };
    case "dead":
      return {
        label: "Assessment complete",
        message: "Please speak to a member of the Hilda team if you have any questions.",
      };
    case "collected":
      return {
        label: "Collected",
        message: "This plant has been collected. Thank you for visiting Hilda.",
      };
  }
}
