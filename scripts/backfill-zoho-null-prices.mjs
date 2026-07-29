#!/usr/bin/env node
/**
 * Backfill final_price for Zoho-import plants that currently have null pricing.
 *
 * Scope:
 * - visits.notes in ('zoho-import', 'zoho-import-final')
 * - plants.final_price is null
 * - price = Shopify pricing_rules amount (standard) or pests_amount when bugs_found = true
 * - bugs_found null/false → standard
 *
 * Usage:
 *   node scripts/backfill-zoho-null-prices.mjs --dry-run
 *   node scripts/backfill-zoho-null-prices.mjs
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

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function priceForPlant(plant, rulesBySize) {
  const rule = rulesBySize[plant.size];
  if (!rule) {
    return { ok: false, reason: `no pricing rule for size ${plant.size}` };
  }

  if (plant.bugs_found === true) {
    if (rule.pests_amount == null) {
      return { ok: false, reason: `no pests_amount for size ${plant.size}` };
    }
    return { ok: true, price: roundMoney(rule.pests_amount), source: "pests" };
  }

  return { ok: true, price: roundMoney(rule.amount), source: "standard" };
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

const { data: ruleRows, error: rulesError } = await supabase
  .from("pricing_rules")
  .select("size, amount, pests_amount")
  .eq("rule_type", "base_price")
  .eq("active", true);

if (rulesError) {
  console.error("Failed to load pricing_rules:", rulesError.message);
  process.exit(1);
}

const rulesBySize = Object.fromEntries(
  (ruleRows ?? []).map((row) => [
    row.size,
    {
      amount: Number(row.amount),
      pests_amount: row.pests_amount == null ? null : Number(row.pests_amount),
    },
  ]),
);

console.log("Zoho null-price backfill");
console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
console.log("Pricing rules:", rulesBySize);

const plants = [];
for (let from = 0; ; from += PAGE_SIZE) {
  const to = from + PAGE_SIZE - 1;
  const { data, error } = await supabase
    .from("plants")
    .select("id, size, bugs_found, final_price, visits!inner(notes)")
    .is("final_price", null)
    .in("visits.notes", VISIT_NOTES)
    .range(from, to);

  if (error) {
    console.error("Failed to load plants:", error.message);
    process.exit(1);
  }

  plants.push(...(data ?? []));
  if (!data || data.length < PAGE_SIZE) break;
}

const updates = [];
const skipped = [];
const breakdown = {};

for (const plant of plants) {
  const result = priceForPlant(plant, rulesBySize);
  const key = `${plant.size}|bugs=${plant.bugs_found}|${result.ok ? result.source : "skip"}`;
  breakdown[key] = (breakdown[key] ?? 0) + 1;

  if (!result.ok) {
    skipped.push({ id: plant.id, size: plant.size, bugs_found: plant.bugs_found, reason: result.reason });
    continue;
  }

  updates.push({ id: plant.id, final_price: result.price, size: plant.size, bugs_found: plant.bugs_found, source: result.source });
}

console.log(`Candidates: ${plants.length}`);
console.log(`Would update: ${updates.length}`);
console.log(`Skipped: ${skipped.length}`);
console.log("Breakdown:", breakdown);
console.log("Sample:", updates.slice(0, 8));
if (skipped.length) console.log("Skipped sample:", skipped.slice(0, 5));

if (dryRun) {
  console.log("Dry run complete — no writes.");
  process.exit(0);
}

let updated = 0;
const BATCH = 50;
for (let i = 0; i < updates.length; i += BATCH) {
  const batch = updates.slice(i, i + BATCH);
  const results = await Promise.all(
    batch.map((row) =>
      supabase.from("plants").update({ final_price: row.final_price }).eq("id", row.id).is("final_price", null),
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
  .is("final_price", null)
  .in("visits.notes", VISIT_NOTES);

if (remainingError) {
  console.error("Verify failed:", remainingError.message);
  process.exit(1);
}

console.log(`Updated: ${updated}`);
console.log(`Remaining null Zoho prices: ${remaining ?? 0}`);
