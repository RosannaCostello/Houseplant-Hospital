import { redirect } from "next/navigation";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { AnalyticsFilters } from "@/components/analytics/analytics-filters";
import { resolveAnalyticsDateRange } from "@/lib/analytics/date-range";
import { getAdminAnalytics } from "@/lib/analytics/get-admin-analytics";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AnalyticsPageProps = {
  searchParams: Promise<{
    preset?: string;
    start?: string;
    end?: string;
  }>;
};

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const supabase = await createSupabaseServerClient();
  const auth = await requireAdmin(supabase);

  if (!auth.ok) {
    redirect(auth.error === "You must be signed in." ? "/login" : "/app");
  }

  const params = await searchParams;
  const range = resolveAnalyticsDateRange(params);
  let analytics: Awaited<ReturnType<typeof getAdminAnalytics>> | null = null;
  let loadError: string | null = null;

  try {
    analytics = await getAdminAnalytics(range);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Analytics could not be loaded.";
  }

  if (analytics) {
    return <AnalyticsDashboard analytics={analytics} range={range} />;
  }

  return (
    <div className="pb-bottom-nav mx-auto w-full max-w-4xl space-y-5">
      <AnalyticsFilters range={range} />
      <section className="rounded-hilda border border-hilda-warning-border bg-hilda-warning-bg p-5">
        <h2 className="font-serif text-xl text-hilda-heading">Analytics is not ready yet</h2>
        <p className="mt-2 text-sm text-hilda-warning-text">{loadError}</p>
      </section>
    </div>
  );
}
