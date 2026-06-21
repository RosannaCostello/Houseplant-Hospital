import type { SupabaseClient } from "@supabase/supabase-js";
import { plantTextFieldSchema } from "@/lib/plants/plant-text-field-schema";

export type SaveCareTipResult = { success: true } | { success: false; error: string };

export async function saveCareTipWithClient(
  supabase: SupabaseClient,
  plantId: string,
  content: string,
): Promise<SaveCareTipResult> {
  const parsed = plantTextFieldSchema.safeParse(content);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid care tip." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to save care tips." };
  }

  const normalized = parsed.data;

  if (!normalized) {
    const { error: deleteError } = await supabase.from("care_tips").delete().eq("plant_id", plantId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    return { success: true };
  }

  const { error: upsertError } = await supabase.from("care_tips").upsert(
    {
      plant_id: plantId,
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
