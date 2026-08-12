import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateCheckInInput } from "@/lib/check-in/create-check-in-input";
import { resolveCheckInCustomerId } from "@/lib/check-in/resolve-check-in-customer";
import { emitPlantStatusChangeEvent } from "@/lib/mailchimp/emit-plant-event";
import { syncCheckInToMailchimp } from "@/lib/mailchimp/sync-check-in";
import type { PlantStatus } from "@/lib/plant-status";
import { plantCheckInLabel } from "@/lib/plants/internal-notes";

export type CreatedCheckInPlant = {
  clientId: string;
  plantId: string;
  status: PlantStatus;
};

export type CreateCheckInRecordsResult =
  | {
      success: true;
      visitId: string;
      customerId: string;
      plants: CreatedCheckInPlant[];
    }
  | { success: false; error: string };

type CreateCheckInOptions = {
  /** When true, skip Mailchimp (caller runs sync after photos succeed). */
  deferMailchimp?: boolean;
};

function buildLegacyVisitNotes(plants: CreateCheckInInput["plants"]): string | null {
  const lines = plants
    .map((plant, index) => {
      const notes = plant.notes.trim();
      if (!notes) return null;
      return `${plantCheckInLabel(plant, index + 1)}: ${notes}`;
    })
    .filter((line): line is string => Boolean(line));

  return lines.length > 0 ? lines.join("\n") : null;
}

function isMissingPlantNotesColumnError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("notes") && lower.includes("plants");
}

export async function createCheckInRecordsWithClient(
  supabase: SupabaseClient,
  input: CreateCheckInInput,
  options: CreateCheckInOptions = {},
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
        notes: null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (visitError || !visitRow) {
      throw new Error(visitError?.message ?? "Could not create visit");
    }

    visitId = visitRow.id;

    const plantRows = plants.map((plant) => {
      // Yes or Not sure → Quarantine; No → Check-in.
      const initialStatus: PlantStatus =
        plant.bugsFound === false ? "check_in" : "quarantine";
      const notes = plant.notes.trim() || null;
      return {
        clientId: plant.clientId,
        status: initialStatus,
        insertWithNotes: {
          visit_id: visitRow.id,
          name: plant.name.trim() || null,
          species: plant.species.trim() || null,
          size: plant.size,
          status: initialStatus,
          bugs_found: plant.bugsFound ?? null,
          bugs_found_ever: plant.bugsFound === true,
          notes,
        },
        insertLegacy: {
          visit_id: visitRow.id,
          name: plant.name.trim() || null,
          species: plant.species.trim() || null,
          size: plant.size,
          status: initialStatus,
          bugs_found: plant.bugsFound ?? null,
          bugs_found_ever: plant.bugsFound === true,
        },
      };
    });

    let { data: insertedPlants, error: plantError } = await supabase
      .from("plants")
      .insert(plantRows.map((row) => row.insertWithNotes))
      .select("id");

    if (plantError && isMissingPlantNotesColumnError(plantError.message)) {
      const legacyNotes = buildLegacyVisitNotes(plants);
      if (legacyNotes) {
        const { error: visitNotesError } = await supabase
          .from("visits")
          .update({ notes: legacyNotes })
          .eq("id", visitRow.id);
        if (visitNotesError) {
          throw new Error(visitNotesError.message);
        }
      }

      ({ data: insertedPlants, error: plantError } = await supabase
        .from("plants")
        .insert(plantRows.map((row) => row.insertLegacy))
        .select("id"));
    }

    if (plantError || !insertedPlants || insertedPlants.length !== plantRows.length) {
      throw new Error(plantError?.message ?? "Could not create plants");
    }

    const createdPlants: CreatedCheckInPlant[] = plantRows.map((row, index) => ({
      clientId: row.clientId,
      plantId: insertedPlants[index]!.id,
      status: row.status,
    }));

    const { error: historyError } = await supabase.from("status_history").insert(
      createdPlants.map((plant) => ({
        plant_id: plant.plantId,
        previous_status: null,
        new_status: plant.status,
        changed_by: user.id,
      })),
    );

    if (historyError) {
      throw new Error(historyError.message);
    }

    if (!options.deferMailchimp) {
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
    }

    return {
      success: true,
      visitId: visitRow.id,
      customerId: customerResult.id,
      plants: createdPlants,
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

  const { error } = await supabase.rpc("rollback_check_in_visit", {
    p_visit_id: visitId,
  });

  if (!error) {
    return;
  }

  // Fallback before migration 0022: direct delete with ownership check.
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
    throw new Error(deleteError.message || error.message);
  }
}
