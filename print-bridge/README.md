# Print bridge (Mac Mini)

Local Node service that receives Houseplant Hospital print jobs and (soon) silently prints branded labels on the Brother QL-820NWBc.

Linear: [HIL-80](https://linear.app/hilda-houseplant-hospital/issue/HIL-80) (this service), [HIL-12](https://linear.app/hilda-houseplant-hospital/issue/HIL-12) (hardware), [HIL-82](https://linear.app/hilda-houseplant-hospital/issue/HIL-82) (silent `lp`).

## Setup on the Mac Mini

1. Finish [HIL-12](https://linear.app/hilda-houseplant-hospital/issue/HIL-12): shop WiFi, Brother **CUPS** driver, successful test print.
2. Install **Node.js LTS**.
3. Clone this repo (or copy `print-bridge/`).
4. From this folder:

```bash
cp .env.example .env
# edit PRINT_BRIDGE_SECRET (16+ chars) and later PRINTER_NAME
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

With `PRINT_MODE=dry-run`, open the HTML path returned under `.tmp/`.

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/health` | none | Liveness |
| `POST` | `/print` | `Authorization: Bearer …` | Accept job + render label |

## Notes

- Prefer **CUPS** driver over AirPrint for silent print and 2-colour labels.
- Queue name: `lpstat -p -d`.
- Production reachability from Cloudflare is [HIL-85](https://linear.app/hilda-houseplant-hospital/issue/HIL-85) (tunnel / allowlist).
