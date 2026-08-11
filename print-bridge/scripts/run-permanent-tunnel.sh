#!/usr/bin/env bash
# Permanent Cloudflare quick-tunnel + URL registration (HIL-85).
# Runs under LaunchAgent — no Terminal window needed.
# On each start, cloudflared gets a trycloudflare.com URL and registers it
# with the live Houseplant Hospital app so iPad printing keeps working after reboot.
set -euo pipefail

BRIDGE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$BRIDGE_DIR/logs"
mkdir -p "$LOG_DIR"

CLOUDFLARED="$(command -v cloudflared || true)"
if [[ -z "$CLOUDFLARED" ]]; then
  echo "cloudflared not found on PATH" >&2
  exit 1
fi

if [[ ! -f "$BRIDGE_DIR/.env" ]]; then
  echo "Missing $BRIDGE_DIR/.env" >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a
# Load only the keys we need (avoid `source` executing odd values).
PRINT_BRIDGE_SECRET="$(grep -E '^PRINT_BRIDGE_SECRET=' "$BRIDGE_DIR/.env" | head -1 | cut -d= -f2- | tr -d '\r')"
set +a

REGISTER_URL="${PRINT_BRIDGE_REGISTER_URL:-https://houseplanthospital.hildaedinburgh.workers.dev/api/print-bridge/register}"

if [[ -z "${PRINT_BRIDGE_SECRET:-}" ]]; then
  echo "PRINT_BRIDGE_SECRET missing in .env" >&2
  exit 1
fi

FIFO="$LOG_DIR/cloudflared.pipe"
rm -f "$FIFO"
mkfifo "$FIFO"

# Parse URL from cloudflared output and register once.
(
  registered=0
  while IFS= read -r line; do
    echo "$line"
    if [[ "$registered" -eq 0 ]]; then
      url="$(printf '%s\n' "$line" | grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' | head -1 || true)"
      if [[ -n "$url" ]]; then
        echo "[tunnel] registering $url"
        if curl -fsS -m 30 -X POST "$REGISTER_URL" \
          -H "authorization: Bearer ${PRINT_BRIDGE_SECRET}" \
          -H "content-type: application/json" \
          -d "{\"url\":\"${url}\"}"; then
          echo
          echo "[tunnel] registered ok"
          registered=1
        else
          echo
          echo "[tunnel] register failed — will keep running; cron/print may retry after next restart"
        fi
      fi
    fi
  done
) <"$FIFO" | tee -a "$LOG_DIR/cloudflared.stdout.log" &
PARSER_PID=$!

cleanup() {
  kill "$PARSER_PID" 2>/dev/null || true
  rm -f "$FIFO"
}
trap cleanup EXIT

# cloudflared logs to stderr mostly — merge streams into the pipe.
exec "$CLOUDFLARED" tunnel --no-autoupdate --url "http://127.0.0.1:8787" >"$FIFO" 2>&1
