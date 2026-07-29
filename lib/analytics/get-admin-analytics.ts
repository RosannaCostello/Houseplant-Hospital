import "server-only";

import type { AnalyticsDateRange } from "@/lib/analytics/date-range";
import type { AdminAnalytics } from "@/lib/analytics/types";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAdminAnalytics(range: AnalyticsDateRange): Promise<AdminAnalytics> {
  const supabase = await createSupabaseServerClient();
  const auth = await requireAdmin(supabase);

  if (!auth.ok) {
    throw new Error(auth.error);
  }

  const { data, error } = await supabase.rpc("get_admin_analytics", {
    p_start: range.start.toISOString(),
    p_end: range.end.toISOString(),
    p_previous_start: range.previousStart.toISOString(),
    p_previous_end: range.previousEnd.toISOString(),
    p_bucket: range.bucket,
  });

  if (error) {
    if (error.message.includes("get_admin_analytics")) {
      throw new Error(
        "Analytics database migration is not applied yet. Apply migrations 0015 and 0016 before using Analytics.",
      );
    }
    throw new Error(`Failed to load analytics: ${error.message}`);
  }

  if (!data || typeof data !== "object") {
    throw new Error("Analytics returned no data.");
  }

  return data as AdminAnalytics;
}
