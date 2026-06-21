import type { SupabaseClient } from "@supabase/supabase-js";

export type SessionProfile = {
  email: string | null;
  isAdmin: boolean;
};

export async function getSessionProfile(supabase: SupabaseClient): Promise<SessionProfile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { email: null, isAdmin: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    email: user.email ?? null,
    isAdmin: profile?.role === "admin",
  };
}
