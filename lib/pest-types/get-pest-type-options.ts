import type { SupabaseClient } from "@supabase/supabase-js";
import type { PestTypeOption } from "@/lib/pest-types/types";

export type { PestTypeOption } from "@/lib/pest-types/types";

export async function getPestTypeOptionsWithClient(
  supabase: SupabaseClient,
  options: { includeInactive?: boolean } = {},
): Promise<PestTypeOption[]> {
  let query = supabase
    .from("pest_type_options")
    .select("id, label, paragraph, sort_order, active")
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (!options.includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).flatMap((row) => {
    if (typeof row.id !== "string" || typeof row.label !== "string") return [];
    return [
      {
        id: row.id,
        label: row.label,
        paragraph: typeof row.paragraph === "string" ? row.paragraph : "",
        sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
        active: row.active === true,
      },
    ];
  });
}

export async function getPestTypeOptions(
  options: { includeInactive?: boolean } = {},
): Promise<PestTypeOption[]> {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  return getPestTypeOptionsWithClient(supabase, options);
}
