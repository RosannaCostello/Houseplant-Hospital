#!/usr/bin/env bash
# Install print-bridge as a LaunchAgent so it starts on login and restarts if it crashes.
# Run ON the Mac Mini as the shop user (hilda), from anywhere:
#   bash ~/Hilda/Houseplant-Hospital/print-bridge/scripts/install-launchd.sh
#
# Self-contained: does not need the launchd/ folder on disk.
set -euo pipefail

BRIDGE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PLIST_DEST="$HOME/Library/LaunchAgents/com.hilda.houseplant-hospital.print-bridge.plist"
LABEL="com.hilda.houseplant-hospital.print-bridge"

if [[ ! -f "$BRIDGE_DIR/.env" ]]; then
  echo "Missing $BRIDGE_DIR/.env — copy .env.example and configure first."
  exit 1
fi

if ! grep -q '^PRINT_MODE=print' "$BRIDGE_DIR/.env"; then
  echo "Tip: set PRINT_MODE=print in .env for real labels (currently not set to print)."
fi

mkdir -p "$HOME/Library/LaunchAgents" "$BRIDGE_DIR/logs"

NPX_PATH="$(command -v npx || true)"
if [[ -z "$NPX_PATH" ]]; then
  echo "npx not found on PATH. Install Node (brew install node) and re-run."
  exit 1
fi

# Resolve npx to an absolute path (LaunchAgents get a minimal PATH).
NPX_PATH="$(python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$NPX_PATH")"

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
      <string>${NPX_PATH}</string>
      <string>tsx</string>
      <string>--env-file=.env</string>
      <string>src/index.ts</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${BRIDGE_DIR}/logs/print-bridge.stdout.log</string>
    <key>StandardErrorPath</key>
    <string>${BRIDGE_DIR}/logs/print-bridge.stderr.log</string>
    <key>EnvironmentVariables</key>
    <dict>
      <key>PATH</key>
      <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    </dict>
  </dict>
</plist>
EOF

# Unload if already loaded (ignore errors).
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl unload "$PLIST_DEST" 2>/dev/null || true

launchctl bootstrap "gui/$(id -u)" "$PLIST_DEST" 2>/dev/null \
  || launchctl load "$PLIST_DEST"

echo "Installed LaunchAgent: $PLIST_DEST"
echo "Bridge should be running. Check:"
echo "  curl -s http://127.0.0.1:8787/health"
echo "  launchctl print gui/$(id -u)/$LABEL | head -40"
echo
echo "Logs:"
echo "  $BRIDGE_DIR/logs/print-bridge.stdout.log"
echo "  $BRIDGE_DIR/logs/print-bridge.stderr.log"
echo
echo "Stop:   launchctl bootout gui/$(id -u)/$LABEL"
echo "Start:  launchctl bootstrap gui/$(id -u) $PLIST_DEST"
echo
echo "Note: macOS LaunchAgents start at user login. Enable automatic login"
echo "for the shop user if the Mini should print after a reboot without unlocking."
