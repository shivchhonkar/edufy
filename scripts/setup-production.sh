#!/usr/bin/env bash
# First-time production setup wrapper (Linux / macOS)
# Usage: ./scripts/setup-production.sh [-- verify | full options passed to setup-production.js]

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Shribi Edufy production setup"
echo "    Root: $ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is required (>= 18). Install Node and retry."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required."
  exit 1
fi

# Install root dependencies if node_modules missing
if [ ! -d "$ROOT/node_modules" ]; then
  echo "==> Installing npm dependencies..."
  npm install
fi

# Ensure dotenv is available for setup script
if [ ! -d "$ROOT/node_modules/dotenv" ]; then
  npm install dotenv --no-save
fi

echo "==> Running database & filesystem setup..."
node "$ROOT/scripts/setup-production.js" "$@"

echo ""
echo "==> Optional: build all apps"
echo "    npm run build"
echo ""
echo "Done."
