"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  deferPosCheckoutForDraftWithClient,
  getDraftCheckoutStateWithClient,
  isPosCheckoutRequired,
  queuePosCheckoutForDraftWithClient,
  type DraftCheckoutState,
} from "@/lib/check-in/pos-checkout";
import { checkInPlantsStepSchema } from "@/lib/check-in/plant-schema";
import { canProceedToPhotosStep } from "@/lib/shopify/pos-checkout-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const draftIdSchema = z.string().uuid();

export async function fetchDraftCheckoutState(draftId: string) {
  const idParsed = draftIdSchema.safeParse(draftId);
  if (!idParsed.success) return null;

  const supabase = await createSupabaseServerClient();
  const state = await getDraftCheckoutStateWithClient(supabase, idParsed.data);
  const posCheckoutRequired = isPosCheckoutRequired();

  const checkout: DraftCheckoutState = state ?? {
    status: "not_started",
    queuedAt: null,
    paidAt: null,
    shopifyOrderId: null,
    summaryLines: [],
  };

  return {
    ...checkout,
    posCheckoutRequired,
    canProceedToPhotos: canProceedToPhotosStep(checkout.status, posCheckoutRequired),
  };
}

export async function queuePosCheckout(
  draftId: string,
  plants: z.infer<typeof checkInPlantsStepSchema>["plants"],
) {
  const idParsed = draftIdSchema.safeParse(draftId);
  const plantsParsed = checkInPlantsStepSchema.safeParse({ plants });

  if (!idParsed.success || !plantsParsed.success) {
    return { success: false as const, error: "Invalid draft or plant data." };
  }

  if (!isPosCheckoutRequired()) {
    return { success: false as const, error: "Shopify POS checkout is not configured." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await queuePosCheckoutForDraftWithClient(
    supabase,
    idParsed.data,
    plantsParsed.data.plants,
  );

  if (result.success) {
    revalidatePath("/app");
  }

  return result;
}

export async function deferPosCheckout(
  draftId: string,
  plants: z.infer<typeof checkInPlantsStepSchema>["plants"],
) {
  const idParsed = draftIdSchema.safeParse(draftId);
  const plantsParsed = checkInPlantsStepSchema.safeParse({ plants });

  if (!idParsed.success || !plantsParsed.success) {
    return { success: false as const, error: "Invalid draft or plant data." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await deferPosCheckoutForDraftWithClient(
    supabase,
    idParsed.data,
    plantsParsed.data.plants,
  );

  if (result.success) {
    revalidatePath("/app");
  }

  return result;
}
