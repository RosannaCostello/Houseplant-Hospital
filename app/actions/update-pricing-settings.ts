"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PLANT_SIZES } from "@/lib/plant-size";
import {
  updatePricingSettingsWithClient,
  type UpdatePricingSettingsInput,
} from "@/lib/pricing/update-pricing-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const basePricesSchema = z.object(
  Object.fromEntries(PLANT_SIZES.map((size) => [size, z.coerce.number()])) as Record<
    (typeof PLANT_SIZES)[number],
    z.ZodNumber
  >,
);

const updatePricingSettingsSchema = z.object({
  basePrices: basePricesSchema,
  bugsSurchargePercent: z.coerce.number(),
});

export type UpdatePricingSettingsActionResult = Awaited<
  ReturnType<typeof updatePricingSettingsWithClient>
>;

export async function updatePricingSettingsAction(
  input: UpdatePricingSettingsInput,
): Promise<UpdatePricingSettingsActionResult> {
  const parsed = updatePricingSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid pricing settings." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await updatePricingSettingsWithClient(supabase, parsed.data);

  if (result.success) {
    revalidatePath("/settings");
    revalidatePath("/app");
  }

  return result;
}
