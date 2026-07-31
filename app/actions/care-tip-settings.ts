"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CARE_TIP_CATEGORIES } from "@/lib/care-tips/compose-parse";
import {
  createCareTipOptionWithClient,
  deleteCareTipOptionWithClient,
  updateCareTipOptionWithClient,
} from "@/lib/care-tips/mutate-care-tip-options";
import { updateTreatmentNotesPlaceholderWithClient } from "@/lib/care-tips/update-app-copy-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const categorySchema = z.enum(CARE_TIP_CATEGORIES);

const createSchema = z.object({
  category: categorySchema,
  label: z.string().min(1),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

const placeholderSchema = z.object({
  placeholder: z.string().min(1),
});

function revalidateCareTipPaths() {
  revalidatePath("/settings");
  revalidatePath("/app");
}

export async function createCareTipOptionAction(input: {
  category: string;
  label: string;
}) {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid care tip option." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await createCareTipOptionWithClient(supabase, parsed.data);
  if (result.success) revalidateCareTipPaths();
  return result;
}

export async function updateCareTipOptionAction(input: { id: string; label: string }) {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid care tip option." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await updateCareTipOptionWithClient(supabase, parsed.data);
  if (result.success) revalidateCareTipPaths();
  return result;
}

export async function deleteCareTipOptionAction(input: { id: string }) {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid care tip option." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await deleteCareTipOptionWithClient(supabase, parsed.data.id);
  if (result.success) revalidateCareTipPaths();
  return result;
}

export async function updateTreatmentNotesPlaceholderAction(input: {
  placeholder: string;
}) {
  const parsed = placeholderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid placeholder." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await updateTreatmentNotesPlaceholderWithClient(
    supabase,
    parsed.data.placeholder,
  );
  if (result.success) revalidateCareTipPaths();
  return result;
}
