#!/usr/bin/env bash
# Статическая сборка фронтенда. Сервер подключается файлом deployment.json,
# а не отдельной пересборкой. Явный VITE_API_BASE_URL в окружении всё ещё
# вшивается в бандл — это запасной путь для старых деплоев.
# Файл подключается через source, поэтому режим оболочки здесь не меняется.

DEPLOYMENT_API_SAME_ORIGIN="same-origin"

read_env_assignment() {
  local file="$1"
  local key="$2"
  local line=""

  if [[ ! -f "$file" ]]; then
    return 1
  fi

  line="$(grep -E "^[[:space:]]*(export[[:space:]]+)?${key}=" "$file" | tail -n 1 || true)"
  if [[ -z "$line" ]]; then
    return 1
  fi

  line="${line#*=}"
  line="${line#"${line%%[![:space:]]*}"}"
  line="${line%"${line##*[![:space:]]}"}"
  line="${line%\"}"
  line="${line#\"}"
  line="${line%\'}"
  line="${line#\'}"
  printf '%s' "$line"
  return 0
}

export_frontend_api_env() {
  local install_dir="$1"

  if [[ -n "${VITE_API_BASE_URL+x}" ]]; then
    echo "==> Frontend API bake: VITE_API_BASE_URL=${VITE_API_BASE_URL:-<static>}"
    return 0
  fi

  export VITE_API_BASE_URL=""
  echo "==> Frontend API bake: static (server via deployment.json)"
  # install_dir is unused for the bake; deployment.json is written after rsync.
  : "$install_dir"
}

write_deployment_json() {
  local install_dir="$1"
  local web_root="$2"
  local api_base="${DEPLOYMENT_API_BASE_URL:-}"
  local public_origin="${PUBLIC_ORIGIN:-}"
  local value=""

  if [[ -z "$api_base" ]]; then
    if value="$(read_env_assignment "$install_dir/server/.env" "DEPLOYMENT_API_BASE_URL")"; then
      api_base="$value"
    else
      api_base="/api"
    fi
  fi

  if [[ -z "$public_origin" ]]; then
    if value="$(read_env_assignment "$install_dir/server/.env" "PUBLIC_ORIGIN")"; then
      public_origin="$value"
    fi
  fi

  mkdir -p "$web_root"
  cat >"$web_root/deployment.json" <<EOF
{
  "apiBaseUrl": "${api_base}",
  "publicOrigin": "${public_origin}"
}
EOF
  echo "==> deployment.json -> ${web_root}/deployment.json (apiBaseUrl=${api_base})"
}

export_frontend_library_slug() {
  local install_dir="$1"
  local value=""

  if [[ -n "${VITE_LIBRARY_PUBLIC_SLUG+x}" ]]; then
    echo "==> Library slug: VITE_LIBRARY_PUBLIC_SLUG=${VITE_LIBRARY_PUBLIC_SLUG:-<none>}"
    return 0
  fi

  if value="$(read_env_assignment "$install_dir/server/.env" "LIBRARY_PUBLIC_SLUG")"; then
    export VITE_LIBRARY_PUBLIC_SLUG="$value"
  elif value="$(read_env_assignment "$install_dir/.env" "LIBRARY_PUBLIC_SLUG")"; then
    export VITE_LIBRARY_PUBLIC_SLUG="$value"
  else
    export VITE_LIBRARY_PUBLIC_SLUG=""
  fi

  echo "==> Library slug: VITE_LIBRARY_PUBLIC_SLUG=${VITE_LIBRARY_PUBLIC_SLUG:-<none>}"
}
