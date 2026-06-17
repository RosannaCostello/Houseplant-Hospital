import { getAppBaseUrl } from "@/lib/app-base-url";

/** Full URL encoded on plant label QR codes (`/hh/case/{plantId}`). */
export async function getPlantCaseUrl(plantId: string): Promise<string> {
  const baseUrl = await getAppBaseUrl();
  return `${baseUrl}/hh/case/${plantId}`;
}
