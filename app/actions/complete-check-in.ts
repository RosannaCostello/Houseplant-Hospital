"use server";

import { revalidatePath } from "next/cache";
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

export async function rollbackCheckIn(visitId: string): Promise<RollbackCheckInResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  await rollbackCheckInWithClient(supabase, visitId);
  return { success: true };
}

export async function finalizeCheckIn(): Promise<void> {
  revalidatePath("/app");
}
