import Link from "next/link";
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
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Settings</h1>
        <Link href="/app" className="text-sm text-zinc-600 hover:text-zinc-900">
          Back to dashboard
        </Link>
      </div>

      {autoSyncError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Automatic Shopify sync failed: {autoSyncError}
        </p>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <PricingSettingsForm settings={settings} />
      </section>
    </div>
  );
}
