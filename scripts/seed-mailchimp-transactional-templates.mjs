/**
 * Seed / refresh Mailchimp Transactional (Mandrill) templates for hospital Route A emails.
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-mailchimp-transactional-templates.mjs
 *   node --env-file=.env.local scripts/seed-mailchimp-transactional-templates.mjs --force
 *
 * Without --force, existing templates are left alone (safe). With --force, code/subject are
 * overwritten from the app seed (destructive to manual edits in Mandrill).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const force = process.argv.includes("--force");

function loadEnvLocal() {
  if (process.env.MAILCHIMP_TRANSACTIONAL_API_KEY) return;
  try {
    const raw = readFileSync(join(__dirname, "../.env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      if (process.env[m[1]] == null) process.env[m[1]] = m[2];
    }
  } catch {
    // ignore
  }
}

loadEnvLocal();

const key = process.env.MAILCHIMP_TRANSACTIONAL_API_KEY?.trim();
const fromEmail = process.env.MAILCHIMP_TRANSACTIONAL_FROM_EMAIL?.trim() || "hospital@hilda.co";
const fromName =
  process.env.MAILCHIMP_TRANSACTIONAL_FROM_NAME?.trim() || "Hilda Houseplant Hospital";

if (!key) {
  console.error("MAILCHIMP_TRANSACTIONAL_API_KEY is required");
  process.exit(1);
}

/** Inline seed (keep in sync with lib/mailchimp/hospital-transactional-templates.ts). */
const SEEDS = [
  {
    name: "hh-plant-checked-in",
    subject: "Checked in at Hilda Houseplant Hospital",
    headline: "We've checked in your plant",
    bodyHtml:
      "Your *|SPECIES|* is with us at Hilda Houseplant Hospital. You can follow progress on your Care Card anytime.",
    bodyText:
      "Your *|SPECIES|* is with us at Hilda Houseplant Hospital. You can follow progress on your Care Card anytime.",
  },
  {
    name: "hh-plant-quarantined",
    subject: "Your plant is in Quarantine",
    headline: "Quarantine",
    bodyHtml:
      "Your *|SPECIES|* is in Quarantine at the Hospital while we assess and treat. Open your Care Card for the latest status.",
    bodyText:
      "Your *|SPECIES|* is in Quarantine at the Hospital while we assess and treat. Open your Care Card for the latest status.",
  },
  {
    name: "hh-plant-in-surgery",
    subject: "Your plant is in Surgery",
    headline: "In Surgery",
    bodyHtml:
      "Your *|SPECIES|* is in Surgery with our team. We'll update you when it's ready — you can also check your Care Card.",
    bodyText:
      "Your *|SPECIES|* is in Surgery with our team. We'll update you when it's ready — you can also check your Care Card.",
  },
  {
    name: "hh-plant-outpatient",
    subject: "Ready for collection at Hilda",
    headline: "Ready for collection",
    bodyHtml:
      "Your *|SPECIES|* is ready to pick up from Hilda. View aftercare details on your Care Card before you visit.",
    bodyText:
      "Your *|SPECIES|* is ready to pick up from Hilda. View aftercare details on your Care Card before you visit.",
  },
  {
    name: "hh-plant-outpatient-partial",
    subject: "One of your plants is ready",
    headline: "Partial update",
    bodyHtml:
      "Your *|SPECIES|* is ready, but *|AWAITING_SUMMARY|*. We'll email again when the whole drop-off is ready. Check your Care Card for details.",
    bodyText:
      "Your *|SPECIES|* is ready, but *|AWAITING_SUMMARY|*. We'll email again when the whole drop-off is ready. Check your Care Card for details.",
  },
  {
    name: "hh-plant-outpatient-reminder",
    subject: "Friendly reminder — plant ready for collection",
    headline: "Still ready for collection",
    bodyHtml:
      "Your *|SPECIES|* is still waiting for collection at Hilda. Open your Care Card for details, or speak to the team in store.",
    bodyText:
      "Your *|SPECIES|* is still waiting for collection at Hilda. Open your Care Card for details, or speak to the team in store.",
  },
  {
    name: "hh-plant-dead",
    subject: "Update from Hilda Houseplant Hospital",
    headline: "Assessment complete",
    bodyHtml:
      "Please speak to the Hilda team about your *|SPECIES|*. Your Care Card has the latest status.",
    bodyText:
      "Please speak to the Hilda team about your *|SPECIES|*. Your Care Card has the latest status.",
  },
  {
    name: "hh-plant-propagated",
    subject: "A new propagation from your plant",
    headline: "Propagation",
    bodyHtml:
      "We've started a new propagation from your *|SPECIES|*. Follow both plants on your Care Card.",
    bodyText:
      "We've started a new propagation from your *|SPECIES|*. Follow both plants on your Care Card.",
  },
  {
    name: "hh-bugs-found",
    subject: "Pests found on your plant",
    headline: "Pests found",
    bodyHtml:
      "We've found pests on your *|SPECIES|* and are treating them at the Hospital. Open your Care Card for details.",
    bodyText:
      "We've found pests on your *|SPECIES|* and are treating them at the Hospital. Open your Care Card for details.",
  },
];

