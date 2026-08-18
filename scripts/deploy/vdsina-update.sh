#!/usr/bin/env bash
# Code2Graph — обновление сайта на VDSINA (pull + build + deploy static + restart API).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/repo-auth.sh"

INSTALL_DIR="${CODE2GRAPH_INSTALL_DIR:-/opt/code2graph}"
WEB_ROOT="${CODE2GRAPH_WEB_ROOT:-/var/www/code2graph}"
SKIP_NGINX_RELOAD=false

for arg in "$@"; do
  case "$arg" in
    --skip-nginx-reload) SKIP_NGINX_RELOAD=true ;;
  esac
done

configure_git_origin "$INSTALL_DIR"

cd "$INSTALL_DIR"

echo "==> git pull"
git fetch origin main
git checkout main
git pull origin main

echo "==> Frontend build"
npm ci
npm run build

echo "==> API build"
npm --prefix server ci
npm --prefix server run build

echo "==> Static files -> ${WEB_ROOT}"
install -d -m 0755 "$WEB_ROOT"
rsync -a --delete dist/ "$WEB_ROOT/"

echo "==> systemd restart"
systemctl daemon-reload
systemctl enable code2graph-library 2>/dev/null || true
systemctl restart code2graph-library

if [[ "$SKIP_NGINX_RELOAD" != true ]] && command -v nginx >/dev/null; then
  nginx -t && systemctl reload nginx
fi

echo "==> Обновление завершено ($(date -Is))"
