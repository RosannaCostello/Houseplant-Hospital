import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/require-admin";
import { DEFAULT_TREATMENT_NOTES_PLACEHOLDER } from "@/lib/care-tips/constants";

export type UpdateAppCopySettingsResult =
  | { success: true }
  | { success: false; error: string };

export async function updateTreatmentNotesPlaceholderWithClient(
  supabase: SupabaseClient,
  placeholder: string,
): Promise<UpdateAppCopySettingsResult> {
  const admin = await requireAdmin(supabase);
  if (!admin.ok) {
    return { success: false, error: admin.error };
  }

  const trimmed = placeholder.trim();
  if (!trimmed) {
    return { success: false, error: "Treatment notes placeholder cannot be empty." };
  }

  const { error } = await supabase.from("app_copy_settings").upsert(
    {
      id: 1,
      treatment_notes_placeholder: trimmed || DEFAULT_TREATMENT_NOTES_PLACEHOLDER,
    },
    { onConflict: "id" },
  );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateStackingCardsEnabledWithClient(
  supabase: SupabaseClient,
  enabled: boolean,
): Promise<UpdateAppCopySettingsResult> {
  const admin = await requireAdmin(supabase);
  if (!admin.ok) {
    return { success: false, error: admin.error };
  }

  const { error } = await supabase
    .from("app_copy_settings")
    .update({ stacking_cards_enabled: enabled })
    .eq("id", 1);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
