import type { SupabaseClient } from "@supabase/supabase-js";
import { treatmentNotesFieldSchema } from "@/lib/plants/plant-text-field-schema";

export type SaveTreatmentNoteResult = { success: true } | { success: false; error: string };

export async function saveTreatmentNoteWithClient(
  supabase: SupabaseClient,
  plantId: string,
  content: string,
): Promise<SaveTreatmentNoteResult> {
  const parsed = treatmentNotesFieldSchema.safeParse(content);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid note." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to save treatment notes." };
  }

  const { data: plant, error: plantError } = await supabase
    .from("plants")
    .select("status")
    .eq("id", plantId)
    .maybeSingle();

  if (plantError) {
    return { success: false, error: plantError.message };
  }

  if (!plant) {
    return { success: false, error: "Plant not found." };
  }

  if (plant.status === "collected") {
    return { success: false, error: "Collected plants cannot be edited." };
  }

  const normalized = parsed.data;

  if (!normalized) {
    const { error: deleteError } = await supabase
      .from("treatment_notes")
      .delete()
      .eq("plant_id", plantId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    return { success: true };
  }

  const { error: upsertError } = await supabase.from("treatment_notes").upsert(
    {
      plant_id: plantId,
      author_id: user.id,
      content: normalized,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "plant_id" },
  );

  if (upsertError) {
    return { success: false, error: upsertError.message };
  }

  return { success: true };
}
