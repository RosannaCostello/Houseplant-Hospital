import { getAppBaseUrl } from "@/lib/app-base-url";

/** Public Customer Care Card URL for a drop-off (`/hh/care/{visitId}`). */
export async function getCareCardUrl(visitId: string): Promise<string> {
  const baseUrl = await getAppBaseUrl();
  return `${baseUrl}/hh/care/${visitId}`;
}

/**
 * @deprecated Prefer getCareCardUrl(visitId). Kept for print payload compat;
 * resolves via plant → visit when used.
 */
export async function getPlantCaseUrl(plantId: string): Promise<string> {
  const baseUrl = await getAppBaseUrl();
  return `${baseUrl}/hh/case/${plantId}`;
}
