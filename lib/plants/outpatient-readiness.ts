import type { SupabaseClient } from "@supabase/supabase-js";
import { isPlantCategory, type PlantCategory } from "@/lib/plant-category";

export type OutpatientReadinessMissing =
  | "pests"
  | "treatment_notes"
  | "care_tips";

export type OutpatientReadinessResult =
  | { ready: true }
  | { ready: false; missing: OutpatientReadinessMissing[] };

function isNonBlank(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export function formatOutpatientReadinessMessage(
  missing: OutpatientReadinessMissing[],
): string {
  const labels: string[] = [];

  if (missing.includes("pests")) {
    labels.push("answer whether pests were found");
  }
  if (missing.includes("treatment_notes")) {
    labels.push("add treatment notes");
  }
  if (missing.includes("care_tips")) {
    labels.push("add care tips");
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
    .select("bugs_found, plant_category")
    .eq("id", plantId)
    .maybeSingle();

  if (plantError || !plant) {
    return { ready: false, missing: ["pests", "treatment_notes", "care_tips"] };
  }

  const plantCategory: PlantCategory = isPlantCategory(plant.plant_category)
    ? plant.plant_category
    : "standard";

  const [{ data: treatmentNote }, { data: careTip }] = await Promise.all([
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
  ]);

  const missing: OutpatientReadinessMissing[] = [];

  if (plantCategory !== "propagation" && plant.bugs_found == null) {
    missing.push("pests");
  }

  if (!isNonBlank(treatmentNote?.content)) {
    missing.push("treatment_notes");
  }

  if (!isNonBlank(careTip?.content)) {
    missing.push("care_tips");
  }

  if (missing.length > 0) {
    return { ready: false, missing };
  }

  return { ready: true };
}
