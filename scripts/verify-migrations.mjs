#!/usr/bin/env node
/**
 * Verify pending migrations 0006, 0011, 0012 against the linked Supabase project.
 * Apply DDL via Supabase SQL editor: scripts/apply-migrations-0006-0011-0012.sql
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

const checks = [
  {
    id: "0006",
    label: "plants.collected_at + final_price",
    run: () => supabase.from("plants").select("collected_at, final_price").limit(1),
  },
  {
    id: "0011",
    label: "plants.bugs_found nullable",
    run: () => supabase.from("plants").select("bugs_found").limit(1),
  },
  {
    id: "0012",
    label: "treatment_notes.updated_at",
    run: () => supabase.from("treatment_notes").select("updated_at").limit(1),
  },
];

let missing = 0;

for (const check of checks) {
  const { error } = await check.run();
  if (error) {
    missing += 1;
    console.log(`[MISSING] ${check.id}: ${check.label} — ${error.message}`);
  } else {
    console.log(`[OK] ${check.id}: ${check.label}`);
  }
}

if (missing > 0) {
  console.log("\nRun scripts/apply-migrations-0006-0011-0012.sql in the Supabase SQL editor.");
  process.exit(1);
}

console.log("\nAll pending migrations appear applied.");
