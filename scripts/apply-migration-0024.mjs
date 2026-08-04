#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

function loadEnvLocal() {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const equals = trimmed.indexOf("=");
      if (equals === -1) continue;
      const key = trimmed.slice(0, equals).trim();
      const rawValue = trimmed.slice(equals + 1).trim();
      const value =
        (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
        (rawValue.startsWith("'") && rawValue.endsWith("'"))
          ? rawValue.slice(1, -1)
          : rawValue;
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

loadEnvLocal();

function projectRefFromEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  return new URL(supabaseUrl).hostname.split(".")[0] || null;
}

/**
 * Build discrete pg connection configs (avoids URL password encoding bugs).
 * Prefer SUPABASE_DB_PASSWORD over any password embedded in DATABASE_URL —
 * those often drift and cause 28P01.
 */
function candidateConfigs() {
  const ref = projectRefFromEnv();
  const passwordFromEnv = process.env.SUPABASE_DB_PASSWORD || null;
  const configs = [];
  const seen = new Set();

  function add(config, label) {
    const key = `${config.host}|${config.port}|${config.user}|${config.password}`;
    if (seen.has(key)) return;
    seen.add(key);
    configs.push({ ...config, label });
  }

  const explicit =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.SUPABASE_POOLER_URL;

  if (explicit) {
    try {
      const parsed = new URL(explicit);
      const host = parsed.hostname;
      const port = Number(parsed.port || 5432);
      const user = decodeURIComponent(parsed.username);
      const urlPassword = decodeURIComponent(parsed.password || "");
      const database = (parsed.pathname || "/postgres").replace(/^\//, "") || "postgres";

      if (passwordFromEnv) {
        add(
          { host, port, user, password: passwordFromEnv, database },
          `${host} (DATABASE_URL host + SUPABASE_DB_PASSWORD)`,
        );
      }
      if (urlPassword) {
        add(
          { host, port, user, password: urlPassword, database },
          `${host} (DATABASE_URL embedded password)`,
        );
      }
    } catch {
      console.warn("Could not parse DATABASE_URL / pooler URL — skipping.");
    }
  }

  if (passwordFromEnv && ref) {
    const region =
      process.env.SUPABASE_REGION || process.env.SUPABASE_DB_REGION || "eu-west-2";
    const hosts = [
      `aws-1-${region}.pooler.supabase.com`,
      `aws-0-${region}.pooler.supabase.com`,
    ];
    for (const extra of ["eu-west-2", "eu-west-1", "eu-central-1"]) {
      if (extra === region) continue;
      hosts.push(`aws-1-${extra}.pooler.supabase.com`, `aws-0-${extra}.pooler.supabase.com`);
    }

    for (const host of hosts) {
      add(
        {
          host,
          port: 5432,
          user: `postgres.${ref}`,
          password: passwordFromEnv,
          database: "postgres",
        },
        `${host} (pooler + SUPABASE_DB_PASSWORD)`,
      );
    }
  }

  return configs;
}

const configs = candidateConfigs();
if (configs.length === 0) {
  console.error(
    "Missing DATABASE_URL (or SUPABASE_POOLER_URL) or SUPABASE_DB_PASSWORD + NEXT_PUBLIC_SUPABASE_URL",
  );
  process.exit(1);
}

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/0024_avg_surgery_time.sql"),
  "utf8",
);

async function main() {
  let lastError = null;

  for (const { label, ...config } of configs) {
    const client = new pg.Client({
      ...config,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 12_000,
    });

    try {
      await client.connect();
      try {
        await client.query(sql);
        console.log(`Applied migration 0024_avg_surgery_time.sql via ${label}`);
        return;
      } finally {
        await client.end();
      }
    } catch (error) {
      lastError = error;
      const code = error && typeof error === "object" && "code" in error ? error.code : "";
      console.warn(`Could not apply via ${label}${code ? ` (${code})` : ""} — trying next…`);
      try {
        await client.end();
      } catch {
        // ignore
      }
    }
  }

  console.error("Failed to apply migration 0024 with all connection candidates.");
  console.error(
    "Hint: DATABASE_URL password and SUPABASE_DB_PASSWORD differ. Update DATABASE_URL to the current DB password from Supabase → Database settings, or use the SQL Editor.",
  );
  console.error(lastError);
  process.exit(1);
}

await main();
