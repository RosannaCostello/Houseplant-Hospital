import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateCheckInInput } from "@/lib/check-in/create-check-in-input";
import { syncCheckInToMailchimp } from "@/lib/mailchimp/sync-check-in";

export type CreateCheckInRecordsResult =
  | {
      success: true;
      visitId: string;
      plants: Array<{ clientId: string; plantId: string }>;
    }
  | { success: false; error: string };

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

async function resolveCheckInCustomerId(
  supabase: SupabaseClient,
  customer: CreateCheckInInput["customer"],
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

function buildVisitNotes(plants: CreateCheckInInput["plants"]): string | null {
  const lines = plants
    .map((plant, index) => {
      const notes = plant.notes.trim();
      if (!notes) return null;

      const label = plant.name.trim() || plant.species.trim() || `Plant ${index + 1}`;
      return `${label}: ${notes}`;
    })
    .filter((line): line is string => Boolean(line));

  return lines.length > 0 ? lines.join("\n") : null;
}

export async function createCheckInRecordsWithClient(
  supabase: SupabaseClient,
  input: CreateCheckInInput,
): Promise<CreateCheckInRecordsResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to complete check-in." };
  }

  const { customer, plants } = input;

  let visitId: string | null = null;

  try {
    const customerResult = await resolveCheckInCustomerId(supabase, customer);

    if ("error" in customerResult) {
      return { success: false, error: customerResult.error };
    }

    const { data: visitRow, error: visitError } = await supabase
      .from("visits")
      .insert({
        customer_id: customerResult.id,
        notes: buildVisitNotes(plants),
        created_by: user.id,
      })
      .select("id")
      .single();

    if (visitError || !visitRow) {
      throw new Error(visitError?.message ?? "Could not create visit");
    }

    visitId = visitRow.id;

    const createdPlants: Array<{ clientId: string; plantId: string }> = [];

    for (const plant of plants) {
      const { data: plantRow, error: plantError } = await supabase
        .from("plants")
        .insert({
          visit_id: visitRow.id,
          name: plant.name.trim() || null,
          species: plant.species.trim() || null,
          size: plant.size,
          status: "check_in",
          bugs_found: null,
        })
        .select("id")
        .single();

      if (plantError || !plantRow) {
        throw new Error(plantError?.message ?? "Could not create plant");
      }

      const { error: historyError } = await supabase.from("status_history").insert({
        plant_id: plantRow.id,
        previous_status: null,
        new_status: "check_in",
        changed_by: user.id,
      });

      if (historyError) {
        throw new Error(historyError.message);
      }

      createdPlants.push({ clientId: plant.clientId, plantId: plantRow.id });
    }

    await syncCheckInToMailchimp({
      supabase,
      customer,
      customerId: customerResult.id,
      visitId: visitRow.id,
      plants: createdPlants.map((plant) => ({ plantId: plant.plantId })),
    });

    return { success: true, visitId: visitRow.id, plants: createdPlants };
  } catch (error) {
    if (visitId) {
      try {
        await rollbackCheckInWithClient(supabase, visitId);
      } catch (rollbackError) {
        const rollbackMessage =
          rollbackError instanceof Error ? rollbackError.message : "Could not roll back visit";
        const message = error instanceof Error ? error.message : "Check-in failed";
        return {
          success: false,
          error: `${message} (rollback also failed: ${rollbackMessage})`,
        };
      }
    }

    const message = error instanceof Error ? error.message : "Check-in failed";
    return { success: false, error: message };
  }
}

export async function rollbackCheckInWithClient(
  supabase: SupabaseClient,
  visitId: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const { data: visit, error: fetchError } = await supabase
    .from("visits")
    .select("created_by")
    .eq("id", visitId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!visit) {
    return;
  }

  if (visit.created_by !== user.id) {
    throw new Error("You can only roll back visits you created.");
  }

  const { error: deleteError } = await supabase.from("visits").delete().eq("id", visitId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }
}
