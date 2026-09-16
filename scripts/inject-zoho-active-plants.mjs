#!/usr/bin/env node
/**
 * One-off: inject Zoho active plants (Propagating / Outpatient) into live Supabase.
 * Direct DB writes only — no Mailchimp events, no check-in/status helpers.
 *
 * Usage:
 *   node scripts/inject-zoho-active-plants.mjs --dry-run "/path/to/Hospital Dashboard.csv"
 *   node scripts/inject-zoho-active-plants.mjs "/path/to/Hospital Dashboard.csv"
 */
import { createHash } from "node:crypto";
import { createReadStream, readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";

const VISIT_NOTES = "zoho-active-import";
const LOGO_STORAGE_PATH = "imports/zoho/logo.png";
const LOGO_LOCAL = join(dirname(fileURLToPath(import.meta.url)), "assets", "zoho-creator-logo.png");
const BUCKET = "plant-photos";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Zoho Status → app plant_status. Only these are injected. */
const STATUS_MAP = {
  Propagating: "propagation",
  Outpatient: "outpatient",
};

const TARGETS = [
  { email: "mgcindiweni@gmail.com", checkin: "09-Aug-2026", zohoStatus: "Propagating" },
  { email: "timothea.alice@gmail.com", checkin: "12-Aug-2026", zohoStatus: "Propagating" },
  { email: "mr.eion@gmail.com", checkin: "24-Jul-2026", zohoStatus: "Propagating" },
  { email: "corryn.kosik@gmail.com", checkin: "20-Jun-2026", zohoStatus: "Propagating" },
  { email: "meikle017@gmail.com", checkin: "07-Jul-2026", zohoStatus: "Outpatient" },
];

const MONTHS = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
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
  return "M";
}

function mapBugs(raw) {
  return (raw || "").trim().toLowerCase().includes("yes");
}

