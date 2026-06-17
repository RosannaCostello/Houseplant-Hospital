import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type BugsSurchargeRule = {
  percent: number;
};

/** Active bugs surcharge from pricing_rules (admin read). */
export async function getBugsSurchargeRule(): Promise<BugsSurchargeRule | null> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("pricing_rules")
    .select("percent")
    .eq("rule_type", "bugs_surcharge")
    .eq("active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load bugs surcharge rule: ${error.message}`);
  }

  if (!data) return null;

  return { percent: Number(data.percent) };
}
