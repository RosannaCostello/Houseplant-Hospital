"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkInCustomerSchema } from "@/lib/check-in/customer-schema";
import { checkInPlantSchema } from "@/lib/check-in/plant-schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const createCheckInSchema = z.object({
  customer: checkInCustomerSchema,
  plants: z.array(checkInPlantSchema).min(1, "Add at least one plant"),
});

export type CreateCheckInInput = z.infer<typeof createCheckInSchema>;

export type CreateCheckInResult =
  | {
      success: true;
      visitId: string;
      plants: Array<{ clientId: string; plantId: string }>;
    }
  | { success: false; error: string };

export type RollbackCheckInResult = { success: true } | { success: false; error: string };

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

/** Creates customer, visit, and plants — photos upload separately from the browser. */
export async function createCheckInRecords(input: CreateCheckInInput): Promise<CreateCheckInResult> {
  const parsed = createCheckInSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Check-in data is invalid. Review each step and try again." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to complete check-in." };
  }

  const { customer, plants } = parsed.data;

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

export async function rollbackCheckIn(visitId: string): Promise<RollbackCheckInResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { error } = await supabase.from("visits").delete().eq("id", visitId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function finalizeCheckIn(): Promise<void> {
  revalidatePath("/app");
}
