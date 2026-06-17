import { headers } from "next/headers";
import { getEnv } from "@/lib/env";

function isLocalhostHost(host: string): boolean {
  const hostname = host.split(":")[0]?.toLowerCase() ?? host;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function isLocalhostUrl(url: string): boolean {
  try {
    return isLocalhostHost(new URL(url).hostname);
  } catch {
    return false;
  }
}

function originFromHost(host: string, proto: string | null): string {
  const scheme = proto ?? (isLocalhostHost(host) ? "http" : "https");
  return `${scheme}://${host}`;
}

/** Canonical app origin for links and QR codes. */
export async function getAppBaseUrl(): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const requestIsLocalhost = host ? isLocalhostHost(host) : false;

  const configured = getEnv().APP_BASE_URL;

  // Cloudflare often inherits APP_BASE_URL=http://localhost:3000 from .env.local — ignore off localhost.
  if (configured && !(isLocalhostUrl(configured) && !requestIsLocalhost)) {
    return configured.replace(/\/$/, "");
  }

  if (host) {
    return originFromHost(host, headerStore.get("x-forwarded-proto"));
  }

  return "http://localhost:3000";
}
