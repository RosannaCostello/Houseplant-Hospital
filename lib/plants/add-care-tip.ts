import type { SupabaseClient } from "@supabase/supabase-js";
import { treatmentNoteContentSchema } from "@/lib/plants/treatment-note-schema";

export type AddCareTipResult =
  | { success: true; tipId: string }
  | { success: false; error: string };

export async function addCareTipWithClient(
  supabase: SupabaseClient,
  plantId: string,
  content: string,
): Promise<AddCareTipResult> {
  const parsed = treatmentNoteContentSchema.safeParse(content);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid care tip." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to add a care tip." };
  }

  const { data, error } = await supabase
    .from("care_tips")
    .insert({
      plant_id: plantId,
      content: parsed.data,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Could not save care tip." };
  }

  return { success: true, tipId: data.id };
}
