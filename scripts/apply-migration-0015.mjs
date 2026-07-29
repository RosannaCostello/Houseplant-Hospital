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
    // .env.local is optional when the connection string is already exported.
  }
}

loadEnvLocal();

function databaseUrlFromProject() {
  const password = process.env.SUPABASE_DB_PASSWORD;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!password || !supabaseUrl) return null;

  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  if (!projectRef) return null;

  return `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`;
}

const dbUrl =
  process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? databaseUrlFromProject();
if (!dbUrl) {
  console.error(
    "Missing database credentials. Set SUPABASE_DB_URL or SUPABASE_DB_PASSWORD in .env.local.",
  );
  process.exit(1);
}

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/0015_plant_propagation.sql"),
  "utf8",
);
const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("Connected. Applying migration 0015…");
  await client.query(sql);

  const { rows } = await client.query(`
    select
      exists (
        select 1 from pg_attribute
        where attrelid = 'public.plants'::regclass
          and attname = 'plant_category'
          and not attisdropped
      ) as has_category,
      exists (
        select 1 from pg_proc
        where proname = 'propagate_plant'
          and pronamespace = 'public'::regnamespace
      ) as has_rpc
  `);

  if (!rows[0]?.has_category || !rows[0]?.has_rpc) {
    throw new Error("Verification failed: propagation schema is incomplete.");
  }

  console.log("OK — propagation schema and RPC are ready.");
} catch (error) {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end();
}
