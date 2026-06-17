import { headers } from "next/headers";
import { getEnv } from "@/lib/env";

/** Canonical app origin for links and QR codes. */
export async function getAppBaseUrl(): Promise<string> {
  const configured = getEnv().APP_BASE_URL;

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");

  if (host) {
    const proto =
      headerStore.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return "http://localhost:3000";
}
