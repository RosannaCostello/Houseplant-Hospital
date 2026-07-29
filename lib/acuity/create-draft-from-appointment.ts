import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AcuityAppointment } from "@/lib/acuity/client";
import { checkInCustomerSchema } from "@/lib/check-in/customer-schema";
import { resolveCheckInCustomerId } from "@/lib/check-in/resolve-check-in-customer";

export type CreateAcuityDraftResult =
  | { success: true; draftId: string; created: boolean }
  | { success: false; error: string };

function phoneForCheckIn(phone: string): string {
  const trimmed = phone.trim();
  return trimmed.length >= 7 ? trimmed : "";
}

export async function createCheckInDraftFromAcuityAppointment(
  supabase: SupabaseClient,
  appointment: AcuityAppointment,
): Promise<CreateAcuityDraftResult> {
  const acuityAppointmentId = String(appointment.id);

  const { data: existing, error: existingError } = await supabase
    .from("check_in_drafts")
    .select("id")
    .eq("acuity_appointment_id", acuityAppointmentId)
    .maybeSingle();

  if (existingError) {
    return { success: false, error: existingError.message };
  }

  if (existing?.id) {
    return { success: true, draftId: existing.id, created: false };
  }

  const customerParsed = checkInCustomerSchema.safeParse({
    firstName: appointment.firstName,
    lastName: appointment.lastName,
    email: appointment.email,
    phone: phoneForCheckIn(appointment.phone),
    marketingConsent: false,
  });

  if (!customerParsed.success) {
    return {
      success: false,
      error: customerParsed.error.issues[0]?.message ?? "Invalid Acuity customer details.",
    };
  }

  const customerResult = await resolveCheckInCustomerId(supabase, customerParsed.data, {
    allowNameMismatch: true,
  });

  if ("error" in customerResult) {
    return { success: false, error: customerResult.error };
  }

  const { data: draft, error } = await supabase
    .from("check_in_drafts")
    .insert({
      customer_id: customerResult.id,
      plants: [],
      draft_step: "plants",
      created_by: null,
      acuity_appointment_id: acuityAppointmentId,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("check_in_drafts_acuity_appointment_id_uidx")) {
      const { data: raced } = await supabase
        .from("check_in_drafts")
        .select("id")
        .eq("acuity_appointment_id", acuityAppointmentId)
        .maybeSingle();

      if (raced?.id) {
        return { success: true, draftId: raced.id, created: false };
      }
    }

    return { success: false, error: error.message };
  }

  if (!draft) {
    return { success: false, error: "Could not create draft check-in from Acuity." };
  }

  return { success: true, draftId: draft.id, created: true };
}
