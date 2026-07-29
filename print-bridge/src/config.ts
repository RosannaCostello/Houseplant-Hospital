import { z } from "zod";

const envSchema = z.object({
  PRINT_BRIDGE_SECRET: z.string().min(16, "PRINT_BRIDGE_SECRET must be at least 16 characters"),
  PRINT_BRIDGE_HOST: z.string().default("127.0.0.1"),
  PRINT_BRIDGE_PORT: z.coerce.number().int().positive().default(8787),
  PRINTER_NAME: z.string().optional().default(""),
  PRINT_MODE: z.enum(["dry-run", "print"]).default("dry-run"),
});

export type BridgeConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BridgeConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid print-bridge env: ${details}`);
  }
  return parsed.data;
}