function wrapHtml(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:0;background:#f7f4ef;font-family:Helvetica,Arial,sans-serif;color:#2c2a26;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f4ef;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#fffdf9;border:1px solid #e6e0d6;border-radius:12px;padding:28px 24px;">
          <tr><td style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#b08d3a;">Hilda Houseplant Hospital</td></tr>
          <tr><td style="padding-top:20px;font-size:16px;line-height:1.55;color:#4a463f;">Hi *|FNAME|*,</td></tr>
          <tr><td style="padding-top:14px;font-size:16px;line-height:1.55;color:#4a463f;">${bodyHtml}</td></tr>
          <tr>
            <td style="padding-top:24px;">
              <a href="*|CARE_CARD_URL|*" style="display:inline-block;background:#b08d3a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 18px;border-radius:8px;">View your Care Card</a>
            </td>
          </tr>
          <tr><td style="padding-top:28px;font-size:16px;line-height:1.55;color:#4a463f;">Thanks,<br />Hilda team</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function wrapText(bodyText) {
  return `Hi *|FNAME|*,\n\n${bodyText}\n\nView your Care Card: *|CARE_CARD_URL|*\n\nThanks,\nHilda team`;
}

async function mandrill(path, body) {
  const res = await fetch(`https://mandrillapp.com/api/1.0/${path}.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, ...body }),
  });
  const data = await res.json();
  if (!res.ok || data?.status === "error") {
    throw new Error(`${path}: ${data?.message || res.status}`);
  }
  return data;
}

async function templateExists(name) {
  const res = await fetch(`https://mandrillapp.com/api/1.0/templates/info.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, name }),
  });
  const data = await res.json();
  if (data?.slug || data?.name === name) return true;
  if (data?.name === "Unknown_Template" || data?.status === "error") return false;
  if (!res.ok) return false;
  return Boolean(data?.name);
}

async function main() {
  console.log(force ? "Seeding templates (--force overwrites)…" : "Seeding missing templates only…");

  for (const seed of SEEDS) {
    const code = wrapHtml(seed.bodyHtml);
    const text = wrapText(seed.bodyText);
    const exists = await templateExists(seed.name);

    if (exists && !force) {
      console.log(`skip  ${seed.name} (exists; use --force to overwrite)`);
      continue;
    }

    if (!exists) {
      await mandrill("templates/add", {
        name: seed.name,
        from_email: fromEmail,
        from_name: fromName,
        subject: seed.subject,
        code,
        text,
        publish: true,
      });
      console.log(`add   ${seed.name}`);
    } else {
      await mandrill("templates/update", {
        name: seed.name,
        from_email: fromEmail,
        from_name: fromName,
        subject: seed.subject,
        code,
        text,
        publish: true,
      });
      console.log(`update ${seed.name}`);
    }
  }

  console.log("Done. Edit in Mailchimp Transactional → Outbound → Templates.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
