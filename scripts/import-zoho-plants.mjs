#!/usr/bin/env node
/**
 * HIL-99 Part 2: Import Zoho Hospital Dashboard rows into Supabase as historic collected plants.
 *
 * CRITICAL: Direct DB + storage writes only. Never calls check-in / status / collect /
 * Mailchimp emit helpers. Must not create mailchimp_events.
 *
 * Rules:
 * - Every plant status = collected
 * - collected_at = checkin_date + 14 days
 * - Shared Zoho logo photo for every plant
 * - visits.notes = 'zoho-import'
 *
 * Usage:
 *   node scripts/import-zoho-plants.mjs --dry-run "/path/to/Hospital Dashboard.csv"
 *   node scripts/import-zoho-plants.mjs "/path/to/Hospital Dashboard.csv"
 */
import { createHash } from "node:crypto";
import { createReadStream, readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";

const VISIT_NOTES = "zoho-import";
const LOGO_STORAGE_PATH = "imports/zoho/logo.png";
const LOGO_LOCAL = join(dirname(fileURLToPath(import.meta.url)), "assets", "zoho-creator-logo.png");
const BUCKET = "plant-photos";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MONTHS = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

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

function parseArgs(argv) {
  const dryRun = argv.includes("--dry-run");
  const path = argv.find((a) => !a.startsWith("-"));
  return { dryRun, csvPath: path ? resolve(path) : null };
}

function parseCsvLine(line) {
  const fields = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

async function readCsvRows(csvPath) {
  const rl = createInterface({
    input: createReadStream(csvPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  const rows = [];
  let headers = null;
  let pending = "";

  for await (const line of rl) {
    const chunk = pending ? `${pending}\n${line}` : line;
    let quoteCount = 0;
    for (const ch of chunk) {
      if (ch === '"') quoteCount += 1;
    }
    if (quoteCount % 2 === 1) {
      pending = chunk;
      continue;
    }
    pending = "";
    const fields = parseCsvLine(chunk);
    if (!headers) {
      headers = fields.map((h) => h.replace(/^\uFEFF/, "").trim());
      continue;
    }
    const row = {};
    headers.forEach((h, i) => {
      row[h] = fields[i] ?? "";
    });
    rows.push(row);
  }

  return rows;
}

function splitName(fullName) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Customer", lastName: "Unknown" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "-" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function mapSize(raw) {
  const s = (raw || "").toLowerCase();
  if (s.includes("mini")) return "Mini";
  if (s.includes("extra large") || s.startsWith("xl")) return "XL";
  if (s.includes("large") || s.startsWith("l ")) return "L";
  if (s.includes("medium") || s.startsWith("m ")) return "M";
  if (s.includes("small") || s.startsWith("s ")) return "S";
  if (s.includes("[xs]") || s.startsWith("xs")) return "Mini";
  return "M";
}

function mapBugs(raw) {
  const v = (raw || "").trim().toLowerCase();
  if (v.includes("yes")) return true;
  // Blank / "no" / anything else → no pests (app never leaves this unset)
  return false;
}

function parsePrice(raw) {
  const v = (raw || "").trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

/** When Zoho CSV price is blank, use Shopify pricing_rules (standard / pests). */
function resolveImportPrice(plant, rulesBySize) {
  if (plant.finalPrice != null) return plant.finalPrice;
  const rule = rulesBySize[plant.size];
  if (!rule) return null;
  if (plant.bugsFound === true && rule.pests_amount != null) {
    return roundMoney(rule.pests_amount);
  }
  return roundMoney(rule.amount);
}

/** Parse Zoho date like 18-Jul-2026 as noon Europe/London → ISO UTC. */
function parseCheckinDate(raw) {
  const m = (raw || "").trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = MONTHS[m[2]];
  const year = Number(m[3]);
  if (month === undefined) return null;
  // Store as UTC noon on that calendar day (stable; analytics uses Europe/London trunc)
  return new Date(Date.UTC(year, month, day, 12, 0, 0));
}

function addDays(date, days) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function rowFingerprint(row) {
  return createHash("sha1")
    .update(
      [
        (row["Email [for plant updates]"] || "").trim().toLowerCase(),
        (row["Check-in Date"] || "").trim(),
        (row["Plant Name [Optional]"] || "").trim(),
        (row["Plant Size"] || "").trim(),
        (row["Price [automatically calculated]"] || "").trim(),
        (row["Internal Notes"] || "").trim().slice(0, 80),
      ].join("|"),
    )
    .digest("hex")
    .slice(0, 16);
}

function normalizeRows(rawRows) {
  const plants = [];
  let skipped = 0;

  for (const row of rawRows) {
    const email = (row["Email [for plant updates]"] || "").trim().toLowerCase();
    const checkin = parseCheckinDate(row["Check-in Date"]);
    if (!email || !EMAIL_RE.test(email) || !checkin) {
      skipped += 1;
      continue;
    }

    plants.push({
      email,
      name: (row.Name || "").trim(),
      phone: (row["Phone Number"] || "").trim() || null,
      checkin,
      collectedAt: addDays(checkin, 14),
      plantName: (row["Plant Name [Optional]"] || "").trim() || null,
      size: mapSize(row["Plant Size"]),
      bugsFound: mapBugs(row["Bugs Found?"]),
      finalPrice: parsePrice(row["Price [automatically calculated]"]),
      careTips: (row["Care Tips"] || "").trim() || null,
      treatmentNotes: (row["Internal Notes"] || "").trim() || null,
      fingerprint: rowFingerprint(row),
      zohoStatus: (row.Status || "").trim(),
    });
  }

  return { plants, skipped };
}

loadEnvLocal();

const { dryRun, csvPath } = parseArgs(process.argv.slice(2));
if (!csvPath) {
  console.error(
    'Usage: node scripts/import-zoho-plants.mjs [--dry-run] "/path/to/Hospital Dashboard.csv"',
  );
  process.exit(1);
}

if (!existsSync(LOGO_LOCAL)) {
  console.error(`Missing logo at ${LOGO_LOCAL}`);
  process.exit(1);
}

const rawRows = await readCsvRows(csvPath);
const { plants, skipped } = normalizeRows(rawRows);
const uniqueEmails = new Set(plants.map((p) => p.email));
const visitKeys = new Set(plants.map((p) => `${p.email}|${p.checkin.toISOString().slice(0, 10)}`));

console.log("HIL-99 Part 2 — Zoho → Supabase (historic collected)");
console.log(`CSV rows: ${rawRows.length}`);
console.log(`Importable plants: ${plants.length}`);
console.log(`Skipped: ${skipped}`);
console.log(`Unique customers: ${uniqueEmails.size}`);
console.log(`Visit keys (email+date): ${visitKeys.size}`);
console.log(`All status → collected; collected_at = checkin + 14d`);
console.log(`Logo: ${LOGO_LOCAL} → ${BUCKET}/${LOGO_STORAGE_PATH}`);
console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
console.log(
  "Sample:",
  plants.slice(0, 2).map((p) => ({
    email: p.email,
    checkin: p.checkin.toISOString(),
    collectedAt: p.collectedAt.toISOString(),
    size: p.size,
    price: p.finalPrice,
    zohoStatus: p.zohoStatus,
  })),
);

if (dryRun) {
  console.log("Dry run complete — no database writes.");
  process.exit(0);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Baseline mailchimp_events count — must not increase
const { count: eventsBefore, error: eventsBeforeError } = await supabase
  .from("mailchimp_events")
  .select("id", { count: "exact", head: true });
if (eventsBeforeError) {
  console.error("Failed to count mailchimp_events:", eventsBeforeError.message);
  process.exit(1);
}
console.log(`mailchimp_events before: ${eventsBefore}`);

// Idempotency: skip if zoho-import visits already exist with matching fingerprints in notes
const { data: existingImports, error: existingError } = await supabase
  .from("visits")
  .select("id")
  .eq("notes", VISIT_NOTES)
  .limit(1);
if (existingError) {
  console.error("Failed checking existing imports:", existingError.message);
  process.exit(1);
}
if (existingImports?.length) {
  console.error(
    `Abort: visits with notes='${VISIT_NOTES}' already exist. Purge those rows first to re-import.`,
  );
  process.exit(1);
}

// Upload shared logo once
const logoBytes = readFileSync(LOGO_LOCAL);
const { error: uploadError } = await supabase.storage.from(BUCKET).upload(LOGO_STORAGE_PATH, logoBytes, {
  contentType: "image/png",
  upsert: true,
});
if (uploadError) {
  console.error("Logo upload failed:", uploadError.message);
  process.exit(1);
}
console.log("Logo uploaded.");

const { data: pricingRows, error: pricingError } = await supabase
  .from("pricing_rules")
  .select("size, amount, pests_amount")
  .eq("rule_type", "base_price")
  .eq("active", true);
if (pricingError) {
  console.error("Failed to load pricing_rules:", pricingError.message);
  process.exit(1);
}
const rulesBySize = Object.fromEntries(
  (pricingRows ?? []).map((row) => [
    row.size,
    {
      amount: Number(row.amount),
      pests_amount: row.pests_amount == null ? null : Number(row.pests_amount),
    },
  ]),
);
console.log("Pricing fallback rules loaded:", Object.keys(rulesBySize).join(", "));

/** @type {Map<string, string>} */
const customerIds = new Map();
/** @type {Map<string, string>} */
const visitIds = new Map();

let customersCreated = 0;
let visitsCreated = 0;
let plantsCreated = 0;
let photosCreated = 0;
let tipsCreated = 0;
let notesCreated = 0;
let pricesFromRules = 0;
const failures = [];

for (const plant of plants) {
  try {
    // Customer
    let customerId = customerIds.get(plant.email);
    if (!customerId) {
      const { data: existing } = await supabase
        .from("customers")
        .select("id, phone")
        .eq("email", plant.email)
        .maybeSingle();

      if (existing?.id) {
        customerId = existing.id;
        if (plant.phone && !existing.phone) {
          await supabase.from("customers").update({ phone: plant.phone }).eq("id", customerId);
        }
      } else {
        const { firstName, lastName } = splitName(plant.name);
        const { data: created, error } = await supabase
          .from("customers")
          .insert({
            email: plant.email,
            first_name: firstName,
            last_name: lastName,
            phone: plant.phone,
            marketing_consent: false,
          })
          .select("id")
          .single();
        if (error) throw new Error(`customer insert: ${error.message}`);
        customerId = created.id;
        customersCreated += 1;
      }
      customerIds.set(plant.email, customerId);
    }

    // Visit
    const visitKey = `${plant.email}|${plant.checkin.toISOString().slice(0, 10)}`;
    let visitId = visitIds.get(visitKey);
    if (!visitId) {
      const { data: created, error } = await supabase
        .from("visits")
        .insert({
          customer_id: customerId,
          checkin_date: plant.checkin.toISOString(),
          notes: VISIT_NOTES,
        })
        .select("id")
        .single();
      if (error) throw new Error(`visit insert: ${error.message}`);
      visitId = created.id;
      visitIds.set(visitKey, visitId);
      visitsCreated += 1;
    }

    // Plant — always collected
    const finalPrice = resolveImportPrice(plant, rulesBySize);
    if (plant.finalPrice == null && finalPrice != null) pricesFromRules += 1;

    const { data: plantRow, error: plantError } = await supabase
      .from("plants")
      .insert({
        visit_id: visitId,
        name: plant.plantName,
        size: plant.size,
        status: "collected",
        bugs_found: plant.bugsFound,
        final_price: finalPrice,
        collected_at: plant.collectedAt.toISOString(),
        plant_category: "standard",
        created_at: plant.checkin.toISOString(),
        updated_at: plant.collectedAt.toISOString(),
      })
      .select("id")
      .single();
    if (plantError) throw new Error(`plant insert: ${plantError.message}`);
    plantsCreated += 1;

    const { error: photoError } = await supabase.from("plant_photos").insert({
      plant_id: plantRow.id,
      storage_path: LOGO_STORAGE_PATH,
      thumbnail_path: LOGO_STORAGE_PATH,
    });
    if (photoError) throw new Error(`photo insert: ${photoError.message}`);
    photosCreated += 1;

    if (plant.careTips) {
      const { error } = await supabase.from("care_tips").insert({
        plant_id: plantRow.id,
        content: plant.careTips,
      });
      if (error) throw new Error(`care_tips: ${error.message}`);
      tipsCreated += 1;
    }

    if (plant.treatmentNotes) {
      const note = `${plant.treatmentNotes}\n\n[zoho-import fp=${plant.fingerprint} zoho_status=${plant.zohoStatus}]`;
      const { error } = await supabase.from("treatment_notes").insert({
        plant_id: plantRow.id,
        content: note,
      });
      if (error) throw new Error(`treatment_notes: ${error.message}`);
      notesCreated += 1;
    }

    if (plantsCreated % 50 === 0) {
      console.log(`Progress plants=${plantsCreated}/${plants.length}`);
    }
  } catch (error) {
    failures.push({ email: plant.email, fingerprint: plant.fingerprint, error: error.message });
    console.error(`FAIL ${plant.email} ${plant.fingerprint}: ${error.message}`);
  }
}

const { count: eventsAfter, error: eventsAfterError } = await supabase
  .from("mailchimp_events")
  .select("id", { count: "exact", head: true });
if (eventsAfterError) {
  console.error("Failed to re-count mailchimp_events:", eventsAfterError.message);
  process.exit(1);
}

// Confirm no events for plants on zoho-import visits (global count can change from live app use)
const { data: zohoVisits } = await supabase.from("visits").select("id").eq("notes", VISIT_NOTES);
const zohoVisitIds = (zohoVisits ?? []).map((v) => v.id);
let zohoPlantIds = [];
for (let from = 0; ; from += 1000) {
  const { data } = await supabase
    .from("plants")
    .select("id")
    .in("visit_id", zohoVisitIds)
    .range(from, from + 999);
  if (!data?.length) break;
  zohoPlantIds.push(...data.map((p) => p.id));
  if (data.length < 1000) break;
}
const { data: zohoEvents } = await supabase
  .from("mailchimp_events")
  .select("id, event_name, plant_id")
  .in("plant_id", zohoPlantIds.length ? zohoPlantIds : ["00000000-0000-0000-0000-000000000000"]);

console.log("---");
console.log(`customers created: ${customersCreated}`);
console.log(`visits created: ${visitsCreated}`);
console.log(`plants created: ${plantsCreated}`);
console.log(`prices filled from Shopify rules (CSV blank): ${pricesFromRules}`);
console.log(`photos created: ${photosCreated}`);
console.log(`care tips: ${tipsCreated}`);
console.log(`treatment notes: ${notesCreated}`);
console.log(`failures: ${failures.length}`);
console.log(`mailchimp_events before: ${eventsBefore} after: ${eventsAfter} (global; may include live app)`);
console.log(`mailchimp_events for zoho-import plants: ${zohoEvents?.length ?? 0}`);

if ((zohoEvents?.length ?? 0) > 0) {
  console.error("CRITICAL: mailchimp_events exist for zoho-import plants — investigate immediately.");
  console.error(zohoEvents);
  process.exit(1);
}

console.log("No Mailchimp events for Zoho import plants — safe.");
if (failures.length) {
  console.log("Sample failures:", failures.slice(0, 10));
  process.exit(1);
}
process.exit(0);
