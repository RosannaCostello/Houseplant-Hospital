import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlantSize } from "@/lib/plant-size";

type BasePriceRuleRow = {
  id: string;
  updated_at: string;
  shopify_synced_at: string | null;
  pests_amount: number | null;
};

function pickCanonicalRule(rows: BasePriceRuleRow[]): BasePriceRuleRow {
  return [...rows].sort((a, b) => {
    const aSynced = a.shopify_synced_at ? 1 : 0;
    const bSynced = b.shopify_synced_at ? 1 : 0;
    if (aSynced !== bSynced) return bSynced - aSynced;

    const aPests = a.pests_amount != null ? 1 : 0;
    const bPests = b.pests_amount != null ? 1 : 0;
    if (aPests !== bPests) return bPests - aPests;

    return b.updated_at.localeCompare(a.updated_at);
  })[0];
}

/**
 * Returns the single canonical active base_price row for a size.
 * Deactivates duplicate active rows (e.g. from repeated seed/sync inserts).
 */
export async function getCanonicalBasePriceRuleId(
  supabase: SupabaseClient,
  size: PlantSize,
): Promise<string | null> {
  const { data: rows, error } = await supabase
    .from("pricing_rules")
    .select("id, updated_at, shopify_synced_at, pests_amount")
    .eq("rule_type", "base_price")
    .eq("size", size)
    .eq("active", true)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load pricing rule for ${size}: ${error.message}`);
  }

  if (!rows?.length) {
    return null;
  }

  if (rows.length === 1) {
    return rows[0].id;
  }

  const canonical = pickCanonicalRule(rows);
  const duplicateIds = rows.filter((row) => row.id !== canonical.id).map((row) => row.id);

  if (duplicateIds.length > 0) {
    const { error: deactivateError } = await supabase
      .from("pricing_rules")
      .update({ active: false })
      .in("id", duplicateIds);

    if (deactivateError) {
      throw new Error(`Failed to dedupe pricing rules for ${size}: ${deactivateError.message}`);
    }
  }

  return canonical.id;
}
