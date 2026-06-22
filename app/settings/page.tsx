import { redirect } from "next/navigation";
import { PricingSettingsForm } from "@/components/settings/pricing-settings-form";
import { getPricingSettings } from "@/lib/pricing/get-pricing-settings";
import {
  shouldRunDailyShopifySync,
  syncPricingFromShopify,
} from "@/lib/shopify/sync-pricing-from-shopify";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") redirect("/app");

  let autoSyncError: string | null = null;

  if (await shouldRunDailyShopifySync()) {
    const autoSync = await syncPricingFromShopify();
    if (!autoSync.success) {
      autoSyncError = autoSync.error;
    }
  }

  const settings = await getPricingSettings();

  return (
    <div className="pb-bottom-nav mx-auto max-w-5xl space-y-8">
      {autoSyncError ? (
        <p className="rounded-none border border-hilda-error-border bg-hilda-error-bg px-4 py-3 text-sm text-hilda-error-text-strong">
          Automatic Shopify sync failed: {autoSyncError}
        </p>
      ) : null}

      <section className="rounded-none border border-hilda-border/15 bg-hilda-surface p-5 shadow-sm">
        <PricingSettingsForm settings={settings} />
      </section>
    </div>
  );
}
