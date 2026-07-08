#!/usr/bin/env bash
set -euo pipefail

APP_NAME="msme-pilot"
DEPLOY_BASE="/var/www/${APP_NAME}"
RELEASES_DIR="${DEPLOY_BASE}/releases"
CURRENT_LINK="${DEPLOY_BASE}/current"
BUILD_DIR="dist"
SUDO="${SUDO:-sudo}"

if [ ! -d "${BUILD_DIR}" ]; then
  echo "[deploy] ${BUILD_DIR}/ not found. Run npm run build before deploying."
  exit 1
fi

if [ ! -f "${BUILD_DIR}/index.html" ]; then
  echo "[deploy] ${BUILD_DIR}/index.html not found. Build output is incomplete."
  exit 1
fi

TIMESTAMP="$(date +%Y%m%d%H%M%S)"
RELEASE_DIR="${RELEASES_DIR}/${TIMESTAMP}"

echo "[deploy] Creating release ${RELEASE_DIR}"
${SUDO} mkdir -p "${RELEASE_DIR}"
${SUDO} cp -a "${BUILD_DIR}/." "${RELEASE_DIR}/"

echo "[deploy] Updating current symlink"
${SUDO} ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"

echo "[deploy] Testing Nginx config"
${SUDO} nginx -t

echo "[deploy] Reloading Nginx"
${SUDO} systemctl reload nginx

echo "[deploy] Keeping last 5 releases"
mapfile -t OLD_RELEASES < <(ls -dt "${RELEASES_DIR}"/* 2>/dev/null | tail -n +6 || true)
if [ "${#OLD_RELEASES[@]}" -gt 0 ]; then
  ${SUDO} rm -rf "${OLD_RELEASES[@]}"
fi

echo "[deploy] ${APP_NAME} deployed: ${RELEASE_DIR}"
