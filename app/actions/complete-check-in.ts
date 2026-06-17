"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkInCustomerSchema } from "@/lib/check-in/customer-schema";
import { checkInPlantSchema } from "@/lib/check-in/plant-schema";
import { removePlantPhotoFiles, uploadPlantPhoto } from "@/lib/photos/upload-plant-photo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const checkInPhotoPayloadSchema = z.object({
  mimeType: z.enum(["image/webp", "image/jpeg"]),
  dataUrl: z.string().startsWith("data:image/"),
  thumbnailDataUrl: z.string().startsWith("data:image/"),
  byteSize: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  thumbnailByteSize: z.number().positive(),
});

const completeCheckInSchema = z.object({
  customer: checkInCustomerSchema,
  plants: z
    .array(
      checkInPlantSchema.extend({
        photo: checkInPhotoPayloadSchema,
      }),
    )
    .min(1, "Add at least one plant"),
});

export type CompleteCheckInInput = z.infer<typeof completeCheckInSchema>;

export type CompleteCheckInResult =
  | { success: true; visitId: string; plantIds: string[] }
  | { success: false; error: string };

function buildVisitNotes(plants: CompleteCheckInInput["plants"]): string | null {
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

export async function completeCheckIn(input: CompleteCheckInInput): Promise<CompleteCheckInResult> {
  const parsed = completeCheckInSchema.safeParse(input);

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
  const uploadedPaths: string[] = [];
  let visitId: string | null = null;

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

    visitId = visitRow.id;

    const plantIds: string[] = [];

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

      plantIds.push(plantRow.id);

      const uploaded = await uploadPlantPhoto(supabase, {
        plantId: plantRow.id,
        mimeType: plant.photo.mimeType,
        dataUrl: plant.photo.dataUrl,
        thumbnailDataUrl: plant.photo.thumbnailDataUrl,
      });

      uploadedPaths.push(uploaded.storagePath, uploaded.thumbnailPath);
    }

    revalidatePath("/app");

    return { success: true, visitId: visitRow.id, plantIds };
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await removePlantPhotoFiles(supabase, uploadedPaths);
    }

    if (visitId) {
      await supabase.from("visits").delete().eq("id", visitId);
    }

    const message = error instanceof Error ? error.message : "Check-in failed";
    return { success: false, error: message };
  }
}
