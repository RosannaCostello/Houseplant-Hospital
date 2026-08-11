import "server-only";

import { isAllowedPrintBridgeUrl } from "@/lib/printing/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type RegisterPrintBridgeUrlResult =
  | { success: true; baseUrl: string }
  | { success: false; error: string };

export async function registerPrintBridgeUrl(
  rawUrl: string,
): Promise<RegisterPrintBridgeUrlResult> {
  const baseUrl = rawUrl.trim().replace(/\/$/, "");
  if (!isAllowedPrintBridgeUrl(baseUrl)) {
    return {
      success: false,
      error: "URL must be https and a Cloudflare tunnel host (trycloudflare.com / cfargotunnel.com).",
    };
  }

  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return { success: false, error: "SUPABASE_SERVICE_ROLE_KEY missing on server." };
  }

  const { error } = await admin.from("print_bridge_runtime").upsert({
    id: 1,
    base_url: baseUrl,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, baseUrl };
}
