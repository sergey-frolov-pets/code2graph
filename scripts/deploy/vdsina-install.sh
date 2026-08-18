#!/usr/bin/env bash
# Code2Graph — первичная установка на голую Ubuntu 22/24 (VDSINA + reg.ru DNS).
# Работает при curl ... | bash (без BASH_SOURCE / без repo-auth.sh на диске).
set -eo pipefail

load_deploy_auth() {
  local script_path="${BASH_SOURCE[0]:-}"
  local script_dir=""

  if [[ -n "$script_path" && "$script_path" != "bash" && "$script_path" != "-" ]]; then
    script_dir="$(cd "$(dirname "$script_path")" && pwd)"
  elif [[ -n "${0:-}" && -f "${0}" && "${0}" != "-" ]]; then
    script_dir="$(cd "$(dirname "$0")" && pwd)"
  fi

  if [[ -n "$script_dir" && -f "$script_dir/repo-auth.sh" ]]; then
    # shellcheck disable=SC1091
    source "$script_dir/repo-auth.sh"
    return 0
  fi

  # curl | bash — inline (same as repo-auth.sh)
  CODE2GRAPH_DEFAULT_REPO="https://github.com/sergey-frolov-pets/code2graph.git"

  load_deploy_env() {
    if [[ -f /etc/code2graph/deploy.env ]]; then
      # shellcheck disable=SC1091
      source /etc/code2graph/deploy.env
    fi
  }

  resolve_code2graph_repo_url() {
    load_deploy_env
    local url="${CODE2GRAPH_REPO_URL:-$CODE2GRAPH_DEFAULT_REPO}"
    if [[ -n "${CODE2GRAPH_GIT_TOKEN:-}" ]] && [[ "$url" == https://github.com/* ]]; then
      url="https://x-access-token:${CODE2GRAPH_GIT_TOKEN}@${url#https://}"
    fi
    printf '%s' "$url"
  }

  configure_git_origin() {
    local dir="$1"
    local url
    url="$(resolve_code2graph_repo_url)"
    if [[ -d "$dir/.git" ]]; then
      git -C "$dir" remote set-url origin "$url"
    fi
  }

  save_deploy_env() {
    local env_file="/etc/code2graph/deploy.env"
    if [[ -n "${CODE2GRAPH_GIT_TOKEN:-}" ]]; then
      install -d -m 0700 /etc/code2graph
      cat >"$env_file" <<EOF
# Code2Graph VPS deploy — git access (code2graph repo)
CODE2GRAPH_REPO_URL=${CODE2GRAPH_REPO_URL:-$CODE2GRAPH_DEFAULT_REPO}
CODE2GRAPH_GIT_TOKEN=${CODE2GRAPH_GIT_TOKEN}
EOF
      chmod 0600 "$env_file"
    fi
  }
}

load_deploy_auth
set -u

DOMAIN="${CODE2GRAPH_DOMAIN:-www.code2graph.ru}"
INSTALL_DIR="${CODE2GRAPH_INSTALL_DIR:-/opt/code2graph}"
WEB_ROOT="${CODE2GRAPH_WEB_ROOT:-/var/www/code2graph}"
NODE_MAJOR="${CODE2GRAPH_NODE_MAJOR:-20}"
REPO_URL="$(resolve_code2graph_repo_url)"

if [[ $EUID -ne 0 ]]; then
  echo "Запустите скрипт от root: sudo bash scripts/deploy/vdsina-install.sh"
  exit 1
fi

echo "==> Пакеты системы"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq git curl nginx certbot python3-certbot-nginx ufw

if ! command -v node >/dev/null 2>&1 || [[ "$(node -p process.versions.node.split('.')[0])" -lt "$NODE_MAJOR" ]]; then
  echo "==> Node.js ${NODE_MAJOR}"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi

echo "==> Репозиторий ($REPO_URL)"
mkdir -p "$(dirname "$INSTALL_DIR")"
if [[ ! -d "$INSTALL_DIR/.git" ]]; then
  git clone "$REPO_URL" "$INSTALL_DIR"
else
  configure_git_origin "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"
git fetch origin main
git checkout main
git pull origin main

save_deploy_env

echo "==> Сборка"
npm ci
npm run build
npm --prefix server ci
npm --prefix server run build

mkdir -p "$INSTALL_DIR/data"
if [[ ! -f "$INSTALL_DIR/server/.env" ]]; then
  cp deploy/server.env.example "$INSTALL_DIR/server/.env"
  echo "Создан server/.env — задайте AUTH_TOKEN_SECRET и LLM ключи."
fi

chown -R www-data:www-data "$INSTALL_DIR/data"

install -m 0644 deploy/systemd/code2graph-library.service /etc/systemd/system/code2graph-library.service
systemctl daemon-reload
systemctl enable --now code2graph-library

install -d -m 0755 "$WEB_ROOT"
rsync -a --delete dist/ "$WEB_ROOT/"

echo "==> Nginx + TLS для ${DOMAIN}"
NGINX_SITE="/etc/nginx/sites-available/code2graph"
cat >"$NGINX_SITE" <<EOF
server {
    listen 80;
    server_name ${DOMAIN} code2graph.ru;

    root ${WEB_ROOT};
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 4m;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/code2graph
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

certbot --nginx -d "$DOMAIN" -d code2graph.ru \
  --non-interactive --agree-tos \
  -m "${CODE2GRAPH_ADMIN_EMAIL:-admin@code2graph.ru}" 2>/dev/null || \
  echo "Certbot: настройте TLS вручную после DNS A-записи на VPS"

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "==> Готово: https://${DOMAIN}"
echo "    Обновления: sudo bash $INSTALL_DIR/scripts/deploy/vdsina-update.sh"
