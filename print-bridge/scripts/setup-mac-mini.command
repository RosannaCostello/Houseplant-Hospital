#!/bin/bash
# Double-click this on the Mac Mini (or: bash setup-mac-mini.command)
cd "$(dirname "$0")"
# If AirDropped alone, download the real script from GitHub then run it.
SCRIPT_URL="https://raw.githubusercontent.com/RosannaCostello/Houseplant-Hospital/jack/hil-82-phase-4-macos-silent-print-integration/print-bridge/scripts/setup-mac-mini.sh"
curl -fsSL "$SCRIPT_URL" -o /tmp/hh-setup-mac-mini.sh
chmod +x /tmp/hh-setup-mac-mini.sh
bash /tmp/hh-setup-mac-mini.sh
echo
read -r -p "Press Return to close…"
