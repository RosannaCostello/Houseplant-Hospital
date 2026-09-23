import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/require-admin";

export type PestTypeOptionMutationResult =
  | { success: true; id?: string }
  | { success: false; error: string };

export async function createPestTypeOptionWithClient(
  supabase: SupabaseClient,
  input: { label: string; paragraph: string },
): Promise<PestTypeOptionMutationResult> {
  const admin = await requireAdmin(supabase);
  if (!admin.ok) {
    return { success: false, error: admin.error };
  }

  const label = input.label.trim();
  if (!label) {
    return { success: false, error: "Option label is required." };
  }

  const paragraph = input.paragraph.trim();

  const { data: existing } = await supabase
    .from("pest_type_options")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (existing?.sort_order ?? 0) + 10;

  const { data, error } = await supabase
    .from("pest_type_options")
    .insert({
      label,
      paragraph,
      sort_order: sortOrder,
      active: true,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.toLowerCase().includes("duplicate") || error.code === "23505") {
      return { success: false, error: "That pest type already exists." };
    }
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

export async function updatePestTypeOptionWithClient(
  supabase: SupabaseClient,
  input: { id: string; label: string; paragraph: string },
): Promise<PestTypeOptionMutationResult> {
  const admin = await requireAdmin(supabase);
  if (!admin.ok) {
    return { success: false, error: admin.error };
  }

  const label = input.label.trim();
  if (!label) {
    return { success: false, error: "Option label is required." };
  }

  const paragraph = input.paragraph.trim();

  const { error } = await supabase
    .from("pest_type_options")
    .update({ label, paragraph })
    .eq("id", input.id);

  if (error) {
    if (error.message.toLowerCase().includes("duplicate") || error.code === "23505") {
      return { success: false, error: "That pest type already exists." };
    }
    return { success: false, error: error.message };
  }

  return { success: true, id: input.id };
}

export async function deletePestTypeOptionWithClient(
  supabase: SupabaseClient,
  id: string,
): Promise<PestTypeOptionMutationResult> {
  const admin = await requireAdmin(supabase);
  if (!admin.ok) {
    return { success: false, error: admin.error };
  }

  // Soft-delete so historical plants keep a valid pest_type_option_id when possible.
  const { error } = await supabase
    .from("pest_type_options")
    .update({ active: false })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, id };
}
