import type { PlantStatus } from "@/lib/plant-status";

export type CustomerPlantStatus = {
  label: string;
  message: string;
};

/** Customer-safe status copy for public QR / case pages. */
export function customerPlantStatus(status: PlantStatus): CustomerPlantStatus {
  switch (status) {
    case "check_in":
      return {
        label: "Checked in",
        message: "Your plant has arrived at the Hospital and is waiting to be seen.",
      };
    case "in_surgery":
      return {
        label: "In treatment",
        message: "We're caring for your plant. We'll let you know when it's ready.",
      };
    case "outpatient":
      return {
        label: "Ready for collection",
        message: "Your plant is ready to pick up from Hilda.",
      };
    case "quarantine":
      return {
        label: "Under care",
        message: "Your plant is receiving extra care from our team.",
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
