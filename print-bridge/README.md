# Print bridge (Mac Mini)

Local Node service that receives Houseplant Hospital print jobs and silently prints branded labels on the Brother QL-820NWBc.

Linear: [HIL-80](https://linear.app/hilda-houseplant-hospital/issue/HIL-80) (service), [HIL-12](https://linear.app/hilda-houseplant-hospital/issue/HIL-12) (hardware — Done), [HIL-82](https://linear.app/hilda-houseplant-hospital/issue/HIL-82) (silent `lp`), [HIL-111](https://linear.app/hilda-houseplant-hospital/issue/HIL-111) (label design), [HIL-112](https://linear.app/hilda-houseplant-hospital/issue/HIL-112) (always-on + queue).

## Hilda shop decision (2026-08-04)

- Use the **AirPrint** queue (not Brother CUPS). AirPrint prints reliably on site; CUPS hit repeated **Wrong Roll Type** with the current media.
- Label size: **60×86mm** (`LP_OPTIONS=media=Custom.60x86mm`).
- **No QR** on labels (HIL-81 canceled).
- CUPS remains optional later for **2-colour** (black/red) tape only.

## Setup on the Mac Mini (not your laptop)

Print-bridge runs **only on the shop Mac Mini**. Cursor/dev machine does not talk to the Brother.

1. Mac Mini on shop WiFi; Brother QL-820NWBc printing via **AirPrint** queue **`HH_Airprint`**.
2. Install **Node.js LTS** and **Google Chrome** (headless HTML → PDF).
3. On the Mini, clone/pull this repo and open `print-bridge/`:

```bash
git fetch && git checkout jack/hil-82-phase-4-macos-silent-print-integration
cd print-bridge
cp .env.example .env
```

4. Edit `.env` on the Mini:

```
PRINT_BRIDGE_SECRET=<16+ random chars>
PRINTER_NAME=HH_Airprint
LP_OPTIONS=media=Custom.60x86mm
PRINT_MODE=dry-run
```

5. Start and smoke-test **on the Mini**:

```bash
npm install
npm run start
# other Terminal tab on the Mini:
curl -s http://127.0.0.1:8787/health
```

Then POST `/print` (see below). When HTML looks right, set `PRINT_MODE=print`, restart, POST again.

```bash
curl -s http://127.0.0.1:8787/health

curl -s -X POST http://127.0.0.1:8787/print \
  -H "authorization: Bearer YOUR_SECRET" \
  -H "content-type: application/json" \
  -d '{
    "plantId": "11111111-1111-4111-8111-111111111111",
    "caseUrl": "https://houseplanthospital.hildaedinburgh.workers.dev/hh/case/11111111-1111-4111-8111-111111111111",
    "customerSurname": "Smith",
    "plantName": "Monstera",
    "size": "Medium",
    "pestsFound": false,
    "checkedInAt": "2026-07-24T10:00:00.000Z"
  }'
```

With `PRINT_MODE=dry-run`, open the HTML under `.tmp/`. With `PRINT_MODE=print`, a 60×86mm label should print with no dialog.

## Always-on (launchd) — install once on the Mini

So the bridge starts at login and restarts if it crashes:

```bash
# On the Mini, with .env already set to PRINT_MODE=print
bash ~/Hilda/Houseplant-Hospital/print-bridge/scripts/install-launchd.sh
curl -s http://127.0.0.1:8787/health
```

- Logs: `print-bridge/logs/print-bridge.stdout.log` (and `.stderr.log`)
- After reboot, the shop user must be logged in (enable **automatic login** for `hilda` if the Mini should print without unlocking)
- When the Mini is **off** or the bridge is down: the **app** should still enqueue `print_jobs` as `pending` (HIL-83); when the Mini is back, those jobs are drained. The bridge itself does not store a durable offline queue — Supabase does.

## Label design

Edit `src/label.ts`, dry-run to preview HTML in `.tmp/`, then print a real label. Track iteration in [HIL-111](https://linear.app/hilda-houseplant-hospital/issue/HIL-111).

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/health` | none | Liveness |
| `POST` | `/print` | `Authorization: Bearer …` | Accept job + render (+ print) |

## Notes

- Queue name at Hilda: **`HH_Airprint`** (`lpstat -p -d` to confirm).
- Prefer **AirPrint** queue over Brother CUPS — AirPrint prints reliably; CUPS hit Wrong Roll Type on site.
- If `Custom.60x86mm` is rejected, run `lpoptions -p "$QUEUE" -l | grep -i media` and set `LP_OPTIONS` to the matching token.
- Production reachability from Cloudflare is [HIL-85](https://linear.app/hilda-houseplant-hospital/issue/HIL-85) (tunnel / allowlist).
