"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createOutpatientZoneOptionWithClient,
  deleteOutpatientZoneOptionWithClient,
  updateOutpatientZoneOptionWithClient,
} from "@/lib/outpatient-zones/mutate-outpatient-zone-options";
import { getOutpatientZoneOptionsWithClient } from "@/lib/outpatient-zones/get-outpatient-zone-options";
import type { OutpatientZoneOption } from "@/lib/outpatient-zones/types";
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

export async function createOutpatientZoneOptionAction(input: { label: string }) {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid zone option." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await createOutpatientZoneOptionWithClient(supabase, parsed.data);
  if (result.success) revalidatePaths();
  return result;
}

export async function updateOutpatientZoneOptionAction(input: { id: string; label: string }) {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid zone option." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await updateOutpatientZoneOptionWithClient(supabase, parsed.data);
  if (result.success) revalidatePaths();
  return result;
}

export async function deleteOutpatientZoneOptionAction(input: { id: string }) {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid zone option." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await deleteOutpatientZoneOptionWithClient(supabase, parsed.data.id);
  if (result.success) revalidatePaths();
  return result;
}

/** Active outpatient zones for staff pickers (status move confirm). */
export async function listOutpatientZonesAction(): Promise<
  { success: true; options: OutpatientZoneOption[] } | { success: false; error: string }
> {
  try {
    const supabase = await createSupabaseServerClient();
    const options = await getOutpatientZoneOptionsWithClient(supabase);
    return { success: true, options };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not load outpatient zones.",
    };
  }
}
