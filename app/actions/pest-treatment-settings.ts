"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createPestTreatmentOptionWithClient,
  deletePestTreatmentOptionWithClient,
  updatePestTreatmentOptionWithClient,
} from "@/lib/pest-treatments/mutate-pest-treatment-options";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const createSchema = z.object({
  label: z.string().min(1),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

function revalidatePaths() {
  revalidatePath("/settings");
  revalidatePath("/app");
}

export async function createPestTreatmentOptionAction(input: { label: string }) {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid treatment option." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await createPestTreatmentOptionWithClient(supabase, parsed.data);
  if (result.success) revalidatePaths();
  return result;
}

export async function updatePestTreatmentOptionAction(input: { id: string; label: string }) {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid treatment option." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await updatePestTreatmentOptionWithClient(supabase, parsed.data);
  if (result.success) revalidatePaths();
  return result;
}

export async function deletePestTreatmentOptionAction(input: { id: string }) {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid treatment option." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await deletePestTreatmentOptionWithClient(supabase, parsed.data.id);
  if (result.success) revalidatePaths();
  return result;
}
