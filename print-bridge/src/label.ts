import type { PrintJobPayload } from "./payload.js";

/**
 * Minimal branded HTML label for Brother QL continuous/die-cut (~62mm wide).
 * Logo asset lands with HIL-10 / HIL-81 polish — text layout is enough for dry-run.
 */
export function renderLabelHtml(payload: PrintJobPayload): string {
  const pestLine = payload.pestsFound
    ? `<p class="warn">Pests noted — handle with care</p>`
    : "";
  const caseLine = payload.caseLabel
    ? escapeHtml(payload.caseLabel)
    : escapeHtml(payload.plantId.slice(0, 8).toUpperCase());

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>HH ${caseLine}</title>
  <style>
    @page { margin: 0; size: 62mm 100mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 3mm;
      width: 62mm;
      font-family: "Libre Franklin", Helvetica, Arial, sans-serif;
      color: #002c36;
      background: #fff;
    }
    .brand {
      font-family: "DM Serif Display", Georgia, serif;
      font-size: 11pt;
      letter-spacing: 0.02em;
      margin: 0 0 1mm;
    }
    .sub {
      font-size: 7pt;
      color: #315f5f;
      margin: 0 0 3mm;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 22mm;
      gap: 2mm;
      align-items: start;
    }
    h1 {
      font-family: "DM Serif Display", Georgia, serif;
      font-size: 13pt;
      font-weight: 400;
      margin: 0 0 1.5mm;
      line-height: 1.15;
    }
    dl { margin: 0; font-size: 8pt; line-height: 1.35; }
    dt { color: #315f5f; font-weight: 500; }
    dd { margin: 0 0 1.5mm; }
    .qr {
      width: 22mm;
      height: 22mm;
      border: 0.4mm solid #171d1a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 5pt;
      text-align: center;
      word-break: break-all;
      padding: 1mm;
      color: #315f5f;
    }
    .warn {
      margin: 2mm 0 0;
      padding: 1.5mm;
      background: #fffbeb;
      border: 0.3mm solid #d3ac54;
      font-size: 7.5pt;
      font-weight: 600;
    }
    .url {
      margin-top: 2mm;
      font-size: 5.5pt;
      color: #315f5f;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <p class="brand">Hilda</p>
  <p class="sub">Houseplant Hospital</p>
  <div class="grid">
    <div>
      <h1>${escapeHtml(payload.plantName)}</h1>
      <dl>
        <dt>Case</dt><dd>${caseLine}</dd>
        <dt>Customer</dt><dd>${escapeHtml(payload.customerSurname)}</dd>
        <dt>Size</dt><dd>${escapeHtml(payload.size)}</dd>
        <dt>Checked in</dt><dd>${escapeHtml(formatDate(payload.checkedInAt))}</dd>
      </dl>
    </div>
    <div class="qr" title="${escapeHtml(payload.caseUrl)}">
      QR<br />scan case
    </div>
  </div>
  ${pestLine}
  <p class="url">${escapeHtml(payload.caseUrl)}</p>
</body>
</html>`;
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
