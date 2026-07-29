import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { BridgeConfig } from "./config.js";
import { renderLabelHtml } from "./label.js";
import type { PrintJobPayload } from "./payload.js";

const bridgeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export type PrintResult = {
  mode: "dry-run" | "print";
  htmlPath?: string;
  message: string;
};

/**
 * HIL-80: accept + render. HIL-82 will shell out to `lp` with the CUPS queue.
 * Dry-run always writes HTML so we can open it in a browser on the Mini.
 */
export async function handlePrintJob(
  payload: PrintJobPayload,
  config: BridgeConfig,
): Promise<PrintResult> {
  const html = renderLabelHtml(payload);
  const tmpDir = path.join(bridgeRoot, ".tmp");
  await mkdir(tmpDir, { recursive: true });
  const stamp = payload.jobId ?? `${Date.now()}-${payload.plantId.slice(0, 8)}`;
  const htmlPath = path.join(tmpDir, `label-${stamp}.html`);
  await writeFile(htmlPath, html, "utf8");

  if (config.PRINT_MODE === "dry-run") {
    return {
      mode: "dry-run",
      htmlPath,
      message: `Dry-run: wrote ${htmlPath}`,
    };
  }

  if (!config.PRINTER_NAME) {
    throw new Error("PRINT_MODE=print requires PRINTER_NAME (from lpstat -p -d)");
  }

  // Silent CUPS print lands in HIL-82 (lp / PDF pipeline).
  throw new Error(
    `PRINT_MODE=print is not wired yet (HIL-82). Dry-run HTML is at ${htmlPath}`,
  );
}
