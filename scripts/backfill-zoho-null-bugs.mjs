#!/usr/bin/env node
/**
 * Set bugs_found = false for Zoho-import plants where bugs_found is null.
 * App check-in never leaves pests unset; blank Zoho CSV → treat as no pests.
 *
 * Usage:
 *   node scripts/backfill-zoho-null-bugs.mjs --dry-run
 *   node scripts/backfill-zoho-null-bugs.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const VISIT_NOTES = ["zoho-import", "zoho-import-final"];
const PAGE_SIZE = 500;

function loadEnvLocal() {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const raw = trimmed.slice(eq + 1).trim();
      const value =
        (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))
          ? raw.slice(1, -1)
          : raw;
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

loadEnvLocal();

const dryRun = process.argv.includes("--dry-run");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log("Zoho null-bugs → false backfill");
console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);

const plants = [];
for (let from = 0; ; from += PAGE_SIZE) {
  const to = from + PAGE_SIZE - 1;
  const { data, error } = await supabase
    .from("plants")
    .select("id, bugs_found, visits!inner(notes)")
    .is("bugs_found", null)
    .in("visits.notes", VISIT_NOTES)
    .range(from, to);

  if (error) {
    console.error("Failed to load plants:", error.message);
    process.exit(1);
  }

  plants.push(...(data ?? []));
  if (!data || data.length < PAGE_SIZE) break;
}

console.log(`Candidates: ${plants.length}`);
console.log("Sample ids:", plants.slice(0, 5).map((p) => p.id));

if (dryRun) {
  console.log("Dry run complete — no writes.");
  process.exit(0);
}

let updated = 0;
const BATCH = 50;
for (let i = 0; i < plants.length; i += BATCH) {
  const batch = plants.slice(i, i + BATCH);
  const results = await Promise.all(
    batch.map((row) =>
      supabase.from("plants").update({ bugs_found: false }).eq("id", row.id).is("bugs_found", null),
    ),
  );

  for (const { error } of results) {
    if (error) {
      console.error("Update failed:", error.message);
      process.exit(1);
    }
    updated += 1;
  }
}

const { count: remaining, error: remainingError } = await supabase
  .from("plants")
  .select("id, visits!inner(notes)", { count: "exact", head: true })
  .is("bugs_found", null)
  .in("visits.notes", VISIT_NOTES);

if (remainingError) {
  console.error("Verify failed:", remainingError.message);
  process.exit(1);
}

console.log(`Updated: ${updated}`);
console.log(`Remaining null Zoho bugs_found: ${remaining ?? 0}`);
