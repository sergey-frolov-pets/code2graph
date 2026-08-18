#!/usr/bin/env bash
# Code2Graph — обновление сайта на VDSINA (pull + build + deploy static + restart API).
set -eo pipefail

INSTALL_DIR="${CODE2GRAPH_INSTALL_DIR:-/opt/code2graph}"
WEB_ROOT="${CODE2GRAPH_WEB_ROOT:-/var/www/code2graph}"
SKIP_NGINX_RELOAD=false

for arg in "$@"; do
  case "$arg" in
    --skip-nginx-reload) SKIP_NGINX_RELOAD=true ;;
  esac
done

AUTH_SCRIPT="$INSTALL_DIR/scripts/deploy/repo-auth.sh"
if [[ -f "$AUTH_SCRIPT" ]]; then
  # shellcheck disable=SC1091
  source "$AUTH_SCRIPT"
else
  script_path="${BASH_SOURCE[0]:-}"
  if [[ -n "$script_path" && "$script_path" != "bash" && "$script_path" != "-" ]]; then
    script_dir="$(cd "$(dirname "$script_path")" && pwd)"
    if [[ -f "$script_dir/repo-auth.sh" ]]; then
      # shellcheck disable=SC1091
      source "$script_dir/repo-auth.sh"
    fi
  fi
fi

if ! declare -F resolve_code2graph_repo_url >/dev/null 2>&1; then
  echo "Не найден repo-auth.sh в $INSTALL_DIR/scripts/deploy/"
  exit 1
fi

set -u

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
