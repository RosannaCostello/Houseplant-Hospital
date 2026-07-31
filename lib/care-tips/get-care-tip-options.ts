import type { SupabaseClient } from "@supabase/supabase-js";
import {
  emptyCareTipOptionsByCategory,
  isCareTipCategory,
  type CareTipOptionsByCategory,
} from "@/lib/care-tips/types";

export type { CareTipOption, CareTipOptionsByCategory } from "@/lib/care-tips/types";

export async function getCareTipOptionsWithClient(
  supabase: SupabaseClient,
  options: { includeInactive?: boolean } = {},
): Promise<CareTipOptionsByCategory> {
  let query = supabase
    .from("care_tip_options")
    .select("id, category, label, sort_order, active")
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (!options.includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const byCategory = emptyCareTipOptionsByCategory();

  for (const row of data ?? []) {
    if (!isCareTipCategory(row.category)) continue;
    byCategory[row.category].push({
      id: row.id,
      category: row.category,
      label: row.label,
      sortOrder: row.sort_order,
      active: row.active,
    });
  }

  return byCategory;
}

export async function getCareTipOptions(
  options: { includeInactive?: boolean } = {},
): Promise<CareTipOptionsByCategory> {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  return getCareTipOptionsWithClient(supabase, options);
}
