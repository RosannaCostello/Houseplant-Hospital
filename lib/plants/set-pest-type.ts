import type { SupabaseClient } from "@supabase/supabase-js";
import { saveTreatmentNoteWithClient } from "@/lib/plants/save-treatment-note";

export type SetPestTypeResult =
  | { success: true; pestTypeOptionId: string | null }
  | { success: false; error: string };

export async function setPestTypeWithClient(
  supabase: SupabaseClient,
  plantId: string,
  pestTypeOptionId: string | null,
): Promise<SetPestTypeResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to set pest type." };
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

  let paragraph: string | null = null;

  if (pestTypeOptionId) {
    const { data: option, error: optionError } = await supabase
      .from("pest_type_options")
      .select("id, paragraph, active")
      .eq("id", pestTypeOptionId)
      .maybeSingle();

    if (optionError) {
      return { success: false, error: optionError.message };
    }

    if (!option || option.active !== true) {
      return { success: false, error: "That pest type is not available." };
    }

    paragraph =
      typeof option.paragraph === "string" && option.paragraph.trim()
        ? option.paragraph.trim()
        : null;
  }

  const { error: updateError } = await supabase
    .from("plants")
    .update({ pest_type_option_id: pestTypeOptionId })
    .eq("id", plantId);

  if (updateError) {
    if (updateError.message.includes("pest_type_option_id")) {
      return {
        success: false,
        error: "Pest types are not available yet. Ask an admin to run the latest migration.",
      };
    }
    return { success: false, error: updateError.message };
  }

  if (paragraph) {
    const { data: existingNote } = await supabase
      .from("treatment_notes")
      .select("content")
      .eq("plant_id", plantId)
      .maybeSingle();

    const existingContent =
      existingNote && typeof existingNote.content === "string" ? existingNote.content.trim() : "";

    if (!existingContent) {
      const noteResult = await saveTreatmentNoteWithClient(supabase, plantId, paragraph);
      if (!noteResult.success) {
        return { success: false, error: noteResult.error };
      }
    }
  }

  return { success: true, pestTypeOptionId };
}
