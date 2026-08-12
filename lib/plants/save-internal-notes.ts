import type { SupabaseClient } from "@supabase/supabase-js";

export type SaveInternalNotesResult = { success: true } | { success: false; error: string };

export async function saveInternalNotesWithClient(
  supabase: SupabaseClient,
  plantId: string,
  content: string,
): Promise<SaveInternalNotesResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to save internal notes." };
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

  const normalized = content.trim() || null;

  const { error } = await supabase
    .from("plants")
    .update({ notes: normalized })
    .eq("id", plantId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
