import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PrintJobPayload } from "./payload.js";
import { LABEL_HEIGHT_MM, LABEL_WIDTH_MM } from "./label-size.js";

const assetsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "assets");
const logoPng = readFileSync(path.join(assetsDir, "hilda-logo-gold-800.png"));
const HILDA_LOGO_DATA_URI = `data:image/png;base64,${logoPng.toString("base64")}`;

/**
 * Branded HTML label for Brother QL via AirPrint (Hilda: 60×86mm).
 * No QR / no case id. Hilda gold wordmark from brand CDN (cached in assets/).
 */
export function renderLabelHtml(payload: PrintJobPayload): string {
  const pestsAnswer = payload.pestsFound ? "Yes" : "No";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>HH ${escapeHtml(payload.plantName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Libre+Franklin:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    @page { margin: 0; size: ${LABEL_WIDTH_MM}mm ${LABEL_HEIGHT_MM}mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      width: ${LABEL_WIDTH_MM}mm;
      height: ${LABEL_HEIGHT_MM}mm;
      padding: 4.5mm 5mm 4.5mm;
      font-family: "Libre Franklin", Helvetica, Arial, sans-serif;
      color: #002c36;
      background: #fff;
      display: flex;
      flex-direction: column;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .top {
      text-align: center;
      border-bottom: 0.35mm solid #002c36;
      padding-bottom: 2.5mm;
      margin-bottom: 3.5mm;
    }
    .logo {
      display: block;
      width: 42mm;
      height: auto;
      margin: 0 auto 1.8mm;
    }
    .product {
      font-size: 6.5pt;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #315f5f;
      margin: 0;
    }
    .plant {
      font-family: "DM Serif Display", Georgia, serif;
      font-weight: 400;
      font-size: 20pt;
      line-height: 1.05;
      margin: 0 0 2mm;
      word-wrap: break-word;
    }
    .customer {
      font-size: 13pt;
      font-weight: 600;
      letter-spacing: 0.01em;
      margin: 0 0 4mm;
      color: #002c36;
    }
    .visit {
      font-weight: 500;
      color: #315f5f;
      font-size: 11pt;
    }
    .meta {
      margin: 0;
      padding: 0;
      list-style: none;
      flex: 1;
    }
    .meta li {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 3mm;
      padding: 1.6mm 0;
      border-top: 0.2mm solid rgba(23, 29, 26, 0.22);
      font-size: 9.5pt;
      line-height: 1.2;
    }
    .meta .k {
      font-size: 7pt;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #315f5f;
      flex-shrink: 0;
    }
    .meta .v {
      font-weight: 500;
      text-align: right;
      word-break: break-word;
    }
    .meta li.pests-yes .v {
      font-weight: 700;
    }
  </style>
</head>
<body>
  <header class="top">
    <img class="logo" src="${HILDA_LOGO_DATA_URI}" alt="Hilda" width="500" height="149" />
    <p class="product">Houseplant Hospital</p>
  </header>
  <h1 class="plant">${escapeHtml(payload.plantName)}</h1>
  <p class="customer">${escapeHtml(payload.customerSurname)}${
    payload.visitPosition
      ? ` <span class="visit">${escapeHtml(payload.visitPosition)}</span>`
      : ""
  }</p>
  <ul class="meta">
    <li><span class="k">Size</span><span class="v">${escapeHtml(payload.size)}</span></li>
    <li><span class="k">Checked in</span><span class="v">${escapeHtml(formatDate(payload.checkedInAt))}</span></li>
    <li class="${payload.pestsFound ? "pests-yes" : ""}"><span class="k">Pests at check-in</span><span class="v">${pestsAnswer}</span></li>
  </ul>
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
