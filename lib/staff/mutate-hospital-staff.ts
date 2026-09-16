import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/require-admin";

export type StaffMutationResult = { success: true; id?: string } | { success: false; error: string };

export async function createHospitalStaffWithClient(
  supabase: SupabaseClient,
  input: { firstName: string; lastName: string },
): Promise<StaffMutationResult> {
  const admin = await requireAdmin(supabase);
  if (!admin.ok) {
    return { success: false, error: admin.error };
  }

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();

  if (!firstName || !lastName) {
    return { success: false, error: "First name and surname are required." };
  }

  const { data: existing } = await supabase
    .from("hospital_staff")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (existing?.sort_order ?? 0) + 10;

  const { data, error } = await supabase
    .from("hospital_staff")
    .insert({
      first_name: firstName,
      last_name: lastName,
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

export async function updateHospitalStaffWithClient(
  supabase: SupabaseClient,
  input: { id: string; firstName: string; lastName: string },
): Promise<StaffMutationResult> {
  const admin = await requireAdmin(supabase);
  if (!admin.ok) {
    return { success: false, error: admin.error };
  }

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();

  if (!firstName || !lastName) {
    return { success: false, error: "First name and surname are required." };
  }

  const { error } = await supabase
    .from("hospital_staff")
    .update({ first_name: firstName, last_name: lastName })
    .eq("id", input.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, id: input.id };
}

export async function deactivateHospitalStaffWithClient(
  supabase: SupabaseClient,
  id: string,
): Promise<StaffMutationResult> {
  const admin = await requireAdmin(supabase);
  if (!admin.ok) {
    return { success: false, error: admin.error };
  }

  const { error } = await supabase.from("hospital_staff").update({ active: false }).eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, id };
}
