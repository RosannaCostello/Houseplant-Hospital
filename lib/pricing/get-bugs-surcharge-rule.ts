import { DEFAULT_BUGS_SURCHARGE_PERCENT } from "@/lib/pricing/defaults";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export { DEFAULT_BUGS_SURCHARGE_PERCENT };

export type BugsSurchargeRule = {
  percent: number;
};

/** Active bugs surcharge from pricing_rules (admin read), with HIL-9 default fallback. */
export async function getBugsSurchargeRule(): Promise<BugsSurchargeRule> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("pricing_rules")
    .select("percent")
    .eq("rule_type", "bugs_surcharge")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load bugs surcharge rule: ${error.message}`);
  }

  if (!data) {
    return { percent: DEFAULT_BUGS_SURCHARGE_PERCENT };
  }

  return { percent: Number(data.percent) };
}
