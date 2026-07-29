import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { getAcuityConfig } from "@/lib/acuity/env";

/**
 * Acuity signs webhook bodies with HMAC-SHA256 (API key) encoded as base64
 * in the `x-acuity-signature` header.
 */
export function verifyAcuityWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const config = getAcuityConfig();
  if (!config || !signatureHeader) return false;

  const expected = createHmac("sha256", config.apiKey).update(rawBody, "utf8").digest("base64");

  try {
    const expectedBuf = Buffer.from(expected);
    const actualBuf = Buffer.from(signatureHeader);
    if (expectedBuf.length !== actualBuf.length) return false;
    return timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}
