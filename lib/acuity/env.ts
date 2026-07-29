import "server-only";

function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  return value;
}

export type AcuityConfig = {
  userId: string;
  apiKey: string;
};

export function getAcuityConfig(): AcuityConfig | null {
  const userId = emptyToUndefined(process.env.ACUITY_USER_ID);
  const apiKey = emptyToUndefined(process.env.ACUITY_API_KEY);
  if (!userId || !apiKey) return null;
  return { userId, apiKey };
}

export function isAcuityConfigured(): boolean {
  return getAcuityConfig() !== null;
}
