#!/usr/bin/env node
/**
 * Verify pending migrations against the linked Supabase project.
 * Apply DDL via Supabase SQL editor (see scripts/apply-migration-*.sql).
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
  {
    id: "0013",
    label: "check_in_drafts + check_in_draft_photos",
    run: () => supabase.from("check_in_drafts").select("id").limit(1),
  },
  {
    id: "0014",
    label: "pos_checkout_status on check_in_drafts",
    run: () => supabase.from("check_in_drafts").select("pos_checkout_status").limit(1),
  },
  {
    id: "0015",
    label: "plant propagation category and lineage",
    run: () => supabase.from("plants").select("plant_category, source_plant_id").limit(1),
  },
  {
    id: "0015",
    label: "plant propagation pricing",
    run: () =>
      supabase
        .from("pricing_rules")
        .select("shopify_propagation_variant_id, propagation_amount")
        .limit(1),
  },
  {
    id: "0016",
    label: "admin analytics RPC",
    run: async () => {
      const { error } = await supabase.rpc("get_admin_analytics", {
        p_start: "2026-01-01T00:00:00.000Z",
        p_end: "2026-01-02T00:00:00.000Z",
        p_previous_start: "2025-12-31T00:00:00.000Z",
        p_previous_end: "2026-01-01T00:00:00.000Z",
        p_bucket: "day",
      });

      return error?.message.includes("Admin access required.") ? { error: null } : { error };
    },
  },
  {
    id: "0017",
    label: "visits.payment_settled_via",
    run: () => supabase.from("visits").select("payment_settled_via").limit(1),
  },
  {
    id: "0018",
    label: "check_in_drafts.acuity_appointment_id",
    run: () => supabase.from("check_in_drafts").select("acuity_appointment_id").limit(1),
  },
  {
    id: "0019",
    label: "care_tip_options",
    run: () => supabase.from("care_tip_options").select("id, category, label").limit(1),
  },
  {
    id: "0019",
    label: "app_copy_settings.treatment_notes_placeholder",
    run: () =>
      supabase.from("app_copy_settings").select("treatment_notes_placeholder").eq("id", 1).maybeSingle(),
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
  console.log("\nApply missing migrations in the Supabase SQL editor (scripts/apply-migration-*.sql).");
  process.exit(1);
}

console.log("\nAll pending migrations appear applied.");
