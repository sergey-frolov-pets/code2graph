#!/usr/bin/env bash
# Путь к entry point API после tsc (rootDir ../packages + server/src).
set -euo pipefail

resolve_server_entry() {
  local server_dir="$1"
  if [[ -f "$server_dir/dist/server/src/index.js" ]]; then
    printf '%s' "dist/server/src/index.js"
    return 0
  fi
  if [[ -f "$server_dir/dist/index.js" ]]; then
    printf '%s' "dist/index.js"
    return 0
  fi
  return 1
}
