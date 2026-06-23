import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { CheckInDraftDetail, CheckInDraftStep } from "@/lib/check-in/check-in-draft-types";
import { checkInCustomerSchema } from "@/lib/check-in/customer-schema";
import { checkInPlantSchema, type CheckInPlant } from "@/lib/check-in/plant-schema";
import { resolveCheckInCustomerId } from "@/lib/check-in/resolve-check-in-customer";
import { signPhotoPaths } from "@/lib/photos/sign-photo-urls";

type DraftPhotoRow = {
  plant_client_id: string;
  storage_path: string;
  thumbnail_path: string;
  mime_type: string;
  byte_size: number;
  width: number;
  height: number;
};

function parsePlants(value: unknown): CheckInPlant[] {
  const parsed = draftPlantsSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

const draftPlantsSchema = z.array(checkInPlantSchema);

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function parseDraftRow(
  raw: unknown,
  photos: DraftPhotoRow[],
  signed: Map<string, string>,
): CheckInDraftDetail | null {
  if (!raw || typeof raw !== "object") return null;

  const row = raw as {
    id?: string;
    customer_id?: string;
    plants?: unknown;
    draft_step?: CheckInDraftStep;
    created_at?: string;
    updated_at?: string;
    customers?:
      | {
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
          marketing_consent: boolean;
        }
      | Array<{
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
          marketing_consent: boolean;
        }>;
  };

  const customerRow = unwrapRelation(row.customers);

  if (
    !row.id ||
    !row.customer_id ||
    !row.draft_step ||
    !row.created_at ||
    !row.updated_at ||
    !customerRow
  ) {
    return null;
  }

  const customer = checkInCustomerSchema.parse({
    firstName: customerRow.first_name,
    lastName: customerRow.last_name,
    email: customerRow.email,
    phone: customerRow.phone ?? "",
    marketingConsent: customerRow.marketing_consent,
  });

  return {
    id: row.id,
    customerId: row.customer_id,
    customer,
    plants: parsePlants(row.plants),
    draftStep: row.draft_step,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    photos: photos.map((photo) => ({
      plantClientId: photo.plant_client_id,
      mimeType: photo.mime_type as "image/webp" | "image/jpeg",
      thumbnailUrl: signed.get(photo.thumbnail_path) ?? "",
      previewUrl: signed.get(photo.storage_path) ?? "",
      byteSize: photo.byte_size,
      width: photo.width,
      height: photo.height,
    })),
  };
}

export async function getCheckInDraftWithClient(
  supabase: SupabaseClient,
  draftId: string,
): Promise<CheckInDraftDetail | null> {
  const { data: row, error } = await supabase
    .from("check_in_drafts")
    .select(
      "id, customer_id, plants, draft_step, created_at, updated_at, customers ( first_name, last_name, email, phone, marketing_consent )",
    )
    .eq("id", draftId)
    .maybeSingle();

  if (error || !row) {
    return null;
  }

  const { data: photoRows, error: photoError } = await supabase
    .from("check_in_draft_photos")
    .select("plant_client_id, storage_path, thumbnail_path, mime_type, byte_size, width, height")
    .eq("draft_id", draftId);

  if (photoError) {
    return null;
  }

  const paths = (photoRows ?? []).flatMap((photo) => [photo.storage_path, photo.thumbnail_path]);
  const signed = await signPhotoPaths(paths, supabase);

  return parseDraftRow(row, (photoRows ?? []) as DraftPhotoRow[], signed);
}

export async function createCheckInDraftWithClient(
  supabase: SupabaseClient,
  customer: z.infer<typeof checkInCustomerSchema>,
): Promise<{ success: true; draftId: string } | { success: false; error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to start check-in." };
  }

  const customerResult = await resolveCheckInCustomerId(supabase, customer);
  if ("error" in customerResult) {
    return { success: false, error: customerResult.error };
  }

  const { data: draft, error } = await supabase
    .from("check_in_drafts")
    .insert({
      customer_id: customerResult.id,
      plants: [],
      draft_step: "plants",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !draft) {
    return { success: false, error: error?.message ?? "Could not create draft check-in." };
  }

  return { success: true, draftId: draft.id };
}

export async function updateCheckInDraftCustomerWithClient(
  supabase: SupabaseClient,
  draftId: string,
  customer: z.infer<typeof checkInCustomerSchema>,
): Promise<{ success: true } | { success: false; error: string }> {
  const customerResult = await resolveCheckInCustomerId(supabase, customer);
  if ("error" in customerResult) {
    return { success: false, error: customerResult.error };
  }

  const { error } = await supabase
    .from("check_in_drafts")
    .update({ customer_id: customerResult.id })
    .eq("id", draftId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateCheckInDraftWithClient(
  supabase: SupabaseClient,
  draftId: string,
  input: { plants: CheckInPlant[]; draftStep: CheckInDraftStep },
): Promise<{ success: true } | { success: false; error: string }> {
  const plantClientIds = new Set(input.plants.map((plant) => plant.clientId));

  const { data: existingPhotos, error: photoLookupError } = await supabase
    .from("check_in_draft_photos")
    .select("plant_client_id, storage_path, thumbnail_path")
    .eq("draft_id", draftId);

  if (photoLookupError) {
    return { success: false, error: photoLookupError.message };
  }

  const orphaned = (existingPhotos ?? []).filter(
    (photo) => !plantClientIds.has(photo.plant_client_id),
  );

  if (orphaned.length > 0) {
    const paths = orphaned.flatMap((photo) => [photo.storage_path, photo.thumbnail_path]);
    await supabase.storage.from("plant-photos").remove(paths);
    await supabase
      .from("check_in_draft_photos")
      .delete()
      .eq("draft_id", draftId)
      .in(
        "plant_client_id",
        orphaned.map((photo) => photo.plant_client_id),
      );
  }

  const { error } = await supabase
    .from("check_in_drafts")
    .update({
      plants: input.plants,
      draft_step: input.draftStep,
    })
    .eq("id", draftId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteCheckInDraftWithClient(
  supabase: SupabaseClient,
  draftId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const { data: photos, error: photoError } = await supabase
    .from("check_in_draft_photos")
    .select("storage_path, thumbnail_path")
    .eq("draft_id", draftId);

  if (photoError) {
    return { success: false, error: photoError.message };
  }

  const paths = (photos ?? []).flatMap((photo) => [photo.storage_path, photo.thumbnail_path]);
  if (paths.length > 0) {
    await supabase.storage.from("plant-photos").remove(paths);
  }

  const { error } = await supabase.from("check_in_drafts").delete().eq("id", draftId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
