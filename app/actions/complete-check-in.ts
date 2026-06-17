"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createCheckInSchema } from "@/lib/check-in/create-check-in-input";
import {
  createCheckInRecordsWithClient,
  rollbackCheckInWithClient,
} from "@/lib/check-in/create-check-in-records";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type { CreateCheckInInput } from "@/lib/check-in/create-check-in-input";

export type CreateCheckInResult = Awaited<ReturnType<typeof createCheckInRecordsWithClient>>;
export type RollbackCheckInResult = { success: true } | { success: false; error: string };

/** Server-side wrapper — prefer client flow on Cloudflare preview. */
export async function createCheckInRecords(
  input: Parameters<typeof createCheckInRecordsWithClient>[1],
): Promise<CreateCheckInResult> {
  const parsed = createCheckInSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Check-in data is invalid. Review each step and try again." };
  }

  const supabase = await createSupabaseServerClient();
  return createCheckInRecordsWithClient(supabase, parsed.data);
}

const rollbackCheckInSchema = z.object({
  visitId: z.string().uuid(),
});

export async function rollbackCheckIn(visitId: string): Promise<RollbackCheckInResult> {
  const parsed = rollbackCheckInSchema.safeParse({ visitId });
  if (!parsed.success) {
    return { success: false, error: "Invalid visit id." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  try {
    await rollbackCheckInWithClient(supabase, parsed.data.visitId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Rollback failed." };
  }
}

export async function finalizeCheckIn(): Promise<void> {
  revalidatePath("/app");
}
