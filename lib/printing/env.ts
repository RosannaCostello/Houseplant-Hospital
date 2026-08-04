import "server-only";

import { getEnv } from "@/lib/env";

export function isPrintBridgeConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.PRINT_BRIDGE_URL && env.PRINT_BRIDGE_SECRET);
}

export function getPrintBridgeConfig():
  | { configured: false }
  | { configured: true; url: string; secret: string } {
  const env = getEnv();
  if (!env.PRINT_BRIDGE_URL || !env.PRINT_BRIDGE_SECRET) {
    return { configured: false };
  }
  return {
    configured: true,
    url: env.PRINT_BRIDGE_URL.replace(/\/$/, ""),
    secret: env.PRINT_BRIDGE_SECRET,
  };
}
