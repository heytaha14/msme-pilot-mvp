#!/usr/bin/env bash
set -euo pipefail

APP_NAME="msme-pilot"
DEPLOY_BASE="/var/www/${APP_NAME}"
RELEASES_DIR="${DEPLOY_BASE}/releases"
CURRENT_LINK="${DEPLOY_BASE}/current"
SUDO="${SUDO:-sudo}"
TARGET_RELEASE="${1:-}"

if [ ! -d "${RELEASES_DIR}" ]; then
  echo "[rollback] No releases directory found at ${RELEASES_DIR}."
  exit 1
fi

mapfile -t RELEASES < <(ls -dt "${RELEASES_DIR}"/* 2>/dev/null || true)

if [ "${#RELEASES[@]}" -lt 1 ]; then
  echo "[rollback] No releases available."
  exit 1
fi

if [ -z "${TARGET_RELEASE}" ]; then
  CURRENT_TARGET="$(readlink -f "${CURRENT_LINK}" 2>/dev/null || true)"
  TARGET_RELEASE=""
  for release in "${RELEASES[@]}"; do
    RESOLVED="$(readlink -f "${release}")"
    if [ "${RESOLVED}" != "${CURRENT_TARGET}" ]; then
      TARGET_RELEASE="${release}"
      break
    fi
  done
fi

if [ -z "${TARGET_RELEASE}" ] || [ ! -d "${TARGET_RELEASE}" ]; then
  echo "[rollback] No previous release found. Available releases:"
  printf '  %s\n' "${RELEASES[@]}"
  exit 1
fi

echo "[rollback] Rolling back to ${TARGET_RELEASE}"
${SUDO} ln -sfn "${TARGET_RELEASE}" "${CURRENT_LINK}"

echo "[rollback] Testing Nginx config"
${SUDO} nginx -t

echo "[rollback] Reloading Nginx"
${SUDO} systemctl reload nginx

echo "[rollback] Rollback complete: ${TARGET_RELEASE}"
