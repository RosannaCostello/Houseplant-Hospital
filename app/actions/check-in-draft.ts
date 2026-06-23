"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createCheckInDraftWithClient,
  deleteCheckInDraftWithClient,
  getCheckInDraftWithClient,
  updateCheckInDraftCustomerWithClient,
  updateCheckInDraftWithClient,
} from "@/lib/check-in/check-in-draft";
import { checkInCustomerSchema } from "@/lib/check-in/customer-schema";
import { finalizeCheckInDraftWithClient } from "@/lib/check-in/finalize-check-in-draft";
import { checkInPlantsStepSchema } from "@/lib/check-in/plant-schema";
import { deleteCheckInDraftPhotoWithClient, uploadCheckInDraftPhotoWithClient } from "@/lib/photos/upload-draft-photo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const draftIdSchema = z.string().uuid();

export async function createCheckInDraft(customer: z.infer<typeof checkInCustomerSchema>) {
  const parsed = checkInCustomerSchema.safeParse(customer);
  if (!parsed.success) {
    return { success: false as const, error: "Customer details are invalid." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await createCheckInDraftWithClient(supabase, parsed.data);

  if (result.success) {
    revalidatePath("/app");
  }

  return result;
}

export async function updateCheckInDraftCustomer(
  draftId: string,
  customer: z.infer<typeof checkInCustomerSchema>,
) {
  const idParsed = draftIdSchema.safeParse(draftId);
  const customerParsed = checkInCustomerSchema.safeParse(customer);

  if (!idParsed.success || !customerParsed.success) {
    return { success: false as const, error: "Invalid draft or customer data." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await updateCheckInDraftCustomerWithClient(
    supabase,
    idParsed.data,
    customerParsed.data,
  );

  if (result.success) {
    revalidatePath("/app");
  }

  return result;
}

export async function updateCheckInDraftPlants(
  draftId: string,
  plants: z.infer<typeof checkInPlantsStepSchema>["plants"],
) {
  const idParsed = draftIdSchema.safeParse(draftId);
  const plantsParsed = checkInPlantsStepSchema.safeParse({ plants });

  if (!idParsed.success || !plantsParsed.success) {
    return { success: false as const, error: "Plant details are invalid." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await updateCheckInDraftWithClient(supabase, idParsed.data, {
    plants: plantsParsed.data.plants,
    draftStep: "photos",
  });

  if (result.success) {
    revalidatePath("/app");
  }

  return result;
}

const uploadDraftPhotoSchema = z.object({
  draftId: z.string().uuid(),
  plantClientId: z.string().min(1),
  mimeType: z.enum(["image/webp", "image/jpeg"]),
  dataUrl: z.string().startsWith("data:"),
  thumbnailDataUrl: z.string().startsWith("data:"),
  byteSize: z.number().nonnegative(),
  width: z.number().positive(),
  height: z.number().positive(),
});

export async function uploadCheckInDraftPhoto(input: z.infer<typeof uploadDraftPhotoSchema>) {
  const parsed = uploadDraftPhotoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Photo data is invalid." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await uploadCheckInDraftPhotoWithClient(supabase, parsed.data);

  if (result.success) {
    revalidatePath("/app");
  }

  return result;
}

export async function deleteCheckInDraftPhoto(draftId: string, plantClientId: string) {
  const idParsed = draftIdSchema.safeParse(draftId);
  if (!idParsed.success || !plantClientId) {
    return { success: false as const, error: "Invalid draft or plant." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await deleteCheckInDraftPhotoWithClient(
    supabase,
    idParsed.data,
    plantClientId,
  );

  if (result.success) {
    revalidatePath("/app");
  }

  return result;
}

export async function finalizeCheckInDraft(draftId: string) {
  const idParsed = draftIdSchema.safeParse(draftId);
  if (!idParsed.success) {
    return { success: false as const, error: "Invalid draft id." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await finalizeCheckInDraftWithClient(supabase, idParsed.data);

  if (result.success) {
    revalidatePath("/app");
  }

  return result;
}

export async function deleteCheckInDraft(draftId: string) {
  const idParsed = draftIdSchema.safeParse(draftId);
  if (!idParsed.success) {
    return { success: false as const, error: "Invalid draft id." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await deleteCheckInDraftWithClient(supabase, idParsed.data);

  if (result.success) {
    revalidatePath("/app");
  }

  return result;
}

export async function fetchCheckInDraft(draftId: string) {
  const idParsed = draftIdSchema.safeParse(draftId);
  if (!idParsed.success) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  return getCheckInDraftWithClient(supabase, idParsed.data);
}
