#!/usr/bin/env bash
# Подставляет VITE_API_BASE_URL перед сборкой фронтенда на VPS.
# Уже заданная переменная окружения не перезаписывается.
# Иначе берётся значение из server/.env или .env.
# Если ключа нет — same-origin (nginx проксирует /api). Явный пустой ключ оставляет статику.
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
  local value=""

  if [[ -n "${VITE_API_BASE_URL+x}" ]]; then
    echo "==> Frontend API: VITE_API_BASE_URL=${VITE_API_BASE_URL:-<static>}"
    return 0
  fi

  if value="$(read_env_assignment "$install_dir/server/.env" "VITE_API_BASE_URL")"; then
    export VITE_API_BASE_URL="$value"
  elif value="$(read_env_assignment "$install_dir/.env" "VITE_API_BASE_URL")"; then
    export VITE_API_BASE_URL="$value"
  else
    export VITE_API_BASE_URL="$DEPLOYMENT_API_SAME_ORIGIN"
  fi

  echo "==> Frontend API: VITE_API_BASE_URL=${VITE_API_BASE_URL:-<static>}"
}
