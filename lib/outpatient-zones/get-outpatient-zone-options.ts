import type { SupabaseClient } from "@supabase/supabase-js";
import type { OutpatientZoneOption } from "@/lib/outpatient-zones/types";

export type { OutpatientZoneOption } from "@/lib/outpatient-zones/types";

export async function getOutpatientZoneOptionsWithClient(
  supabase: SupabaseClient,
  options: { includeInactive?: boolean } = {},
): Promise<OutpatientZoneOption[]> {
  let query = supabase
    .from("outpatient_zone_options")
    .select("id, label, sort_order, active")
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
        sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
        active: row.active === true,
      },
    ];
  });
}

export async function getOutpatientZoneOptions(
  options: { includeInactive?: boolean } = {},
): Promise<OutpatientZoneOption[]> {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  return getOutpatientZoneOptionsWithClient(supabase, options);
}
