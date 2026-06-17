import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateCheckInInput } from "@/lib/check-in/create-check-in-input";

export type CreateCheckInRecordsResult =
  | {
      success: true;
      visitId: string;
      plants: Array<{ clientId: string; plantId: string }>;
    }
  | { success: false; error: string };

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

  try {
    const { data: customerRow, error: customerError } = await supabase
      .from("customers")
      .upsert(
        {
          first_name: customer.firstName,
          last_name: customer.lastName,
          email: customer.email.toLowerCase(),
          phone: customer.phone || null,
          marketing_consent: customer.marketingConsent,
        },
        { onConflict: "email" },
      )
      .select("id")
      .single();

    if (customerError || !customerRow) {
      throw new Error(customerError?.message ?? "Could not save customer");
    }

    const { data: visitRow, error: visitError } = await supabase
      .from("visits")
      .insert({
        customer_id: customerRow.id,
        notes: buildVisitNotes(plants),
        created_by: user.id,
      })
      .select("id")
      .single();

    if (visitError || !visitRow) {
      throw new Error(visitError?.message ?? "Could not create visit");
    }

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
        })
        .select("id")
        .single();

      if (plantError || !plantRow) {
        throw new Error(plantError?.message ?? "Could not create plant");
      }

      createdPlants.push({ clientId: plant.clientId, plantId: plantRow.id });
    }

    return { success: true, visitId: visitRow.id, plants: createdPlants };
  } catch (error) {
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
