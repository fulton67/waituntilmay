#!/usr/bin/env bash
# Watch .env for the values the connect pass is blocked on.
# Exits 0 when a coherent group lands, 2 on timeout. Prints names, never values.
ENV_FILE="${1:-.env}"; MAX="${2:-90}"; SLEEP="${3:-30}"
val() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/#.*//' | tr -d '"' | xargs; }
for i in $(seq 1 "$MAX"); do
  CID=$(val SHOPIFY_CLIENT_ID); CSEC=$(val SHOPIFY_CLIENT_SECRET); SDOM=$(val SHOPIFY_STORE_DOMAIN)
  SFT=$(val SHOPIFY_STOREFRONT_TOKEN); WFS=$(val WEBFLOW_NEW_SITE_ID)
  A1=$(val WEBFLOW_A_1); CN=$(val WEBFLOW_WWW_CNAME)
  PRICE=$(val PRODUCT_PRICE); STOCK=$(val PRODUCT_STOCK)
  READY=""
  [ -n "$CID" ] && [ -n "$CSEC" ] && [ -n "$SDOM" ] && READY="$READY shopify-app"
  [ -n "$SFT" ]  && READY="$READY storefront-token"
  [ -n "$WFS" ]  && READY="$READY webflow-site"
  [ -n "$A1" ] && [ -n "$CN" ] && READY="$READY webflow-dns-records"
  [ -n "$PRICE" ] && [ -n "$STOCK" ] && READY="$READY price+stock"
  if [ -n "$READY" ]; then
    echo "READY after $((i*SLEEP))s:$READY"
    [ -n "$SDOM" ]  && echo "  SHOPIFY_STORE_DOMAIN     $SDOM"
    [ -n "$CID" ]   && echo "  SHOPIFY_CLIENT_ID        set (${#CID} chars)"
    [ -n "$CSEC" ]  && echo "  SHOPIFY_CLIENT_SECRET    set (${#CSEC} chars)"
    [ -n "$SFT" ]   && echo "  SHOPIFY_STOREFRONT_TOKEN set (${#SFT} chars)"
    [ -n "$WFS" ]   && echo "  WEBFLOW_NEW_SITE_ID      $WFS"
    [ -n "$A1" ]    && echo "  WEBFLOW_A_1              $A1 / $(val WEBFLOW_A_2)"
    [ -n "$CN" ]    && echo "  WEBFLOW_WWW_CNAME        $CN"
    [ -n "$PRICE" ] && echo "  PRODUCT_PRICE            $PRICE"
    [ -n "$STOCK" ] && echo "  PRODUCT_STOCK            $STOCK"
    exit 0
  fi
  sleep "$SLEEP"
done
echo "TIMEOUT after $((MAX*SLEEP))s — nothing appeared in $ENV_FILE"; exit 2
