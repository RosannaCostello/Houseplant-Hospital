import type { SupabaseClient, User } from "@supabase/supabase-js";

export type RequireAdminResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

export async function requireAdmin(supabase: SupabaseClient): Promise<RequireAdminResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (profile?.role !== "admin") {
    return { ok: false, error: "Admin access required." };
  }

  return { ok: true, user };
}
