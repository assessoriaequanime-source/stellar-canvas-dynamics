#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://127.0.0.1:9200/api/v1}"

if [[ -z "${SGL_MINT_ADDRESS:-}" ]]; then
  echo "[ERROR] SGL_MINT_ADDRESS is empty"
  exit 1
fi

if [[ -z "${TEST_SOLANA_WALLET_ADDRESS:-}" ]]; then
  echo "[ERROR] TEST_SOLANA_WALLET_ADDRESS is required"
  exit 1
fi

provision_resp=$(curl -sS -X POST "$API_BASE/wallets/provision" \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\":\"$TEST_SOLANA_WALLET_ADDRESS\"}")

echo "$provision_resp" | grep -q '"walletAddress"' || {
  echo "[ERROR] Provision response missing walletAddress"
  exit 1
}

balance_resp=$(curl -sS "$API_BASE/sgl/balance?walletAddress=$TEST_SOLANA_WALLET_ADDRESS")
echo "$balance_resp" | grep -q '"sglBalance"' || {
  echo "[ERROR] Balance response missing sglBalance"
  exit 1
}

payload_hash="smoke-$(date +%s)"
proof_resp=$(curl -sS -X POST "$API_BASE/audit/proof" \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\":\"$TEST_SOLANA_WALLET_ADDRESS\",\"avatarId\":\"smoke-avatar\",\"eventType\":\"smoke_test\",\"payloadHash\":\"$payload_hash\"}")

echo "$proof_resp" | grep -q 'explorer.solana.com/tx/' || {
  echo "[ERROR] explorerUrl is invalid"
  exit 1
}

proof_sig=$(echo "$proof_resp" | sed -n 's/.*"txSignature":"\([^"]*\)".*/\1/p')
if [[ -z "$proof_sig" || "$proof_sig" == MOCK* ]]; then
  echo "[ERROR] txSignature is invalid or mock"
  exit 1
fi

echo "[OK] Smoke test passed"
