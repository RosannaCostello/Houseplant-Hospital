import type { SupabaseClient } from "@supabase/supabase-js";

export type PestTreatmentNumber = 1 | 2 | 3;

export type PlantPestTreatment = {
  treatmentNumber: PestTreatmentNumber;
  treatedAt: string;
  optionId: string | null;
  optionLabel: string;
};

export type SetPestTreatmentResult =
  | { success: true; treatments: PlantPestTreatment[] }
  | { success: false; error: string };

const TREATMENT_NUMBERS: PestTreatmentNumber[] = [1, 2, 3];

function isTreatmentNumber(value: number): value is PestTreatmentNumber {
  return value === 1 || value === 2 || value === 3;
}

function mapTreatmentRow(row: {
  treatment_number?: number;
  treated_at?: string;
  option_id?: string | null;
  option_label?: string | null;
}): PlantPestTreatment | null {
  if (
    typeof row.treatment_number !== "number" ||
    typeof row.treated_at !== "string" ||
    !isTreatmentNumber(row.treatment_number)
  ) {
    return null;
  }

  const optionLabel =
    typeof row.option_label === "string" && row.option_label.trim()
      ? row.option_label.trim()
      : "Treatment recorded";

  return {
    treatmentNumber: row.treatment_number,
    treatedAt: row.treated_at,
    optionId: typeof row.option_id === "string" ? row.option_id : null,
    optionLabel,
  };
}

export async function listPlantPestTreatmentsWithClient(
  supabase: SupabaseClient,
  plantId: string,
): Promise<PlantPestTreatment[]> {
  const { data, error } = await supabase
    .from("plant_pest_treatments")
    .select("treatment_number, treated_at, option_id, option_label")
    .eq("plant_id", plantId)
    .order("treatment_number", { ascending: true });

  if (error) {
    // Pre-0023 schema fallback
    if (error.message.includes("option_id") || error.message.includes("option_label")) {
      const legacy = await supabase
        .from("plant_pest_treatments")
        .select("treatment_number, treated_at")
        .eq("plant_id", plantId)
        .order("treatment_number", { ascending: true });

      if (legacy.error) {
        throw new Error(`Failed to load pest treatments: ${legacy.error.message}`);
      }

      return (legacy.data ?? []).flatMap((row) => {
        const mapped = mapTreatmentRow(row);
        return mapped ? [mapped] : [];
      });
    }

    throw new Error(`Failed to load pest treatments: ${error.message}`);
  }

  return (data ?? []).flatMap((row) => {
    const mapped = mapTreatmentRow(row);
    return mapped ? [mapped] : [];
  });
}

export async function countPlantPestTreatmentsWithClient(
  supabase: SupabaseClient,
  plantId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("plant_pest_treatments")
    .select("id", { count: "exact", head: true })
    .eq("plant_id", plantId);

  if (error) {
    throw new Error(`Failed to count pest treatments: ${error.message}`);
  }

  return count ?? 0;
}

/** Lock in a treatment type for a slot. Existing slots cannot be changed or cleared. */
export async function recordPestTreatmentWithClient(
  supabase: SupabaseClient,
  plantId: string,
  treatmentNumber: PestTreatmentNumber,
  optionId: string,
): Promise<SetPestTreatmentResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to update pest treatments." };
  }

  if (!TREATMENT_NUMBERS.includes(treatmentNumber)) {
    return { success: false, error: "Invalid treatment number." };
  }

  const { data: plant, error: fetchError } = await supabase
    .from("plants")
    .select("status")
    .eq("id", plantId)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  if (!plant) {
    return { success: false, error: "Plant not found." };
  }

  if (plant.status === "collected") {
    return { success: false, error: "Collected plants cannot be edited." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("plant_pest_treatments")
    .select("id")
    .eq("plant_id", plantId)
    .eq("treatment_number", treatmentNumber)
    .maybeSingle();

  if (existingError) {
    return { success: false, error: existingError.message };
  }

  if (existing) {
    return { success: false, error: "This treatment is already recorded and cannot be changed." };
  }

  const { data: option, error: optionError } = await supabase
    .from("pest_treatment_options")
    .select("id, label, active")
    .eq("id", optionId)
    .maybeSingle();

  if (optionError) {
    return { success: false, error: optionError.message };
  }

  if (!option || option.active !== true || typeof option.label !== "string") {
    return { success: false, error: "Choose a valid treatment option." };
  }

  const { error: insertError } = await supabase.from("plant_pest_treatments").insert({
    plant_id: plantId,
    treatment_number: treatmentNumber,
    treated_at: new Date().toISOString(),
    option_id: option.id,
    option_label: option.label.trim(),
  });

  if (insertError) {
    if (insertError.code === "23505" || insertError.message.toLowerCase().includes("unique")) {
      return { success: false, error: "This treatment is already recorded and cannot be changed." };
    }
    return { success: false, error: insertError.message };
  }

  try {
    const treatments = await listPlantPestTreatmentsWithClient(supabase, plantId);
    return { success: true, treatments };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not reload treatments.";
    return { success: false, error: message };
  }
}

/** @deprecated Use recordPestTreatmentWithClient — kept only if any leftover callers. */
export async function setPestTreatmentWithClient(
  supabase: SupabaseClient,
  plantId: string,
  treatmentNumber: PestTreatmentNumber,
  completed: boolean,
): Promise<SetPestTreatmentResult> {
  if (!completed) {
    return { success: false, error: "Pest treatments cannot be cleared once recorded." };
  }

  return {
    success: false,
    error: "Choose a treatment type to record this slot.",
  };
}
