"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createHospitalStaffWithClient,
  deactivateHospitalStaffWithClient,
  updateHospitalStaffWithClient,
} from "@/lib/staff/mutate-hospital-staff";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const staffNameSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Surname is required"),
});

export async function createHospitalStaffAction(input: z.infer<typeof staffNameSchema>) {
  const parsed = staffNameSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid staff details." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await createHospitalStaffWithClient(supabase, parsed.data);

  if (result.success) {
    revalidatePath("/settings");
    revalidatePath("/app");
  }

  return result;
}

export async function updateHospitalStaffAction(input: { id: string } & z.infer<typeof staffNameSchema>) {
  const parsed = staffNameSchema.extend({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid staff details." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await updateHospitalStaffWithClient(supabase, parsed.data);

  if (result.success) {
    revalidatePath("/settings");
    revalidatePath("/app");
  }

  return result;
}

export async function deactivateHospitalStaffAction(id: string) {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid staff member." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await deactivateHospitalStaffWithClient(supabase, parsed.data);

  if (result.success) {
    revalidatePath("/settings");
    revalidatePath("/app");
  }

  return result;
}
