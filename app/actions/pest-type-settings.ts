"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createPestTypeOptionWithClient,
  deletePestTypeOptionWithClient,
  updatePestTypeOptionWithClient,
} from "@/lib/pest-types/mutate-pest-type-options";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const createSchema = z.object({
  label: z.string().min(1),
  paragraph: z.string(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1),
  paragraph: z.string(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

function revalidatePaths() {
  revalidatePath("/settings");
  revalidatePath("/app");
}

export async function createPestTypeOptionAction(input: {
  label: string;
  paragraph: string;
}) {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid pest type option." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await createPestTypeOptionWithClient(supabase, parsed.data);
  if (result.success) revalidatePaths();
  return result;
}

export async function updatePestTypeOptionAction(input: {
  id: string;
  label: string;
  paragraph: string;
}) {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid pest type option." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await updatePestTypeOptionWithClient(supabase, parsed.data);
  if (result.success) revalidatePaths();
  return result;
}

export async function deletePestTypeOptionAction(input: { id: string }) {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid pest type option." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await deletePestTypeOptionWithClient(supabase, parsed.data.id);
  if (result.success) revalidatePaths();
  return result;
}
