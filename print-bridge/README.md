# Print bridge (Mac Mini)

Local Node service that receives Houseplant Hospital print jobs and silently prints branded labels on the Brother QL-820NWBc.

Linear: [HIL-80](https://linear.app/hilda-houseplant-hospital/issue/HIL-80) (service), [HIL-12](https://linear.app/hilda-houseplant-hospital/issue/HIL-12) (hardware — Done), [HIL-82](https://linear.app/hilda-houseplant-hospital/issue/HIL-82) (silent `lp`).

## Hilda shop decision (2026-08-04)

- Use the **AirPrint** queue (not Brother CUPS). AirPrint prints reliably on site; CUPS hit repeated **Wrong Roll Type** with the current media.
- Label size: **60×86mm** (`LP_OPTIONS=media=Custom.60x86mm`).
- CUPS remains optional later for **2-colour** (black/red) tape only.

## Setup on the Mac Mini

1. Mac Mini on shop WiFi; Brother QL-820NWBc printing via **AirPrint** (test from Preview/System Settings).
2. Install **Node.js LTS** and **Google Chrome** (headless HTML → PDF).
3. Clone this repo (or copy `print-bridge/`). Prefer branch with HIL-82 silent print.
4. From this folder:

```bash
cp .env.example .env
# Set PRINT_BRIDGE_SECRET (16+ chars)
# Set PRINTER_NAME to the AirPrint queue from: lpstat -p -d
# Set PRINT_MODE=print when ready for real labels
# LP_OPTIONS defaults to media=Custom.60x86mm
npm install
npm run start
```

5. Smoke test:

```bash
curl -s http://127.0.0.1:8787/health

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

With `PRINT_MODE=dry-run`, open the HTML under `.tmp/`. With `PRINT_MODE=print`, a 60×86mm label should print with no dialog.

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/health` | none | Liveness |
| `POST` | `/print` | `Authorization: Bearer …` | Accept job + render (+ print) |

## Notes

- Queue name: `lpstat -p -d` — pick the **AirPrint** entry.
- If `Custom.60x86mm` is rejected, run `lpoptions -p "$QUEUE" -l | grep -i media` and set `LP_OPTIONS` to the matching token.
- Production reachability from Cloudflare is [HIL-85](https://linear.app/hilda-houseplant-hospital/issue/HIL-85) (tunnel / allowlist).
