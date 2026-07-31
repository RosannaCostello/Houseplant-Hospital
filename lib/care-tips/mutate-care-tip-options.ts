import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  CARE_TIP_CATEGORIES,
  type CareTipCategory,
} from "@/lib/care-tips/compose-parse";

export type CareTipOptionMutationResult =
  | { success: true; id?: string }
  | { success: false; error: string };

function isCareTipCategory(value: string): value is CareTipCategory {
  return (CARE_TIP_CATEGORIES as readonly string[]).includes(value);
}

export async function createCareTipOptionWithClient(
  supabase: SupabaseClient,
  input: { category: string; label: string },
): Promise<CareTipOptionMutationResult> {
  const admin = await requireAdmin(supabase);
  if (!admin.ok) {
    return { success: false, error: admin.error };
  }

  if (!isCareTipCategory(input.category)) {
    return { success: false, error: "Invalid care tip category." };
  }

  const label = input.label.trim();
  if (!label) {
    return { success: false, error: "Option label is required." };
  }

  const { data: existing } = await supabase
    .from("care_tip_options")
    .select("sort_order")
    .eq("category", input.category)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (existing?.sort_order ?? 0) + 10;

  const { data, error } = await supabase
    .from("care_tip_options")
    .insert({
      category: input.category,
      label,
      sort_order: sortOrder,
      active: true,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

export async function updateCareTipOptionWithClient(
  supabase: SupabaseClient,
  input: { id: string; label: string },
): Promise<CareTipOptionMutationResult> {
  const admin = await requireAdmin(supabase);
  if (!admin.ok) {
    return { success: false, error: admin.error };
  }

  const label = input.label.trim();
  if (!label) {
    return { success: false, error: "Option label is required." };
  }

  const { error } = await supabase
    .from("care_tip_options")
    .update({ label })
    .eq("id", input.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, id: input.id };
}

export async function deleteCareTipOptionWithClient(
  supabase: SupabaseClient,
  id: string,
): Promise<CareTipOptionMutationResult> {
  const admin = await requireAdmin(supabase);
  if (!admin.ok) {
    return { success: false, error: admin.error };
  }

  const { error } = await supabase.from("care_tip_options").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, id };
}
