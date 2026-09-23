#!/usr/bin/env node
/**
 * Unarchive Mailchimp contacts that are currently archived ONLY.
 * Does not modify subscribed / unsubscribed / transactional / cleaned live contacts.
 *
 * Classification (from member activity):
 * - had "unsub" action → restore as unsubscribed
 * - else → restore as subscribed
 *
 * Usage:
 *   node scripts/unarchive-mailchimp-contacts.mjs --dry-run
 *   node scripts/unarchive-mailchimp-contacts.mjs
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function subscriberHash(email) {
  return createHash("md5").update(email.trim().toLowerCase()).digest("hex");
}

loadEnvLocal();

const dryRun = process.argv.includes("--dry-run");
const apiKey = process.env.MAILCHIMP_API_KEY?.trim();
const server = process.env.MAILCHIMP_SERVER_PREFIX?.trim();
const audienceId = process.env.MAILCHIMP_AUDIENCE_ID?.trim();

if (!apiKey || !server || !audienceId) {
  console.error("Missing MAILCHIMP_API_KEY / MAILCHIMP_SERVER_PREFIX / MAILCHIMP_AUDIENCE_ID");
  process.exit(1);
}

async function mc(method, path, body) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const res = await fetch(`https://${server}.api.mailchimp.com/3.0${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
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
  throw new Error(`Rate limited: ${method} ${path}`);
}

console.log(`Unarchive Mailchimp archived contacts`);
console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
console.log(`Audience: ${audienceId}`);
console.log(`Hard rule: only members with status=archived are modified.\n`);

// Snapshot live audience sizes before (for verification)
const listBefore = await mc("GET", `/lists/${audienceId}`);
const before = {
  member_count: listBefore.stats?.member_count,
  unsubscribe_count: listBefore.stats?.unsubscribe_count,
  cleaned_count: listBefore.stats?.cleaned_count,
};
console.log("Audience before:", before);

const archived = [];
let offset = 0;
while (true) {
  const data = await mc(
    "GET",
    `/lists/${audienceId}/members?status=archived&count=1000&offset=${offset}&fields=members.email_address,members.status,members.last_changed,members.tags,total_items`,
  );
  for (const m of data.members || []) {
    if (m.status !== "archived") continue;
    archived.push({
      email: m.email_address,
      last_changed: m.last_changed,
      tags: (m.tags || []).map((t) => t.name || t),
    });
  }
  if ((data.members || []).length < 1000) break;
  offset += 1000;
}

console.log(`Archived contacts found: ${archived.length}`);

const toUnsubscribed = [];
const toSubscribed = [];
const classifyErrors = [];

for (let i = 0; i < archived.length; i += 1) {
  const row = archived[i];
  try {
    const act = await mc(
      "GET",
      `/lists/${audienceId}/members/${subscriberHash(row.email)}/activity?count=100`,
    );
    const actions = (act.activity || []).map((x) => x.action);
    if (actions.includes("unsub")) {
      toUnsubscribed.push(row.email);
    } else {
      toSubscribed.push(row.email);
    }
  } catch (error) {
    classifyErrors.push({ email: row.email, error: error.message });
  }
  if ((i + 1) % 50 === 0 || i + 1 === archived.length) {
    console.log(
      `Classify ${i + 1}/${archived.length} → unsub=${toUnsubscribed.length} sub=${toSubscribed.length} err=${classifyErrors.length}`,
    );
  }
  await sleep(60);
}

console.log(`\nPlan: ${toUnsubscribed.length} → unsubscribed, ${toSubscribed.length} → subscribed`);
if (classifyErrors.length) {
  console.log(`Classify failures: ${classifyErrors.length}`, classifyErrors.slice(0, 5));
}

const reportPath = resolve(
  process.cwd(),
  `scripts/unarchive-mailchimp-report-${dryRun ? "dryrun" : "live"}-${Date.now()}.json`,
);
writeFileSync(
  reportPath,
  JSON.stringify(
    {
      dryRun,
      before,
      archivedTotal: archived.length,
      toUnsubscribed,
      toSubscribed,
      classifyErrors,
    },
    null,
    2,
  ),
);
console.log(`Wrote classification report: ${reportPath}`);

if (dryRun) {
  console.log("\nDry run complete — no Mailchimp writes.");
  process.exit(0);
}

let okSub = 0;
let okUnsub = 0;
let skippedNotArchived = 0;
const failures = [];

async function restore(email, targetStatus) {
  const hash = subscriberHash(email);
  // Race-safe: only proceed if still archived
  const current = await mc("GET", `/lists/${audienceId}/members/${hash}`);
  if (current.status !== "archived") {
    skippedNotArchived += 1;
    return { skipped: true, status: current.status };
  }

  const updated = await mc("PUT", `/lists/${audienceId}/members/${hash}`, {
    email_address: email,
    status: targetStatus,
  });
  return { skipped: false, status: updated.status };
}

for (let i = 0; i < toUnsubscribed.length; i += 1) {
  const email = toUnsubscribed[i];
  try {
    const result = await restore(email, "unsubscribed");
    if (!result.skipped) okUnsub += 1;
  } catch (error) {
    failures.push({ email, target: "unsubscribed", error: error.message });
  }
  if ((i + 1) % 25 === 0 || i + 1 === toUnsubscribed.length) {
    console.log(`Unsub restore ${i + 1}/${toUnsubscribed.length} ok=${okUnsub} fail=${failures.length}`);
  }
  await sleep(120);
}

for (let i = 0; i < toSubscribed.length; i += 1) {
  const email = toSubscribed[i];
  try {
    const result = await restore(email, "subscribed");
    if (!result.skipped) okSub += 1;
  } catch (error) {
    // If Mailchimp refuses subscribe (compliance), fall back to transactional (non-subscribed)
    try {
      const current = await mc("GET", `/lists/${audienceId}/members/${subscriberHash(email)}`);
      if (current.status === "archived") {
        await mc("PUT", `/lists/${audienceId}/members/${subscriberHash(email)}`, {
          email_address: email,
          status: "transactional",
        });
        okSub += 1; // restored, but as transactional
        failures.push({
          email,
          target: "subscribed",
          error: `subscribe refused; restored as transactional instead: ${error.message}`,
          recovered: true,
        });
      } else {
        failures.push({ email, target: "subscribed", error: error.message });
      }
    } catch (error2) {
      failures.push({ email, target: "subscribed", error: `${error.message} | fallback: ${error2.message}` });
    }
  }
  if ((i + 1) % 25 === 0 || i + 1 === toSubscribed.length) {
    console.log(`Sub restore ${i + 1}/${toSubscribed.length} ok=${okSub} fail=${failures.length}`);
  }
  await sleep(120);
}

const listAfter = await mc("GET", `/lists/${audienceId}`);
const after = {
  member_count: listAfter.stats?.member_count,
  unsubscribe_count: listAfter.stats?.unsubscribe_count,
  cleaned_count: listAfter.stats?.cleaned_count,
};

const stillArchived = await mc(
  "GET",
  `/lists/${audienceId}/members?status=archived&count=1&fields=total_items`,
);

// Spot-check known emails
const spot = {};
for (const email of ["mgcindiweni@gmail.com", "mariabarqawi@live.com"]) {
  try {
    const m = await mc("GET", `/lists/${audienceId}/members/${subscriberHash(email)}`);
    spot[email] = {
      status: m.status,
      tags: (m.tags || []).map((t) => t.name || t),
    };
  } catch (error) {
    spot[email] = { error: error.message };
  }
}

const summary = {
  okUnsub,
  okSub,
  skippedNotArchived,
  failures,
  before,
  after,
  archivedRemaining: stillArchived.total_items,
  spot,
};

writeFileSync(
  resolve(process.cwd(), `scripts/unarchive-mailchimp-result-${Date.now()}.json`),
  JSON.stringify(summary, null, 2),
);

console.log("\nDone.");
console.log(JSON.stringify(summary, null, 2));
if (failures.filter((f) => !f.recovered).length) {
  process.exitCode = 1;
}
