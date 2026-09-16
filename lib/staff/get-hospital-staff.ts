import type { SupabaseClient } from "@supabase/supabase-js";
import type { HospitalStaff } from "@/lib/staff/types";

type StaffRow = {
  id: string;
  first_name: string;
  last_name: string;
  active: boolean;
  sort_order: number;
};

function mapStaffRow(row: StaffRow): HospitalStaff {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    active: row.active,
    sortOrder: row.sort_order,
  };
}

export async function getHospitalStaffWithClient(
  supabase: SupabaseClient,
  options: { includeInactive?: boolean } = {},
): Promise<HospitalStaff[]> {
  let query = supabase
    .from("hospital_staff")
    .select("id, first_name, last_name, active, sort_order")
    .order("sort_order", { ascending: true })
    .order("last_name", { ascending: true });

  if (!options.includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load staff: ${error.message}`);
  }

  return (data ?? []).map(mapStaffRow);
}

export async function getHospitalStaffByIdWithClient(
  supabase: SupabaseClient,
  staffId: string,
): Promise<HospitalStaff | null> {
  const { data, error } = await supabase
    .from("hospital_staff")
    .select("id, first_name, last_name, active, sort_order")
    .eq("id", staffId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load staff member: ${error.message}`);
  }

  return data ? mapStaffRow(data as StaffRow) : null;
}
