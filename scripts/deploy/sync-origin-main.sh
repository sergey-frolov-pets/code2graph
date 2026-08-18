#!/usr/bin/env bash
# Строгая синхронизация с origin/main — единственный допустимый источник деплоя на VDS.
# Подключается из deploy-скриптов (без set -euo — вызывающий скрипт управляет strict mode).

CODE2GRAPH_DEPLOY_BRANCH="main"

sync_origin_main() {
  local dir="$1"
  local branch="${CODE2GRAPH_DEPLOY_BRANCH}"

  if [[ ! -d "$dir/.git" ]]; then
    echo "ОШИБКА: ${dir} не является git-репозиторием"
    return 1
  fi

  pushd "$dir" >/dev/null

  echo "==> git sync (только origin/${branch}, без feature-веток)"
  git fetch origin "$branch"

  if ! git rev-parse --verify "origin/${branch}" >/dev/null 2>&1; then
    echo "ОШИБКА: на origin нет ветки ${branch}"
    popd >/dev/null
    return 1
  fi

  git checkout -B "$branch" "origin/${branch}"
  git reset --hard "origin/${branch}"

  local current remote_head local_head
  current="$(git branch --show-current)"
  remote_head="$(git rev-parse "origin/${branch}")"
  local_head="$(git rev-parse HEAD)"

  if [[ "$current" != "$branch" ]]; then
    echo "ОШИБКА: активная ветка '${current}', требуется только '${branch}'"
    popd >/dev/null
    return 1
  fi

  if [[ "$local_head" != "$remote_head" ]]; then
    echo "ОШИБКА: HEAD не совпадает с origin/${branch}"
    popd >/dev/null
    return 1
  fi

  echo "    origin/${branch} @ $(git rev-parse --short HEAD) — $(git log -1 --format='%s')"

  popd >/dev/null
}
