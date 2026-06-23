#!/usr/bin/env node
/**
 * Apply migration 0013 to the linked Supabase Postgres database.
 *
 * Usage (get connection string from Supabase → Project Settings → Database → URI):
 *   SUPABASE_DB_URL="postgresql://postgres.[ref]:[PASSWORD]@...supabase.com:5432/postgres" \
 *     node scripts/apply-migration-0013.mjs
 *
 * Or add SUPABASE_DB_URL to .env.local (do not commit).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

loadEnvLocal();

const dbUrl = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;

if (!dbUrl) {
  console.error(`Missing SUPABASE_DB_URL (or DATABASE_URL).

1. Supabase Dashboard → Project Settings → Database
2. Copy the "URI" connection string (use the database password you set at project creation)
3. Run:

   SUPABASE_DB_URL="postgresql://..." node scripts/apply-migration-0013.mjs

Or paste scripts/apply-migration-0013.sql into the SQL editor and Run:
https://supabase.com/dashboard/project/_/sql/new
`);
  process.exit(1);
}

const sqlPath = resolve(process.cwd(), "scripts/apply-migration-0013.sql");
const sql = readFileSync(sqlPath, "utf8");

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("Connected. Applying migration 0013…");
  await client.query(sql);
  console.log("Done. Verifying check_in_drafts exists…");
  const { rows } = await client.query(
    "select to_regclass('public.check_in_drafts') as table_name",
  );
  if (rows[0]?.table_name) {
    console.log("OK — public.check_in_drafts created.");
    console.log("Run: node scripts/verify-migrations.mjs");
  } else {
    console.error("Migration ran but table not found — check SQL errors above.");
    process.exit(1);
  }
} catch (error) {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  console.error("\nFallback: paste scripts/apply-migration-0013.sql into the Supabase SQL editor and Run.");
  process.exit(1);
} finally {
  await client.end();
}
