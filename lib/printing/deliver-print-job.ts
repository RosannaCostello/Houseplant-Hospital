import "server-only";

import { getPrintBridgeConfig } from "@/lib/printing/env";
import type { PrintJobPayload } from "@/lib/printing/types";

export type DeliverPrintJobResult =
  | { ok: true; bridgeMessage?: string }
  | { ok: false; retryable: boolean; error: string };

/**
 * POST payload to Mac Mini print-bridge.
 * Network / 5xx → retryable (leave pending). 4xx → permanent failed.
 */
export async function deliverPrintJobToBridge(
  payload: PrintJobPayload,
): Promise<DeliverPrintJobResult> {
  const config = await getPrintBridgeConfig();
  if (!config.configured) {
    return {
      ok: false,
      retryable: true,
      error: config.reason,
    };
  }

  let response: Response;
  try {
    response = await fetch(`${config.url}/print`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.secret}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bridge unreachable";
    return { ok: false, retryable: true, error: message };
  }

  let body: { ok?: boolean; error?: string; message?: string } = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = {};
  }

  if (response.ok && body.ok !== false) {
    return {
      ok: true,
      bridgeMessage: typeof body.message === "string" ? body.message : undefined,
    };
  }

  const error =
    (typeof body.error === "string" && body.error) ||
    (typeof body.message === "string" && body.message) ||
    `Bridge HTTP ${response.status}`;

  const retryable = response.status >= 500 || response.status === 429;
  return { ok: false, retryable, error };
}
