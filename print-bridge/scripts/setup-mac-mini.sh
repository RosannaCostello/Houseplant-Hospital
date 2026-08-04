#!/usr/bin/env bash
# Houseplant Hospital — Mac Mini print-bridge setup (HIL-82)
# Run ON the shop Mac Mini (fresh macOS is fine).
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/RosannaCostello/Houseplant-Hospital.git}"
BRANCH="${BRANCH:-jack/hil-82-phase-4-macos-silent-print-integration}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/Hilda/Houseplant-Hospital}"
PRINTER_NAME="${PRINTER_NAME:-HH_Airprint}"
LP_OPTIONS="${LP_OPTIONS:-media=Custom.60x86mm}"

echo "==> Houseplant Hospital print-bridge setup"
echo "    Install dir: $INSTALL_DIR"
echo "    Branch:      $BRANCH"
echo "    Printer:     $PRINTER_NAME"
echo

# --- Homebrew ---
if ! command -v brew >/dev/null 2>&1; then
  echo "==> Installing Homebrew (may ask for your Mac password)…"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Apple Silicon default path
  if [[ -x /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
    if ! grep -q 'brew shellenv' "$HOME/.zprofile" 2>/dev/null; then
      echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$HOME/.zprofile"
    fi
  fi
else
  echo "==> Homebrew already installed"
  if [[ -x /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi
fi

# --- Node + Git ---
echo "==> Ensuring git + node…"
brew install git node

# --- Chrome check ---
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [[ ! -x "$CHROME" ]]; then
  echo
  echo "!! Google Chrome is not installed."
  echo "   Open https://www.google.com/chrome/ and install it, then re-run this script."
  echo "   (Chrome is required for silent HTML→PDF before printing.)"
  open "https://www.google.com/chrome/" || true
  exit 1
fi
echo "==> Chrome found"

# --- Clone / update repo ---
mkdir -p "$(dirname "$INSTALL_DIR")"
if [[ -d "$INSTALL_DIR/.git" ]]; then
  echo "==> Repo exists — fetching $BRANCH…"
  git -C "$INSTALL_DIR" fetch origin
  git -C "$INSTALL_DIR" checkout "$BRANCH"
  git -C "$INSTALL_DIR" pull --ff-only origin "$BRANCH" || true
else
  echo "==> Cloning repo…"
  git clone --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR/print-bridge"

# --- .env ---
if [[ ! -f .env ]]; then
  cp .env.example .env
  # Generate a secret if still placeholder
  SECRET="$(openssl rand -hex 24)"
  # macOS sed
  sed -i '' "s|^PRINT_BRIDGE_SECRET=.*|PRINT_BRIDGE_SECRET=$SECRET|" .env
  sed -i '' "s|^PRINTER_NAME=.*|PRINTER_NAME=$PRINTER_NAME|" .env
  sed -i '' "s|^LP_OPTIONS=.*|LP_OPTIONS=$LP_OPTIONS|" .env
  sed -i '' "s|^PRINT_MODE=.*|PRINT_MODE=dry-run|" .env
  echo "==> Created .env (PRINT_MODE=dry-run, PRINTER_NAME=$PRINTER_NAME)"
  echo "    Secret generated automatically."
else
  echo "==> .env already exists — leaving it alone"
fi

echo "==> npm install…"
npm install

echo
echo "==> Printer queues on this Mac:"
lpstat -p -d || true
echo
echo "Done."
echo
echo "Next:"
echo "  1. cd $INSTALL_DIR/print-bridge"
echo "  2. npm run start"
echo "  3. In another Terminal tab, run the health + print curls from print-bridge/README.md"
echo "  4. When dry-run HTML looks good: set PRINT_MODE=print in .env, restart, curl again"
echo
echo "Secret is in: $INSTALL_DIR/print-bridge/.env  (PRINT_BRIDGE_SECRET=...)"
