#!/usr/bin/env node
/**
 * Retry subscribe for the 120 contacts that unarchived as transactional
 * because Mailchimp rejected subscribed (merge-field error first).
 *
 * Scope (hard):
 * - Only emails listed in the prior result's recoveredToTransactional
 * - Only if current status is still transactional
 * - Never sends campaigns/events/emails
 *
 * Usage:
 *   node scripts/retry-subscribe-transactional-fallbacks.mjs --dry-run
 *   node scripts/retry-subscribe-transactional-fallbacks.mjs
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
const priorPath = resolve(
  process.cwd(),
  "scripts/unarchive-mailchimp-result-1789249468950.json",
);

if (!apiKey || !server || !audienceId) {
  console.error("Missing MAILCHIMP_API_KEY / MAILCHIMP_SERVER_PREFIX / MAILCHIMP_AUDIENCE_ID");
  process.exit(1);
}

const prior = JSON.parse(readFileSync(priorPath, "utf8"));
const emails = (prior.recoveredToTransactional || []).map((r) => r.email);
if (emails.length !== 120) {
  console.warn(`Expected 120 recovered emails, found ${emails.length}`);
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

console.log(`Retry subscribe for prior transactional fallbacks`);
console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
console.log(`Audience: ${audienceId}`);
console.log(`Candidates: ${emails.length}`);
console.log(`Hard rule: only prior-fallback emails still status=transactional.\n`);

const listBefore = await mc("GET", `/lists/${audienceId}`);
const before = {
  member_count: listBefore.stats?.member_count,
  unsubscribe_count: listBefore.stats?.unsubscribe_count,
  cleaned_count: listBefore.stats?.cleaned_count,
};
console.log("Audience before:", before);

let okSubscribed = 0;
let skippedWrongStatus = 0;
let complianceBlocked = 0;
let otherFail = 0;
const details = [];

for (let i = 0; i < emails.length; i += 1) {
  const email = emails[i];
  const hash = subscriberHash(email);
  try {
    const current = await mc(
      "GET",
      `/lists/${audienceId}/members/${hash}?fields=email_address,status,merge_fields`,
    );
    if (current.status !== "transactional") {
      skippedWrongStatus += 1;
      details.push({
        email,
        outcome: "skipped",
        reason: `status=${current.status}`,
      });
    } else if (dryRun) {
      details.push({
        email,
        outcome: "would_try",
        name: (current.merge_fields?.NAME || "").trim() || "friend",
      });
    } else {
      const name = (current.merge_fields?.NAME || "").trim() || "friend";
      try {
        const updated = await mc("PUT", `/lists/${audienceId}/members/${hash}`, {
          email_address: email,
          status: "subscribed",
          merge_fields: { NAME: name },
        });
        okSubscribed += 1;
        details.push({ email, outcome: "subscribed", name, status: updated.status });
      } catch (error) {
        const msg = error.message || String(error);
        const isCompliance = /compliance state/i.test(msg);
        if (isCompliance) {
          complianceBlocked += 1;
          details.push({ email, outcome: "compliance_blocked", error: msg, name });
        } else {
          otherFail += 1;
          details.push({ email, outcome: "failed", error: msg, name });
        }
      }
    }
  } catch (error) {
    otherFail += 1;
    details.push({ email, outcome: "failed", error: error.message });
  }

  if ((i + 1) % 25 === 0 || i + 1 === emails.length) {
    console.log(
      `Progress ${i + 1}/${emails.length} sub=${okSubscribed} compliance=${complianceBlocked} skip=${skippedWrongStatus} fail=${otherFail}`,
    );
  }
  await sleep(120);
}

const listAfter = dryRun
  ? listBefore
  : await mc("GET", `/lists/${audienceId}`);
const after = {
  member_count: listAfter.stats?.member_count,
  unsubscribe_count: listAfter.stats?.unsubscribe_count,
  cleaned_count: listAfter.stats?.cleaned_count,
};

const summary = {
  dryRun,
  candidates: emails.length,
  okSubscribed,
  complianceBlocked,
  skippedWrongStatus,
  otherFail,
  before,
  after,
  details,
};

const outPath = resolve(
  process.cwd(),
  `scripts/retry-subscribe-result-${dryRun ? "dryrun" : "live"}-${Date.now()}.json`,
);
writeFileSync(outPath, JSON.stringify(summary, null, 2));

console.log("\nDone.");
console.log(
  JSON.stringify(
    {
      dryRun,
      candidates: emails.length,
      okSubscribed,
      complianceBlocked,
      skippedWrongStatus,
      otherFail,
      before,
      after,
      report: outPath,
    },
    null,
    2,
  ),
);

if (otherFail) process.exitCode = 1;
