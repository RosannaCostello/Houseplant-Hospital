import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateCheckInInput } from "@/lib/check-in/create-check-in-input";
import { resolveCheckInCustomerId } from "@/lib/check-in/resolve-check-in-customer";
import { emitPlantStatusChangeEvent } from "@/lib/mailchimp/emit-plant-event";
import { syncCheckInToMailchimp } from "@/lib/mailchimp/sync-check-in";
import type { PlantStatus } from "@/lib/plant-status";

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

    const createdPlants: Array<{
      clientId: string;
      plantId: string;
      status: PlantStatus;
    }> = [];

    for (const plant of plants) {
      const initialStatus: PlantStatus = plant.bugsFound === true ? "quarantine" : "check_in";
      const bugsFoundEver = plant.bugsFound === true;

      const { data: plantRow, error: plantError } = await supabase
        .from("plants")
        .insert({
          visit_id: visitRow.id,
          name: plant.name.trim() || null,
          species: plant.species.trim() || null,
          size: plant.size,
          status: initialStatus,
          bugs_found: plant.bugsFound ?? null,
          bugs_found_ever: bugsFoundEver,
        })
        .select("id")
        .single();

      if (plantError || !plantRow) {
        throw new Error(plantError?.message ?? "Could not create plant");
      }

      const { error: historyError } = await supabase.from("status_history").insert({
        plant_id: plantRow.id,
        previous_status: null,
        new_status: initialStatus,
        changed_by: user.id,
      });

      if (historyError) {
        throw new Error(historyError.message);
      }

      createdPlants.push({
        clientId: plant.clientId,
        plantId: plantRow.id,
        status: initialStatus,
      });
    }

    await syncCheckInToMailchimp({
      supabase,
      customer,
      customerId: customerResult.id,
      visitId: visitRow.id,
      plants: createdPlants.map((plant) => ({ plantId: plant.plantId })),
    });

    for (const plant of createdPlants) {
      if (plant.status === "quarantine") {
        await emitPlantStatusChangeEvent(supabase, plant.plantId, "check_in", "quarantine");
      }
    }

    return {
      success: true,
      visitId: visitRow.id,
      plants: createdPlants.map(({ clientId, plantId }) => ({ clientId, plantId })),
    };
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
