# Print bridge (Mac Mini)

Local Node service that receives Houseplant Hospital print jobs and silently prints branded labels on the Brother QL-820NWBc via CUPS.

Linear: [HIL-80](https://linear.app/hilda-houseplant-hospital/issue/HIL-80) (service), [HIL-12](https://linear.app/hilda-houseplant-hospital/issue/HIL-12) (hardware — Done), [HIL-82](https://linear.app/hilda-houseplant-hospital/issue/HIL-82) (silent `lp`).

## Setup on the Mac Mini

1. Finish [HIL-12](https://linear.app/hilda-houseplant-hospital/issue/HIL-12): shop WiFi, Brother **CUPS** driver (not AirPrint), successful test print with the correct DK media size.
2. Install **Node.js LTS** and **Google Chrome** (used headless for HTML → PDF).
3. Clone this repo (or copy `print-bridge/`).
4. From this folder:

```bash
cp .env.example .env
# Set PRINT_BRIDGE_SECRET (16+ chars)
# Set PRINTER_NAME from: lpstat -p -d
# Set PRINT_MODE=print when ready for real labels
npm install
npm run start
```

5. Smoke test:

```bash
curl -s http://127.0.0.1:8787/health

# Dry-run first (PRINT_MODE=dry-run) — opens HTML under .tmp/
curl -s -X POST http://127.0.0.1:8787/print \
  -H "authorization: Bearer YOUR_SECRET" \
  -H "content-type: application/json" \
  -d '{
    "plantId": "11111111-1111-1111-1111-111111111111",
    "caseUrl": "https://houseplanthospital.hildaedinburgh.workers.dev/hh/case/11111111-1111-1111-1111-111111111111",
    "customerSurname": "Smith",
    "plantName": "Monstera",
    "size": "Medium",
    "pestsFound": false,
    "checkedInAt": "2026-07-24T10:00:00.000Z"
  }'
```

Then set `PRINT_MODE=print`, restart, and POST again — a label should come out with no dialog.

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/health` | none | Liveness |
| `POST` | `/print` | `Authorization: Bearer …` | Accept job + render (+ print) |

## Notes

- Prefer **CUPS** driver over AirPrint for silent print and 2-colour labels.
- Queue name: `lpstat -p -d`.
- Media size: set once in CUPS (`http://localhost:631/printers` → Set Default Options) to match the DK roll. Only use `LP_OPTIONS` if you need to override.
- Production reachability from Cloudflare is [HIL-85](https://linear.app/hilda-houseplant-hospital/issue/HIL-85) (tunnel / allowlist).
