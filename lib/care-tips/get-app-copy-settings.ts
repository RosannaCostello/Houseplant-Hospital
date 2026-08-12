import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_TREATMENT_NOTES_PLACEHOLDER } from "@/lib/care-tips/constants";

export type AppCopySettings = {
  treatmentNotesPlaceholder: string;
  stackingCardsEnabled: boolean;
};

export async function getAppCopySettingsWithClient(
  supabase: SupabaseClient,
): Promise<AppCopySettings> {
  const { data, error } = await supabase
    .from("app_copy_settings")
    .select("treatment_notes_placeholder, stacking_cards_enabled")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    // Column may be missing before migration 0030.
    if (error.message.toLowerCase().includes("stacking_cards_enabled")) {
      const fallback = await supabase
        .from("app_copy_settings")
        .select("treatment_notes_placeholder")
        .eq("id", 1)
        .maybeSingle();
      if (fallback.error) {
        throw new Error(fallback.error.message);
      }
      const placeholder = fallback.data?.treatment_notes_placeholder?.trim();
      return {
        treatmentNotesPlaceholder: placeholder || DEFAULT_TREATMENT_NOTES_PLACEHOLDER,
        stackingCardsEnabled: true,
      };
    }
    throw new Error(error.message);
  }

  const placeholder = data?.treatment_notes_placeholder?.trim();

  return {
    treatmentNotesPlaceholder: placeholder || DEFAULT_TREATMENT_NOTES_PLACEHOLDER,
    stackingCardsEnabled: data?.stacking_cards_enabled !== false,
  };
}

export async function getAppCopySettings(): Promise<AppCopySettings> {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  return getAppCopySettingsWithClient(supabase);
}
