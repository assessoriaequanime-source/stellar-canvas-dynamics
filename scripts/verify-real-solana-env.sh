#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/stellar-backend"

missing=0

check_env() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "$value" ]]; then
    echo "[ERROR] Missing env: $name"
    missing=1
  else
    echo "[OK] $name is configured"
  fi
}

check_env "SOLANA_RPC_URL"
check_env "SGL_MINT_ADDRESS"
check_env "SGL_DEPLOYER_KEYPAIR_PATH"

if [[ -n "${SGL_DEPLOYER_KEYPAIR_PATH:-}" ]]; then
  if [[ -f "$SGL_DEPLOYER_KEYPAIR_PATH" ]]; then
    echo "[OK] Deployer keypair file exists"
  else
    echo "[ERROR] Keypair file not found at SGL_DEPLOYER_KEYPAIR_PATH"
    missing=1
  fi
fi

if node -e "require('@solana/web3.js');" >/dev/null 2>&1; then
  echo "[OK] @solana/web3.js import available"
else
  echo "[ERROR] Unable to import @solana/web3.js"
  missing=1
fi

if [[ "$missing" -ne 0 ]]; then
  echo "Solana real layer env check failed"
  exit 1
fi

echo "Solana real layer env check passed"
