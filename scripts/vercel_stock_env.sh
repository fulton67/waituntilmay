#!/usr/bin/env bash
# Give the sie-assets Vercel project what /api/stock needs to ask the Shopify
# admin how many CDs are left. Values are read from .env and handed to the
# Vercel CLI on stdin: nothing is echoed, logged or written anywhere else.
# The two secret ones are stored as Sensitive (write-only in Vercel).
#
#   bash scripts/vercel_stock_env.sh        # then deploy vercel-assets
set -euo pipefail
cd "$(dirname "$0")/.."

get() {  # value of KEY in .env, without quotes or a trailing comment
  sed -n "s/^$1=//p" .env | head -1 | sed -e 's/[[:space:]]*#.*$//' -e "s/^['\"]//" -e "s/['\"]$//"
}

for k in SHOPIFY_STORE_DOMAIN SHOPIFY_CLIENT_ID SHOPIFY_CLIENT_SECRET SHOPIFY_VARIANT_GID SHOPIFY_API_VERSION; do
  v="$(get "$k")"
  if [ -z "$v" ]; then echo "  $k: missing from .env, skipped"; continue; fi
  case "$k" in
    SHOPIFY_CLIENT_ID|SHOPIFY_CLIENT_SECRET) kind=--sensitive ;;
    *) kind=--no-sensitive ;;
  esac
  printf '%s' "$v" | npx vercel env add "$k" production --force "$kind" --cwd vercel-assets >/dev/null 2>&1 \
    && echo "  $k: set" || echo "  $k: FAILED"
done
