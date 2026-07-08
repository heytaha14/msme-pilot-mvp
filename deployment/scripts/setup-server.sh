#!/usr/bin/env bash
set -euo pipefail

# Run as a sudo user on an Ubuntu Hostinger KVM VPS.
# This prepares Nginx/static hosting only. Appwrite remains on Appwrite Cloud.

APP_NAME="msme-pilot"
DEPLOY_BASE="/var/www/${APP_NAME}"
SUDO="${SUDO:-sudo}"

echo "[setup] Updating Ubuntu packages"
${SUDO} apt update
${SUDO} apt upgrade -y

echo "[setup] Installing base packages"
${SUDO} apt install -y nginx git curl ca-certificates certbot python3-certbot-nginx

if ! command -v node >/dev/null 2>&1; then
  echo "[setup] Installing Node.js LTS from NodeSource"
  curl -fsSL https://deb.nodesource.com/setup_lts.x | ${SUDO} -E bash -
  ${SUDO} apt install -y nodejs
else
  echo "[setup] Node.js already installed: $(node --version)"
fi

echo "[setup] Creating deployment directories"
${SUDO} mkdir -p "${DEPLOY_BASE}/releases"
${SUDO} chown -R "$USER":"$USER" "${DEPLOY_BASE}"

echo "[setup] Enabling Nginx"
${SUDO} systemctl enable nginx
${SUDO} systemctl start nginx

echo "[setup] Configuring UFW rules"
${SUDO} ufw allow OpenSSH
${SUDO} ufw allow "Nginx Full"

if [ "${ENABLE_UFW:-false}" = "true" ]; then
  echo "[setup] Enabling UFW because ENABLE_UFW=true"
  ${SUDO} ufw --force enable
else
  echo "[setup] UFW rules added but firewall not enabled. Run ENABLE_UFW=true bash deployment/scripts/setup-server.sh to enable automatically, or run sudo ufw enable after confirming SSH access."
fi

echo "[setup] Server base setup complete."
echo "[setup] Next: copy deployment/nginx/msme-pilot.conf to /etc/nginx/sites-available/, replace server_name, enable the site, then deploy."
