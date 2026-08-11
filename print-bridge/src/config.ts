import { z } from "zod";
import { DEFAULT_LP_MEDIA } from "./label-size.js";

const envSchema = z.object({
  PRINT_BRIDGE_SECRET: z.string().min(16, "PRINT_BRIDGE_SECRET must be at least 16 characters"),
  PRINT_BRIDGE_HOST: z.string().default("127.0.0.1"),
  PRINT_BRIDGE_PORT: z.coerce.number().int().positive().default(8787),
  /** AirPrint queue name from `lpstat -p -d` (Hilda shop preference over CUPS). */
  PRINTER_NAME: z.string().optional().default(""),
  PRINT_MODE: z.enum(["dry-run", "print"]).default("dry-run"),
  /** Optional path to Chrome/Chromium/Edge for HTML→PDF. */
  CHROME_PATH: z.string().optional().default(""),
  /**
   * Comma-separated `lp -o` options.
   * Default targets Hilda AirPrint label size 60×86mm.
   */
  LP_OPTIONS: z.string().optional().default(`media=${DEFAULT_LP_MEDIA}`),
});

export type BridgeConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BridgeConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid print-bridge env: ${details}`);
  }
  const data = parsed.data;
  if (!data.LP_OPTIONS.trim()) {
    data.LP_OPTIONS = `media=${DEFAULT_LP_MEDIA}`;
  }
  return data;
}

export function parseLpOptions(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
