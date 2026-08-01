"use server";

import { z } from "zod";
import {
  checkOutpatientReadinessWithClient,
  formatOutpatientReadinessMessage,
  type OutpatientReadinessMissing,
} from "@/lib/plants/outpatient-readiness";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  plantId: z.string().uuid(),
});

export type CheckOutpatientReadinessActionResult =
  | { ready: true }
  | { ready: false; missing: OutpatientReadinessMissing[]; message: string };

export async function checkOutpatientReadinessAction(
  plantId: string,
): Promise<CheckOutpatientReadinessActionResult> {
  const parsed = schema.safeParse({ plantId });
  if (!parsed.success) {
    return {
      ready: false,
      missing: ["pests", "treatment_notes", "care_tips", "pest_treatments"],
      message: "Invalid plant.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const result = await checkOutpatientReadinessWithClient(supabase, parsed.data.plantId);

  if (result.ready) {
    return { ready: true };
  }

  return {
    ready: false,
    missing: result.missing,
    message: formatOutpatientReadinessMessage(result.missing),
  };
}
