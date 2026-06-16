import Link from "next/link";
import { redirect } from "next/navigation";
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

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Settings</h1>
        <Link href="/app" className="text-sm text-zinc-600 hover:text-zinc-900">
          Back to dashboard
        </Link>
      </div>
      <p className="text-sm text-zinc-600">Admin-only. Pricing and user management coming in Phase 3.</p>
    </div>
  );
}
