import { getEnv } from "@/lib/env";

/** Full URL encoded on plant label QR codes (`APP_BASE_URL` + `/hh/case/{plantId}`). */
export function getPlantCaseUrl(plantId: string): string {
  const baseUrl = getEnv().APP_BASE_URL ?? "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/hh/case/${plantId}`;
}
