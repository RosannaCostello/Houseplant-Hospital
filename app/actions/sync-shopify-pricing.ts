"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { syncPricingFromShopify, type SyncShopifyPricingResult } from "@/lib/shopify/sync-pricing-from-shopify";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SyncShopifyPricingActionResult = SyncShopifyPricingResult;

export async function syncShopifyPricingAction(): Promise<SyncShopifyPricingActionResult> {
  const supabase = await createSupabaseServerClient();
  const auth = await requireAdmin(supabase);

  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  const result = await syncPricingFromShopify();

  if (result.success) {
    revalidatePath("/settings");
    revalidatePath("/app");
  }

  return result;
}
