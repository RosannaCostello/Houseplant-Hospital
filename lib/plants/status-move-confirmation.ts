import type { PlantStatus } from "@/lib/plant-status";

/** Shared confirm copy for status menu and dashboard drag-drop (HIL-109). */
export function confirmationForStatusMove(
  from: PlantStatus,
  to: PlantStatus,
): { title: string; message: string } | null {
  if (from === "check_in" && to === "quarantine") {
    return {
      title: "Move to quarantine?",
      message: "Are you sure you want to move to quarantine?",
    };
  }
  if (
    (from === "check_in" || from === "quarantine" || from === "propagation") &&
    to === "in_surgery"
  ) {
    return {
      title: "Move to surgery?",
      message: "Are you sure you want to move to surgery?",
    };
  }
  if (from === "in_surgery" && to === "dead") {
    return {
      title: "Move to Dead?",
      message: "Are you sure you want to move to Dead?",
    };
  }
  if (from === "in_surgery" && to === "outpatient") {
    return {
      title: "Move to Outpatient?",
      message:
        "Are you sure you want to move this plant to Outpatient. This will notify the customer that the plant is ready to collect. PLEASE NOTE: If the customer has more than one plant in their drop-off, they will only be notified when the final plant is moved to outpatient",
    };
  }
  if (from === "outpatient" && to === "collected") {
    return {
      title: "Move to collected?",
      message: "Are you sure you want to move to collected, this cannot be undone",
    };
  }
  return null;
}
