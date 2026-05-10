#!/usr/bin/env bash
# Run on the Vultr VM as root (e.g. after ssh root@YOUR_IP).
#
# Prereqs:
#   - DNS A record for DOMAIN → this server's public IPv4 (before TLS step).
#   - Repo reachable from the VM (public git URL), or sync files to APP_DIR first.
#
# Example:
#   export GIT_REPO='https://github.com/you/HackDavis.git'
#   export DOMAIN='sms.example.com'
#   export CERTBOT_EMAIL='you@example.com'
#   export INCLUDE_WWW='0'          # set to 1 only if www.${DOMAIN} exists in DNS
#   bash scripts/vultr-bootstrap.sh
#
# If the repo is private: omit GIT_REPO, mkdir -p /opt/hackdavis and rsync/scp from your laptop.

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/hackdavis}"
APP_PORT="${APP_PORT:-3000}"
DOMAIN="${DOMAIN:-}"
GIT_REPO="${GIT_REPO:-}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
INCLUDE_WWW="${INCLUDE_WWW:-0}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

echo "==> cloud-init (wait up to 180s, non-fatal if absent)"
cloud-init status --wait 2>/dev/null || true

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx git curl ca-certificates gnupg

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "node $(node -v) | npm $(npm -v)"

mkdir -p "$(dirname "$APP_DIR")"

if [[ -n "$GIT_REPO" ]]; then
  if [[ ! -f "$APP_DIR/package.json" ]]; then
    if [[ -d "$APP_DIR" ]] && [[ -n "$(ls -A "$APP_DIR" 2>/dev/null || true)" ]]; then
      echo "$APP_DIR must be empty to clone (move files aside), or omit GIT_REPO and rsync the repo here."
      exit 1
    fi
    git clone "$GIT_REPO" "$APP_DIR"
  else
    echo "==> $APP_DIR already has package.json — skipping clone (git pull manually if needed)"
  fi
fi

if [[ ! -f "$APP_DIR/package.json" ]]; then
  echo "No app in $APP_DIR. Clone or rsync the HackDavis repo here, then re-run."
  exit 1
fi

if [[ ! -f "$APP_DIR/.env" ]]; then
  echo "Missing $APP_DIR/.env — copy from your laptop (see .env.example). Then re-run this script."
  exit 1
fi

if grep -qE '^PORT=' "$APP_DIR/.env"; then
  APP_PORT="$(grep -E '^PORT=' "$APP_DIR/.env" | tail -1 | cut -d= -f2- | tr -d ' \r"')"
fi

# Ensure PORT in .env matches nginx upstream (default 3000).
if ! grep -qE '^PORT=' "$APP_DIR/.env"; then
  echo "PORT=$APP_PORT" >>"$APP_DIR/.env"
  echo "==> Appended PORT=$APP_PORT to .env"
fi

grep -q '^WEBHOOK_PUBLIC_URL=https://' "$APP_DIR/.env" || {
  echo "WARN: set WEBHOOK_PUBLIC_URL=https://${DOMAIN}/webhook/sms (and PUBLIC_APP_URL) in .env when DOMAIN is ready."
}

chown -R www-data:www-data "$APP_DIR"

echo "==> npm ci"
sudo -u www-data bash -c "cd '$APP_DIR' && npm ci"

cat >/etc/systemd/system/hackdavis.service <<EOF
[Unit]
Description=HackDavis SMS webhook
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable hackdavis
systemctl restart hackdavis
systemctl --no-pager status hackdavis || true

if [[ -z "$DOMAIN" ]]; then
  echo ""
  echo "systemd is up. Set DOMAIN + CERTBOT_EMAIL and re-run this script for Nginx + TLS,"
  echo "or configure /etc/nginx/sites-available/ yourself."
  exit 0
fi

if [[ -z "$CERTBOT_EMAIL" ]]; then
  echo "Set CERTBOT_EMAIL for Let's Encrypt, then re-run."
  exit 1
fi

SERVER_NAMES="$DOMAIN"
CERTBOT_FLAGS=(--nginx -d "$DOMAIN")
if [[ "$INCLUDE_WWW" == "1" ]]; then
  SERVER_NAMES="$DOMAIN www.$DOMAIN"
  CERTBOT_FLAGS+=( -d "www.$DOMAIN" )
fi

cat >/etc/nginx/sites-available/hackdavis <<NGX
server {
    listen 80;
    server_name $SERVER_NAMES;
    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGX

ln -sf /etc/nginx/sites-available/hackdavis /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

certbot "${CERTBOT_FLAGS[@]}" --non-interactive --agree-tos --email "$CERTBOT_EMAIL" --redirect

systemctl restart hackdavis

echo ""
echo "==> Smoke test (HTTP expects JSON ok):"
curl -fsS "https://${DOMAIN}/health" && echo ""

echo ""
echo "On your laptop (with .env loaded): npm run register-webhook"
