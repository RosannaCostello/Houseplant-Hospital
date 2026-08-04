import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, parseLpOptions, type BridgeConfig } from "./config.js";
import { cupsPrintPdf, htmlFileToPdf } from "./cups.js";
import { renderLabelHtml } from "./label.js";
import type { PrintJobPayload } from "./payload.js";

const bridgeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export type PrintResult = {
  mode: "dry-run" | "print";
  htmlPath?: string;
  pdfPath?: string;
  cupsJobId?: string;
  message: string;
};

/**
 * Render label HTML, optionally convert to PDF and silent-print via CUPS `lp` (HIL-82).
 */
export async function handlePrintJob(
  payload: PrintJobPayload,
  config: BridgeConfig = loadConfig(),
): Promise<PrintResult> {
  const html = renderLabelHtml(payload);
  const tmpDir = path.join(bridgeRoot, ".tmp");
  await mkdir(tmpDir, { recursive: true });
  const stamp = payload.jobId ?? `${Date.now()}-${payload.plantId.slice(0, 8)}`;
  const htmlPath = path.join(tmpDir, `label-${stamp}.html`);
  const pdfPath = path.join(tmpDir, `label-${stamp}.pdf`);
  await writeFile(htmlPath, html, "utf8");

  if (config.PRINT_MODE === "dry-run") {
    return {
      mode: "dry-run",
      htmlPath,
      message: `Dry-run: wrote ${htmlPath}`,
    };
  }

  if (!config.PRINTER_NAME.trim()) {
    throw new Error("PRINT_MODE=print requires PRINTER_NAME (from lpstat -p -d)");
  }

  await htmlFileToPdf({
    htmlPath,
    pdfPath,
    chromePath: config.CHROME_PATH || undefined,
  });

  const { stdout, stderr } = await cupsPrintPdf({
    printerName: config.PRINTER_NAME.trim(),
    pdfPath,
    lpOptions: parseLpOptions(config.LP_OPTIONS),
  });

  const cupsJobId = stdout.match(/request id is\s+(\S+)/i)?.[1];

  return {
    mode: "print",
    htmlPath,
    pdfPath,
    cupsJobId,
    message: stderr
      ? `Sent to ${config.PRINTER_NAME}: ${stdout || "ok"} (${stderr})`
      : `Sent to ${config.PRINTER_NAME}: ${stdout || "ok"}`,
  };
}
