#!/usr/bin/env node
/**
 * HIL-99 Part 1: Import unique Zoho Hospital Dashboard customers into Mailchimp.
 *
 * - status_if_new: transactional (not marketing subscribed)
 * - tag: Zoho
 * - Does NOT send plant_* journey events
 *
 * Usage:
 *   node scripts/import-zoho-mailchimp.mjs --dry-run "/path/to/Hospital Dashboard.csv"
 *   node scripts/import-zoho-mailchimp.mjs "/path/to/Hospital Dashboard.csv"
 */
import { createHash } from "node:crypto";
import { createReadStream, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";

const TAG = "Zoho";
const DELAY_MS = 250;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    // optional when env already set
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function subscriberHash(email) {
  return createHash("md5").update(email.trim().toLowerCase()).digest("hex");
}

function splitName(fullName) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Customer", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function parseArgs(argv) {
  const dryRun = argv.includes("--dry-run");
  const path = argv.find((a) => !a.startsWith("-"));
  return { dryRun, csvPath: path ? resolve(path) : null };
}

/** Minimal CSV parser that handles quoted fields and newlines inside quotes. */
async function readCsvRows(csvPath) {
  const rl = createInterface({
    input: createReadStream(csvPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  const rows = [];
  let headers = null;
  let pending = "";
  let inQuotes = false;

  for await (const line of rl) {
    const chunk = pending ? `${pending}\n${line}` : line;
    let quoteCount = 0;
    for (const ch of chunk) {
      if (ch === '"') quoteCount += 1;
    }
    // Odd number of quotes overall means we're still inside a quoted field
    inQuotes = quoteCount % 2 === 1;
    if (inQuotes) {
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

  if (pending.trim()) {
    const fields = parseCsvLine(pending);
    if (headers) {
      const row = {};
      headers.forEach((h, i) => {
        row[h] = fields[i] ?? "";
      });
      rows.push(row);
    }
  }

  return rows;
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

function uniqueContacts(rows) {
  const byEmail = new Map();
  let invalid = 0;

  for (const row of rows) {
    const email = (row["Email [for plant updates]"] || "").trim().toLowerCase();
    const name = (row.Name || "").trim();
    const phone = (row["Phone Number"] || "").trim();

    if (!email || !EMAIL_RE.test(email)) {
      invalid += 1;
      continue;
    }

    const existing = byEmail.get(email);
    if (!existing) {
      byEmail.set(email, { email, name, phone, plants: 1 });
    } else {
      existing.plants += 1;
      if (!existing.phone && phone) existing.phone = phone;
      if (!existing.name && name) existing.name = name;
    }
  }

  return { contacts: [...byEmail.values()], invalid };
}

async function mailchimpRequest(config, method, path, body) {
  const url = `https://${config.serverPrefix}.api.mailchimp.com/3.0${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const detail = json?.detail || json?.title || text || res.statusText;
    const err = new Error(`Mailchimp ${method} ${path}: ${res.status} ${detail}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }

  return json;
}

async function upsertAndTag(config, contact) {
  const { firstName, lastName } = splitName(contact.name || "Customer");
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const hash = subscriberHash(contact.email);

  const mergeFields = { NAME: fullName };
  if (contact.phone) mergeFields.PHONE = contact.phone;

  await mailchimpRequest(config, "PUT", `/lists/${config.audienceId}/members/${hash}`, {
    email_address: contact.email,
    status_if_new: "transactional",
    merge_fields: mergeFields,
  });

  await mailchimpRequest(config, "POST", `/lists/${config.audienceId}/members/${hash}/tags`, {
    tags: [{ name: TAG, status: "active" }],
  });
}

loadEnvLocal();

const { dryRun, csvPath } = parseArgs(process.argv.slice(2));
if (!csvPath) {
  console.error(
    'Usage: node scripts/import-zoho-mailchimp.mjs [--dry-run] "/path/to/Hospital Dashboard.csv"',
  );
  process.exit(1);
}

const rows = await readCsvRows(csvPath);
const { contacts, invalid } = uniqueContacts(rows);

console.log(`HIL-99 Part 1 — Zoho → Mailchimp`);
console.log(`CSV rows: ${rows.length}`);
console.log(`Unique emails: ${contacts.length}`);
console.log(`Invalid/skipped: ${invalid}`);
console.log(`Tag: ${TAG}`);
console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
console.log(`Sample:`, contacts.slice(0, 3).map((c) => ({ email: c.email, name: c.name, phone: c.phone || null })));

if (dryRun) {
  console.log("Dry run complete — no Mailchimp API calls.");
  process.exit(0);
}

const apiKey = process.env.MAILCHIMP_API_KEY?.trim();
const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX?.trim();
const audienceId = process.env.MAILCHIMP_AUDIENCE_ID?.trim();

if (!apiKey || !serverPrefix || !audienceId) {
  console.error("Missing MAILCHIMP_API_KEY / MAILCHIMP_SERVER_PREFIX / MAILCHIMP_AUDIENCE_ID in .env.local");
  process.exit(1);
}

const config = { apiKey, serverPrefix, audienceId };
let ok = 0;
let failed = 0;
const failures = [];

for (let i = 0; i < contacts.length; i += 1) {
  const contact = contacts[i];
  try {
    await upsertAndTag(config, contact);
    ok += 1;
    if ((i + 1) % 25 === 0 || i + 1 === contacts.length) {
      console.log(`Progress ${i + 1}/${contacts.length} (ok=${ok}, failed=${failed})`);
    }
  } catch (error) {
    failed += 1;
    failures.push({ email: contact.email, error: error.message });
    console.error(`FAIL ${contact.email}: ${error.message}`);
  }
  await sleep(DELAY_MS);
}

console.log(`Done. ok=${ok} failed=${failed}`);
if (failures.length) {
  console.log("Failures:", failures.slice(0, 20));
}
process.exit(failed ? 1 : 0);
