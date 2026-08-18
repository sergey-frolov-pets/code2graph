#!/usr/bin/env bash
# Code2Graph — обновление сайта на VDSINA.
# Источник кода: ТОЛЬКО origin/main (никаких feature/cursor-веток).
set -eo pipefail

INSTALL_DIR="${CODE2GRAPH_INSTALL_DIR:-/opt/code2graph}"
WEB_ROOT="${CODE2GRAPH_WEB_ROOT:-/var/www/code2graph}"
SKIP_NGINX_RELOAD=false

for arg in "$@"; do
  case "$arg" in
    --skip-nginx-reload) SKIP_NGINX_RELOAD=true ;;
    *)
      echo "Неизвестный аргумент: $arg"
      echo "Деплой возможен только из origin/main. Использование: $0 [--skip-nginx-reload]"
      exit 1
      ;;
  esac
done

read_app_version() {
  node -p "require('./package.json').version"
}

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

# shellcheck disable=SC1091
source "$INSTALL_DIR/scripts/deploy/sync-origin-main.sh"

cd "$INSTALL_DIR"

# shellcheck disable=SC1091
source "$INSTALL_DIR/scripts/deploy/build-memory.sh"
ensure_swap_for_build
export_node_build_memory

BEFORE_COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo none)"
BEFORE_VERSION="$(read_app_version 2>/dev/null || echo unknown)"
echo "    было: commit ${BEFORE_COMMIT}, v${BEFORE_VERSION}"

sync_origin_main "$INSTALL_DIR"

AFTER_COMMIT="$(git rev-parse --short HEAD)"
AFTER_VERSION="$(read_app_version)"
echo "    стало: commit ${AFTER_COMMIT}, v${AFTER_VERSION}"

if [[ "$BEFORE_COMMIT" == "$AFTER_COMMIT" ]]; then
  echo "    ⚠ origin/main не изменился — если на сайте старая версия, проверьте кэш или nginx"
fi

echo "==> Frontend build"
npm ci
npm run build
unset NODE_OPTIONS

echo "==> API build"
npm --prefix server ci
npm --prefix server run build

echo "==> Static files -> ${WEB_ROOT}"
printf '%s\n' "$AFTER_VERSION" > dist/version.txt
install -d -m 0755 "$WEB_ROOT"
rsync -a --delete dist/ "$WEB_ROOT/"

DEPLOYED_VERSION="$(cat "$WEB_ROOT/version.txt" 2>/dev/null || echo missing)"
if [[ "$DEPLOYED_VERSION" != "$AFTER_VERSION" ]]; then
  echo "ОШИБКА: в ${WEB_ROOT}/version.txt версия '${DEPLOYED_VERSION}', ожидалась v${AFTER_VERSION}"
  exit 1
fi

echo "==> systemd restart"
systemctl daemon-reload
systemctl enable code2graph-library 2>/dev/null || true
systemctl restart code2graph-library

if [[ "$SKIP_NGINX_RELOAD" != true ]] && command -v nginx >/dev/null; then
  nginx -t && systemctl reload nginx
fi

echo "==> Обновление завершено ($(date -Is))"
echo "    Задеплоено с origin/main: v${AFTER_VERSION} (commit ${AFTER_COMMIT})"
echo "    Проверка: curl -fsS https://www.code2graph.ru/version.txt"
