import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
];

async function fileReadable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function pathExecutable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Resolve a Chromium-based browser for headless HTML → PDF (HIL-82). */
export async function resolveChromeBinary(
  override?: string,
): Promise<string> {
  if (override?.trim()) {
    if (!(await pathExecutable(override.trim()))) {
      throw new Error(`CHROME_PATH not executable: ${override}`);
    }
    return override.trim();
  }

  for (const candidate of CHROME_CANDIDATES) {
    if (await pathExecutable(candidate)) return candidate;
  }

  throw new Error(
    "No Chrome/Chromium/Edge found for PDF render. Install Google Chrome on the Mac Mini, or set CHROME_PATH.",
  );
}

export async function htmlFileToPdf(options: {
  htmlPath: string;
  pdfPath: string;
  chromePath?: string;
}): Promise<void> {
  const chrome = await resolveChromeBinary(options.chromePath);
  // file:// URL; Chrome headless prints the page to PDF silently.
  const fileUrl = `file://${options.htmlPath}`;

  try {
    await execFileAsync(
      chrome,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        `--print-to-pdf=${options.pdfPath}`,
        fileUrl,
      ],
      { timeout: 60_000 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`HTML→PDF failed: ${message}`);
  }

  if (!(await fileReadable(options.pdfPath))) {
    throw new Error(`HTML→PDF produced no file at ${options.pdfPath}`);
  }
}

export async function cupsPrintPdf(options: {
  printerName: string;
  pdfPath: string;
  /** Extra `lp -o` options, e.g. media=... (space-separated pairs after -o). */
  lpOptions?: string[];
}): Promise<{ stdout: string; stderr: string }> {
  const args = ["-d", options.printerName];
  for (const opt of options.lpOptions ?? []) {
    const trimmed = opt.trim();
    if (!trimmed) continue;
    args.push("-o", trimmed);
  }
  args.push(options.pdfPath);

  try {
    const { stdout, stderr } = await execFileAsync("lp", args, { timeout: 30_000 });
    return { stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    const err = error as { stderr?: string; message?: string };
    const detail = err.stderr?.trim() || err.message || String(error);
    throw new Error(`lp failed: ${detail}`);
  }
}
