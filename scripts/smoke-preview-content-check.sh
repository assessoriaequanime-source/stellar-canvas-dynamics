#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:4174}"
TMP_DIR="$(mktemp -d)"

for path in demo dashboard vault audit; do
  curl -s -H 'Accept-Encoding: identity' "$BASE_URL/$path" > "$TMP_DIR/$path.html"
done

for asset in $(grep -aoE '/assets/[^"[:space:]]+\.js' "$TMP_DIR/dashboard.html" | sort -u); do
  curl -s -H 'Accept-Encoding: identity' "$BASE_URL$asset" > "$TMP_DIR/$(basename "$asset")"
done

if grep -aRni "Entrar via singulai.site\|https://singulai.site\|Autenticacao oficial obrigatoria\|Autenticação oficial obrigatória\|undefined\|NaN\|TypeError\|Cannot read" "$TMP_DIR"/*.html; then
  echo "Smoke content check failed"
  exit 1
fi

if ! grep -aEq "INPI 942284933" "$TMP_DIR/dashboard.html" "$TMP_DIR"/*.js 2>/dev/null; then
  echo "Smoke content check failed: missing INPI footer marker"
  exit 1
fi

if ! grep -aEiq "Absorption|Safe Quantum|AvatarPro" "$TMP_DIR/dashboard.html" "$TMP_DIR"/*.js 2>/dev/null; then
  echo "Smoke content check failed: missing dashboard capability markers"
  exit 1
fi

if ! grep -aEiq "Wallet|Profile|AvatarPro" "$TMP_DIR/dashboard.html" "$TMP_DIR"/*.js 2>/dev/null; then
  echo "Smoke content check failed: missing wallet/profile markers"
  exit 1
fi

echo "Smoke content check passed"
