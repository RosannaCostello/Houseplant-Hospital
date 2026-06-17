import type { SupabaseClient } from "@supabase/supabase-js";
import { treatmentNoteContentSchema } from "@/lib/plants/treatment-note-schema";

export type AddTreatmentNoteResult =
  | { success: true; noteId: string }
  | { success: false; error: string };

export async function addTreatmentNoteWithClient(
  supabase: SupabaseClient,
  plantId: string,
  content: string,
): Promise<AddTreatmentNoteResult> {
  const parsed = treatmentNoteContentSchema.safeParse(content);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid note." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to add a treatment note." };
  }

  const { data, error } = await supabase
    .from("treatment_notes")
    .insert({
      plant_id: plantId,
      author_id: user.id,
      content: parsed.data,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Could not save treatment note." };
  }

  return { success: true, noteId: data.id };
}
