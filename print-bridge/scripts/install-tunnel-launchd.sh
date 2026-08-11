#!/usr/bin/env bash
# Install cloudflared tunnel as a LaunchAgent (starts at login, restarts on crash).
# Run ON the Mac Mini as shop user (hilda):
#   bash ~/Hilda/Houseplant-Hospital/print-bridge/scripts/install-tunnel-launchd.sh
set -euo pipefail

BRIDGE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$BRIDGE_DIR/scripts/run-permanent-tunnel.sh"
PLIST_DEST="$HOME/Library/LaunchAgents/com.hilda.houseplant-hospital.cloudflared.plist"
LABEL="com.hilda.houseplant-hospital.cloudflared"

chmod +x "$SCRIPT"

CLOUDFLARED="$(command -v cloudflared || true)"
if [[ -z "$CLOUDFLARED" ]]; then
  echo "Install cloudflared first: brew install cloudflared"
  exit 1
fi
CLOUDFLARED="$(python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$CLOUDFLARED")"

if [[ ! -f "$BRIDGE_DIR/.env" ]] || ! grep -q '^PRINT_BRIDGE_SECRET=' "$BRIDGE_DIR/.env"; then
  echo "Need PRINT_BRIDGE_SECRET in $BRIDGE_DIR/.env"
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents" "$BRIDGE_DIR/logs"

# Prefer bash from PATH for the wrapper script.
BASH_PATH="$(command -v bash)"

cat > "$PLIST_DEST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>${LABEL}</string>
    <key>WorkingDirectory</key>
    <string>${BRIDGE_DIR}</string>
    <key>ProgramArguments</key>
    <array>
      <string>${BASH_PATH}</string>
      <string>${SCRIPT}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${BRIDGE_DIR}/logs/tunnel-launchd.stdout.log</string>
    <key>StandardErrorPath</key>
    <string>${BRIDGE_DIR}/logs/tunnel-launchd.stderr.log</string>
    <key>EnvironmentVariables</key>
    <dict>
      <key>PATH</key>
      <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
      <key>PRINT_BRIDGE_REGISTER_URL</key>
      <string>https://houseplanthospital.hildaedinburgh.workers.dev/api/print-bridge/register</string>
    </dict>
  </dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl unload "$PLIST_DEST" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_DEST" 2>/dev/null || launchctl load "$PLIST_DEST"

echo "Installed LaunchAgent: $PLIST_DEST"
echo "cloudflared binary: $CLOUDFLARED"
echo
echo "Stop any manual quick-tunnel Terminal (Ctrl+C) — LaunchAgent replaces it."
echo
echo "Check logs in ~30s:"
echo "  tail -30 $BRIDGE_DIR/logs/cloudflared.stdout.log"
echo "  tail -30 $BRIDGE_DIR/logs/tunnel-launchd.stderr.log"
echo
echo "Stop:  launchctl bootout gui/$(id -u)/$LABEL"
echo "Start: launchctl bootstrap gui/$(id -u) $PLIST_DEST"
