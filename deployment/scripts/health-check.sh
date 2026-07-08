#!/usr/bin/env bash
set -euo pipefail

URL="${1:-}"

if [ -z "${URL}" ]; then
  echo "Usage: bash deployment/scripts/health-check.sh https://your-domain.com"
  exit 1
fi

TMP_FILE="$(mktemp)"
STATUS="$(curl -L -sS -o "${TMP_FILE}" -w "%{http_code}" "${URL}")"

if [ "${STATUS}" != "200" ]; then
  echo "[health] Failed: ${URL} returned HTTP ${STATUS}"
  rm -f "${TMP_FILE}"
  exit 1
fi

if ! grep -qi "MSME Pilot" "${TMP_FILE}"; then
  echo "[health] Failed: page did not contain expected MSME Pilot marker."
  rm -f "${TMP_FILE}"
  exit 1
fi

rm -f "${TMP_FILE}"
echo "[health] OK: ${URL} returned HTTP 200 and MSME Pilot marker."
