import type { SupabaseClient } from "@supabase/supabase-js";
import type { CheckInCustomer } from "@/lib/check-in/customer-schema";

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

export async function resolveCheckInCustomerId(
  supabase: SupabaseClient,
  customer: CheckInCustomer,
): Promise<{ id: string } | { error: string }> {
  const email = customer.email.toLowerCase();

  const { data: existing, error: lookupError } = await supabase
    .from("customers")
    .select("id, first_name, last_name")
    .eq("email", email)
    .maybeSingle();

  if (lookupError) {
    return { error: lookupError.message };
  }

  if (existing) {
    if (
      normalizeName(existing.first_name) !== normalizeName(customer.firstName) ||
      normalizeName(existing.last_name) !== normalizeName(customer.lastName)
    ) {
      return {
        error:
          "A customer with this email already exists under a different name. Check the email address.",
      };
    }

    const { error: updateError } = await supabase
      .from("customers")
      .update({
        phone: customer.phone || null,
        marketing_consent: customer.marketingConsent,
      })
      .eq("id", existing.id);

    if (updateError) {
      return { error: updateError.message };
    }

    return { id: existing.id };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("customers")
    .insert({
      first_name: customer.firstName,
      last_name: customer.lastName,
      email,
      phone: customer.phone || null,
      marketing_consent: customer.marketingConsent,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { error: insertError?.message ?? "Could not save customer" };
  }

  return { id: inserted.id };
}
