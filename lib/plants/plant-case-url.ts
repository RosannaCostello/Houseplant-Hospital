import { getAppBaseUrl } from "@/lib/app-base-url";
import { getEnv } from "@/lib/env";

/** Care Card path for a drop-off (no origin). */
export function careCardPath(visitId: string): string {
  return `/hh/care/${visitId}`;
}

/**
 * Absolute Care Card URL from `APP_BASE_URL` (cron / outbox / queue — no request headers).
 * Returns null when the env origin is missing.
 */
export function careCardUrlFromEnv(visitId: string): string | null {
  const configured = getEnv().APP_BASE_URL?.trim();
  if (!configured) return null;
  return `${configured.replace(/\/$/, "")}${careCardPath(visitId)}`;
}

/** Public Customer Care Card URL for a drop-off (`/hh/care/{visitId}`). */
export async function getCareCardUrl(visitId: string): Promise<string> {
  const baseUrl = await getAppBaseUrl();
  return `${baseUrl}${careCardPath(visitId)}`;
}

/**
 * @deprecated Prefer getCareCardUrl(visitId). Kept for print payload compat;
 * resolves via plant → visit when used.
 */
export async function getPlantCaseUrl(plantId: string): Promise<string> {
  const baseUrl = await getAppBaseUrl();
  return `${baseUrl}/hh/case/${plantId}`;
}