function parsePrice(raw) {
  const v = (raw || "").trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseCheckinDate(raw) {
  const m = (raw || "").trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = MONTHS[m[2]];
  const year = Number(m[3]);
  if (month === undefined) return null;
  return new Date(Date.UTC(year, month, day, 12, 0, 0));
}

function fingerprint(row) {
  return createHash("sha1")
    .update(
      [
        (row["Email [for plant updates]"] || "").trim().toLowerCase(),
        (row["Check-in Date"] || "").trim(),
        (row["Plant Name [Optional]"] || "").trim(),
        (row.Status || "").trim(),
        (row["Internal Notes"] || "").trim().slice(0, 80),
      ].join("|"),
    )
    .digest("hex")
    .slice(0, 16);
}

/** Parse Water / Leaves / Light bullets from Zoho Care Tips into structured form. */
function parseStructuredCareTips(careTips) {
  if (!careTips) return null;
  const water = careTips.match(/\*\s*Water\s*-\s*(.+?)(?=\n\*|\n\n|$)/is)?.[1]?.trim();
  const leaves = careTips.match(/\*\s*Leaves\s*-\s*(.+?)(?=\n\*|\n\n|$)/is)?.[1]?.trim();
  const light = careTips.match(/\*\s*Light\s*-\s*(.+?)(?=\n\*|\n\n|$)/is)?.[1]?.trim();
  if (!water && !leaves && !light) return null;
  return [
    `Water: ${water || ""}`,
    `Leaves: ${leaves || ""}`,
    `Light: ${light || ""}`,
  ].join("\n");
}

function isTarget(row) {
  const email = (row["Email [for plant updates]"] || "").trim().toLowerCase();
  const checkin = (row["Check-in Date"] || "").trim();
  const zohoStatus = (row.Status || "").trim();
  return TARGETS.some(
    (t) => t.email === email && t.checkin === checkin && t.zohoStatus === zohoStatus,
  );
}

loadEnvLocal();

const { dryRun, csvPath } = parseArgs(process.argv.slice(2));
if (!csvPath) {
  console.error(
    'Usage: node scripts/inject-zoho-active-plants.mjs [--dry-run] "/path/to/Hospital Dashboard.csv"',
  );
  process.exit(1);
}

const rawRows = await readCsvRows(csvPath);
const matched = rawRows.filter(isTarget);

console.log("Zoho active inject (Propagating + Outpatient)");
console.log(`Matched rows: ${matched.length} / expected ${TARGETS.length}`);
console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
console.log(`Visit marker: ${VISIT_NOTES}`);
console.log(`Mailchimp: none (direct inserts only)`);

const plants = [];
for (const row of matched) {
  const email = (row["Email [for plant updates]"] || "").trim().toLowerCase();
  const checkin = parseCheckinDate(row["Check-in Date"]);
  const zohoStatus = (row.Status || "").trim();
  const appStatus = STATUS_MAP[zohoStatus];
  if (!email || !EMAIL_RE.test(email) || !checkin || !appStatus) {
    console.error("Skip invalid row:", email, zohoStatus);
    continue;
  }

  const careTipsRaw = (row["Care Tips"] || "").trim() || null;
  plants.push({
    email,
    name: (row.Name || "").trim(),
    phone: (row["Phone Number"] || "").trim() || null,
    checkin,
    plantName: (row["Plant Name [Optional]"] || "").trim() || null,
    size: mapSize(row["Plant Size"]),
    bugsFound: mapBugs(row["Bugs Found?"]),
    finalPrice: parsePrice(row["Price [automatically calculated]"]),
    internalNotes: (row["Internal Notes"] || "").trim() || null,
    treatmentFromCareTips: careTipsRaw,
    structuredCareTips: parseStructuredCareTips(careTipsRaw),
    zohoStatus,
    appStatus,
    fingerprint: fingerprint(row),
  });
}

for (const p of plants) {
  console.log(
    `- ${p.name} | ${p.appStatus} | ${p.plantName || "(no species)"} | ${p.size} | ${p.email} | £${p.finalPrice ?? "—"}`,
  );
}

if (plants.length !== TARGETS.length) {
  console.error(`Expected ${TARGETS.length} plants, got ${plants.length}. Abort.`);
  process.exit(1);
}

if (dryRun) {
  console.log("Dry run complete — no database writes.");
  process.exit(0);
}

if (!existsSync(LOGO_LOCAL)) {
  console.error(`Missing logo at ${LOGO_LOCAL}`);
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { count: eventsBefore } = await supabase
  .from("mailchimp_events")
  .select("id", { count: "exact", head: true });
console.log(`mailchimp_events before: ${eventsBefore}`);

// Idempotency: skip if this fingerprint already in treatment_notes or plants.notes marker
const { data: existingVisits } = await supabase
  .from("visits")
  .select("id, notes")
  .eq("notes", VISIT_NOTES);

if (existingVisits?.length) {
  const visitIds = existingVisits.map((v) => v.id);
  const { data: existingPlants } = await supabase
    .from("plants")
    .select("id, species, notes, status, visit_id")
    .in("visit_id", visitIds);

  console.log(
    `Found ${existingPlants?.length ?? 0} plants already under ${VISIT_NOTES} visits.`,
  );
  if ((existingPlants?.length ?? 0) >= TARGETS.length) {
    console.error("Abort: active Zoho inject already present. Delete those visits first to re-run.");
    process.exit(1);
  }
}

const logoBytes = readFileSync(LOGO_LOCAL);
const { error: uploadError } = await supabase.storage.from(BUCKET).upload(LOGO_STORAGE_PATH, logoBytes, {
  contentType: "image/png",
  upsert: true,
});
if (uploadError) {
  console.error("Logo upload failed:", uploadError.message);
  process.exit(1);
}
console.log("Logo ready.");

let customersCreated = 0;
let visitsCreated = 0;
let plantsCreated = 0;
const created = [];

for (const plant of plants) {
  // Customer
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id, phone")
    .eq("email", plant.email)
    .maybeSingle();

  let customerId = existingCustomer?.id;
  if (!customerId) {
    const { firstName, lastName } = splitName(plant.name);
    const { data: createdCustomer, error } = await supabase
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
    if (error) throw new Error(`customer ${plant.email}: ${error.message}`);
    customerId = createdCustomer.id;
    customersCreated += 1;
  } else if (plant.phone && !existingCustomer.phone) {
    await supabase.from("customers").update({ phone: plant.phone }).eq("id", customerId);
  }

  // Visit (one plant per visit for these actives)
  const { data: visitRow, error: visitError } = await supabase
    .from("visits")
    .insert({
      customer_id: customerId,
      checkin_date: plant.checkin.toISOString(),
      notes: VISIT_NOTES,
      payment_status: plant.finalPrice != null ? "paid" : "pay_at_collection",
    })
    .select("id")
    .single();
  if (visitError) throw new Error(`visit ${plant.email}: ${visitError.message}`);
  visitsCreated += 1;

  const { data: plantRow, error: plantError } = await supabase
    .from("plants")
    .insert({
      visit_id: visitRow.id,
      name: null,
      species: plant.plantName,
      size: plant.size,
      status: plant.appStatus,
      bugs_found: plant.bugsFound,
      bugs_found_ever: plant.bugsFound === true,
      final_price: plant.finalPrice,
      collected_at: null,
      plant_category: "standard",
      source_plant_id: null,
      notes: plant.internalNotes,
      pot_size_change_consent: false,
      created_at: plant.checkin.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (plantError) throw new Error(`plant ${plant.email}: ${plantError.message}`);
  plantsCreated += 1;

  const { error: historyError } = await supabase.from("status_history").insert({
    plant_id: plantRow.id,
    previous_status: null,
    new_status: plant.appStatus,
    changed_by: null,
    created_at: plant.checkin.toISOString(),
  });
  if (historyError) throw new Error(`status_history ${plant.email}: ${historyError.message}`);

  const { error: photoError } = await supabase.from("plant_photos").insert({
    plant_id: plantRow.id,
    storage_path: LOGO_STORAGE_PATH,
    thumbnail_path: LOGO_STORAGE_PATH,
  });
  if (photoError) throw new Error(`photo ${plant.email}: ${photoError.message}`);

  // Outpatient: Care Tips blob → treatment notes; parse Water/Leaves/Light → care_tips
  if (plant.treatmentFromCareTips) {
    const { error } = await supabase.from("treatment_notes").insert({
      plant_id: plantRow.id,
      content: plant.treatmentFromCareTips,
    });
    if (error) throw new Error(`treatment_notes ${plant.email}: ${error.message}`);
  }

  if (plant.structuredCareTips) {
    const { error } = await supabase.from("care_tips").insert({
      plant_id: plantRow.id,
      content: plant.structuredCareTips,
    });
    if (error) throw new Error(`care_tips ${plant.email}: ${error.message}`);
  }

  created.push({
    id: plantRow.id,
    name: plant.name,
    status: plant.appStatus,
    species: plant.plantName,
  });
  console.log(`OK ${plant.name} → ${plant.appStatus} (${plantRow.id})`);
}

const { count: eventsAfter } = await supabase
  .from("mailchimp_events")
  .select("id", { count: "exact", head: true });

console.log("\nDone.");
console.log(`Customers created: ${customersCreated}`);
console.log(`Visits created: ${visitsCreated}`);
console.log(`Plants created: ${plantsCreated}`);
console.log(`mailchimp_events after: ${eventsAfter} (before ${eventsBefore})`);
if (eventsAfter !== eventsBefore) {
  console.warn("WARNING: mailchimp_events count changed during inject (may be concurrent app use).");
}
console.log(JSON.stringify(created, null, 2));
