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

function databaseUrlFromProject() {
  const password = process.env.SUPABASE_DB_PASSWORD;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!password || !supabaseUrl) return null;

  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  if (!projectRef) return null;

  return `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`;
}

const databaseUrl = process.env.DATABASE_URL || databaseUrlFromProject();
if (!databaseUrl) {
  console.error("Missing DATABASE_URL or SUPABASE_DB_PASSWORD + NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/0017_payment_settled_via.sql"), "utf8");
const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

await client.connect();
try {
  await client.query(sql);
  console.log("Applied migration 0017_payment_settled_via.sql");
} finally {
  await client.end();
}
