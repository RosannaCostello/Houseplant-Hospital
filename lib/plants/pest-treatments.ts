import type { SupabaseClient } from "@supabase/supabase-js";

export type PestTreatmentNumber = 1 | 2 | 3;

export type PlantPestTreatment = {
  treatmentNumber: PestTreatmentNumber;
  treatedAt: string;
};

export type SetPestTreatmentResult =
  | { success: true; treatments: PlantPestTreatment[] }
  | { success: false; error: string };

const TREATMENT_NUMBERS: PestTreatmentNumber[] = [1, 2, 3];

function isTreatmentNumber(value: number): value is PestTreatmentNumber {
  return value === 1 || value === 2 || value === 3;
}

export async function listPlantPestTreatmentsWithClient(
  supabase: SupabaseClient,
  plantId: string,
): Promise<PlantPestTreatment[]> {
  const { data, error } = await supabase
    .from("plant_pest_treatments")
    .select("treatment_number, treated_at")
    .eq("plant_id", plantId)
    .order("treatment_number", { ascending: true });

  if (error) {
    throw new Error(`Failed to load pest treatments: ${error.message}`);
  }

  return (data ?? []).flatMap((row) => {
    if (
      typeof row.treatment_number !== "number" ||
      typeof row.treated_at !== "string" ||
      !isTreatmentNumber(row.treatment_number)
    ) {
      return [];
    }

    return [
      {
        treatmentNumber: row.treatment_number,
        treatedAt: row.treated_at,
      },
    ];
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

export async function setPestTreatmentWithClient(
  supabase: SupabaseClient,
  plantId: string,
  treatmentNumber: PestTreatmentNumber,
  completed: boolean,
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

  if (completed) {
    const { error: upsertError } = await supabase.from("plant_pest_treatments").upsert(
      {
        plant_id: plantId,
        treatment_number: treatmentNumber,
        treated_at: new Date().toISOString(),
      },
      { onConflict: "plant_id,treatment_number" },
    );

    if (upsertError) {
      return { success: false, error: upsertError.message };
    }
  } else {
    const { error: deleteError } = await supabase
      .from("plant_pest_treatments")
      .delete()
      .eq("plant_id", plantId)
      .eq("treatment_number", treatmentNumber);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }
  }

  try {
    const treatments = await listPlantPestTreatmentsWithClient(supabase, plantId);
    return { success: true, treatments };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not reload treatments.";
    return { success: false, error: message };
  }
}
