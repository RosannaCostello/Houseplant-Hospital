import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/require-admin";

export type PestTreatmentOptionMutationResult =
  | { success: true; id?: string }
  | { success: false; error: string };

export async function createPestTreatmentOptionWithClient(
  supabase: SupabaseClient,
  input: { label: string },
): Promise<PestTreatmentOptionMutationResult> {
  const admin = await requireAdmin(supabase);
  if (!admin.ok) {
    return { success: false, error: admin.error };
  }

  const label = input.label.trim();
  if (!label) {
    return { success: false, error: "Option label is required." };
  }

  const { data: existing } = await supabase
    .from("pest_treatment_options")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (existing?.sort_order ?? 0) + 10;

  const { data, error } = await supabase
    .from("pest_treatment_options")
    .insert({
      label,
      sort_order: sortOrder,
      active: true,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.toLowerCase().includes("duplicate") || error.code === "23505") {
      return { success: false, error: "That treatment option already exists." };
    }
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

export async function updatePestTreatmentOptionWithClient(
  supabase: SupabaseClient,
  input: { id: string; label: string },
): Promise<PestTreatmentOptionMutationResult> {
  const admin = await requireAdmin(supabase);
  if (!admin.ok) {
    return { success: false, error: admin.error };
  }

  const label = input.label.trim();
  if (!label) {
    return { success: false, error: "Option label is required." };
  }

  const { error } = await supabase
    .from("pest_treatment_options")
    .update({ label })
    .eq("id", input.id);

  if (error) {
    if (error.message.toLowerCase().includes("duplicate") || error.code === "23505") {
      return { success: false, error: "That treatment option already exists." };
    }
    return { success: false, error: error.message };
  }

  return { success: true, id: input.id };
}

export async function deletePestTreatmentOptionWithClient(
  supabase: SupabaseClient,
  id: string,
): Promise<PestTreatmentOptionMutationResult> {
  const admin = await requireAdmin(supabase);
  if (!admin.ok) {
    return { success: false, error: admin.error };
  }

  // Soft-delete so historical plant treatments keep a valid option_id when possible.
  const { error } = await supabase
    .from("pest_treatment_options")
    .update({ active: false })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, id };
}
