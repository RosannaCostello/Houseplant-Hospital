import "server-only";

import { getEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export function isPrintBridgeSecretConfigured(): boolean {
  return Boolean(getEnv().PRINT_BRIDGE_SECRET);
}

export function isPrintBridgeConfigured(): boolean {
  // URL may live only in print_bridge_runtime (tunnel re-registers after reboot).
  return isPrintBridgeSecretConfigured();
}

async function readRuntimeBridgeUrl(): Promise<string | null> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("print_bridge_runtime")
      .select("base_url")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data?.base_url) return null;
    const url = String(data.base_url).trim().replace(/\/$/, "");
    return url || null;
  } catch {
    return null;
  }
}

export async function getPrintBridgeConfig(): Promise<
  | { configured: false; reason: string }
  | { configured: true; url: string; secret: string }
> {
  const env = getEnv();
  if (!env.PRINT_BRIDGE_SECRET) {
    return { configured: false, reason: "PRINT_BRIDGE_SECRET not configured" };
  }

  const fromRuntime = await readRuntimeBridgeUrl();
  const fromEnv = env.PRINT_BRIDGE_URL?.replace(/\/$/, "") || null;
  const url = fromRuntime || fromEnv;

  if (!url) {
    return {
      configured: false,
      reason: "No print bridge URL (tunnel has not registered yet)",
    };
  }

  return {
    configured: true,
    url,
    secret: env.PRINT_BRIDGE_SECRET,
  };
}

/** Allowed public tunnel hosts the Mini may register. */
export function isAllowedPrintBridgeUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  return (
    host.endsWith(".trycloudflare.com") ||
    host.endsWith(".cfargotunnel.com") ||
    host === "localhost" ||
    host === "127.0.0.1"
  );
}
