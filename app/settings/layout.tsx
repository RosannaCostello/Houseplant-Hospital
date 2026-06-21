import { AppShell } from "@/components/app/app-shell";
import { getSessionProfile } from "@/lib/auth/get-session-profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { email, isAdmin } = await getSessionProfile(supabase);

  return (
    <AppShell userEmail={email} isAdmin={isAdmin}>
      {children}
    </AppShell>
  );
}
