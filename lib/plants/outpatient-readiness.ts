import type { SupabaseClient } from "@supabase/supabase-js";
import { isStructuredCareTipComplete } from "@/lib/care-tips/compose-parse";
import { isPlantCategory, type PlantCategory } from "@/lib/plant-category";
import { countPlantPestTreatmentsWithClient } from "@/lib/plants/pest-treatments";

export type OutpatientReadinessMissing =
  | "pests"
  | "treatment_notes"
  | "care_tips"
  | "pest_treatments"
  | "pest_type"
  | "surgery_sign_off";

export type OutpatientReadinessResult =
  | { ready: true }
  | { ready: false; missing: OutpatientReadinessMissing[] };

function isNonBlank(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export function formatOutpatientReadinessMessage(
  missing: OutpatientReadinessMissing[],
): string {
  if (missing.length === 1 && missing[0] === "pest_treatments") {
    return "Complete all three pest treatments before Outpatient.";
  }

  if (missing.length === 1 && missing[0] === "surgery_sign_off") {
    return "Select who completed surgery before Outpatient.";
  }

  if (missing.length === 1 && missing[0] === "pest_type") {
    return "Select a pest type before Outpatient.";
  }

  const labels: string[] = [];

  if (missing.includes("pests")) {
    labels.push("resolve pests to Yes or No (Not sure is not enough)");
  }
  if (missing.includes("treatment_notes")) {
    labels.push("add treatment notes");
  }
  if (missing.includes("care_tips")) {
    labels.push("choose at least one care tip (Water, Leaves, or Light)");
  }
  if (missing.includes("pest_treatments")) {
    labels.push("complete all three pest treatments");
  }
  if (missing.includes("pest_type")) {
    labels.push("select a pest type");
  }
  if (missing.includes("surgery_sign_off")) {
    labels.push("select who completed surgery");
  }

  if (labels.length === 0) {
    return "Complete the plant record before moving to Outpatient.";
  }

  if (labels.length === 1) {
    return `Before moving to Outpatient, please ${labels[0]}.`;
  }

  const head = labels.slice(0, -1).join(", ");
  const tail = labels[labels.length - 1];
  return `Before moving to Outpatient, please ${head}, and ${tail}.`;
}

export async function checkOutpatientReadinessWithClient(
  supabase: SupabaseClient,
  plantId: string,
): Promise<OutpatientReadinessResult> {
  const { data: plant, error: plantError } = await supabase
    .from("plants")
    .select(
      "bugs_found, bugs_found_ever, pest_type_option_id, plant_category, status, surgery_completed_by",
    )
    .eq("id", plantId)
    .maybeSingle();

  if (plantError || !plant) {
    return {
      ready: false,
      missing: [
        "pests",
        "treatment_notes",
        "care_tips",
        "pest_treatments",
        "pest_type",
        "surgery_sign_off",
      ],
    };
  }

  const plantCategory: PlantCategory = isPlantCategory(plant.plant_category)
    ? plant.plant_category
    : "standard";

  const [{ data: treatmentNote }, { data: careTip }, treatmentCount] = await Promise.all([
    supabase
      .from("treatment_notes")
      .select("content")
      .eq("plant_id", plantId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("care_tips")
      .select("content")
      .eq("plant_id", plantId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    countPlantPestTreatmentsWithClient(supabase, plantId).catch(() => 0),
  ]);

  const missing: OutpatientReadinessMissing[] = [];

  if (plantCategory !== "propagation" && plant.bugs_found == null) {
    missing.push("pests");
  }

  if (!isNonBlank(treatmentNote?.content)) {
    missing.push("treatment_notes");
  }

  if (!isStructuredCareTipComplete(careTip?.content)) {
    missing.push("care_tips");
  }

  // Current No → never require treatments. Not sure still blocks via "pests" above.
  if (
    plant.bugs_found !== false &&
    plant.bugs_found_ever === true &&
    treatmentCount < 3
  ) {
    missing.push("pest_treatments");
  }

  if (plant.bugs_found === true && !plant.pest_type_option_id) {
    missing.push("pest_type");
  }

  if (plant.status === "in_surgery" && !plant.surgery_completed_by) {
    missing.push("surgery_sign_off");
  }

  if (missing.length > 0) {
    return { ready: false, missing };
  }

  return { ready: true };
}
