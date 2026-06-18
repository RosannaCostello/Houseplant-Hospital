import { z } from "zod";

function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  return value;
}

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const envSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  APP_BASE_URL: z.string().url().optional(),
  PRINT_BRIDGE_URL: z.string().url().optional(),
  PRINT_BRIDGE_SECRET: z.string().min(1).optional(),
  MAILCHIMP_API_KEY: z.string().min(1).optional(),
  MAILCHIMP_SERVER_PREFIX: z.string().min(1).optional(),
  MAILCHIMP_AUDIENCE_ID: z.string().min(1).optional(),
  MAILCHIMP_OUTBOX_ONLY: z.enum(["true", "false", "1", "0"]).optional(),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  return envSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: emptyToUndefined(process.env.SUPABASE_SERVICE_ROLE_KEY),
    APP_BASE_URL: emptyToUndefined(process.env.APP_BASE_URL),
    PRINT_BRIDGE_URL: emptyToUndefined(process.env.PRINT_BRIDGE_URL),
    PRINT_BRIDGE_SECRET: emptyToUndefined(process.env.PRINT_BRIDGE_SECRET),
    MAILCHIMP_API_KEY: emptyToUndefined(process.env.MAILCHIMP_API_KEY),
    MAILCHIMP_SERVER_PREFIX: emptyToUndefined(process.env.MAILCHIMP_SERVER_PREFIX),
    MAILCHIMP_AUDIENCE_ID: emptyToUndefined(process.env.MAILCHIMP_AUDIENCE_ID),
    MAILCHIMP_OUTBOX_ONLY: emptyToUndefined(process.env.MAILCHIMP_OUTBOX_ONLY),
  });
}

/** Validated env — optional Phase 4/5 vars may be unset. */
export function getEnv(): Env {
  return parseEnv();
}

/** Supabase URL + anon key only (login, middleware, server components). */
export function getPublicEnv(): z.infer<typeof publicEnvSchema> {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

/** Public Supabase vars for middleware when vars may be unset. */
export function getPublicSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = emptyToUndefined(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = emptyToUndefined(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !anonKey) return null;
  return { url, anonKey };
}
