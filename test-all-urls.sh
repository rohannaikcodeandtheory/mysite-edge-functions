#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:7676}"
BRAND_CODES="${BRAND_CODES:-}"
COMMON="brand=corporate&country_code=US&locale=en_US&vehicle_group_ids=2%2C8"
if [[ -n "$BRAND_CODES" ]]; then COMMON="$COMMON&brand_codes=$BRAND_CODES"; fi
YEAR_ID="${YEAR_ID:-2027}"; MAKE_ID="${MAKE_ID:-69}"; MODEL_ID="${MODEL_ID:-}"
ENGINE_MFR_ID="${ENGINE_MFR_ID:-}"; ENGINE_BASE_ID="${ENGINE_BASE_ID:-}"; ENGINE_USAGE_IDS="${ENGINE_USAGE_IDS:-}"
PART_NUMBER="${PART_NUMBER:-}"
run() { local route="$1"; local qs="$2"; echo "=== $route ==="; curl --connect-timeout 5 --max-time 30 -sS -o /tmp/driv-pdm-response.json -w 'HTTP %{http_code} | total %{time_total}s\n' "$BASE/api/catalog/$route${qs:+?$qs}" || true; head -c 800 /tmp/driv-pdm-response.json; echo; echo; }
run health ''
run years "$COMMON"
run makes "$COMMON&year_id=$YEAR_ID"
run models "$COMMON&year_id=$YEAR_ID&make_id=$MAKE_ID"
if [[ -n "$MODEL_ID" ]]; then
 run parts "$COMMON&year_id=$YEAR_ID&make_id=$MAKE_ID&model_id=$MODEL_ID&page=1&limit=20"
 run parts-light "$COMMON&year_id=$YEAR_ID&make_id=$MAKE_ID&model_id=$MODEL_ID&digital_assets=1"
else echo 'SKIP parts and parts-light: set MODEL_ID from models response'; fi
if [[ -n "$PART_NUMBER" ]]; then run search "$COMMON&part_number=$PART_NUMBER"; else echo 'SKIP search: set PART_NUMBER'; fi
run engine-mfrs "$COMMON"
if [[ -n "$ENGINE_MFR_ID" ]]; then
 run engine-bases "$COMMON&engine_mfr_id=$ENGINE_MFR_ID"
 if [[ -n "$ENGINE_BASE_ID" ]]; then
  encoded_base="$(node -p 'encodeURIComponent(process.argv[1])' "$ENGINE_BASE_ID")"
  run engine-usages "$COMMON&engine_mfr_id=$ENGINE_MFR_ID&engine_base_id=$encoded_base"
  if [[ -n "$ENGINE_USAGE_IDS" ]]; then
   run engine-versions-ld "$COMMON&engine_mfr_id=$ENGINE_MFR_ID&engine_base_id=$encoded_base&engine_usage_ids=$ENGINE_USAGE_IDS"
   if [[ -n "${ENGINE_VERSION_ID:-}" ]]; then
    encoded_version="$(node -p 'encodeURIComponent(process.argv[1])' "$ENGINE_VERSION_ID")"
    run engine-parts-ld "$COMMON&engine_mfr_id=$ENGINE_MFR_ID&engine_base_id=$encoded_base&engine_usage_ids=$ENGINE_USAGE_IDS&engine_version_id=$encoded_version&page=1&limit=20"
   else echo 'SKIP engine-parts-ld: set ENGINE_VERSION_ID'; fi
  else echo 'SKIP engine-versions-ld and engine-parts-ld: set ENGINE_USAGE_IDS'; fi
 else echo 'SKIP engine usages/versions/parts: set ENGINE_BASE_ID'; fi
else echo 'SKIP engine bases/usages/versions/parts: set ENGINE_MFR_ID'; fi
