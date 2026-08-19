#!/usr/bin/env bash
# Строгая синхронизация с origin/main — канонический источник прод-деплоя на VDS.
# Опционально: checkout конкретного commit SHA (тест без merge в main).
# Подключается из deploy-скриптов (без set -euo — вызывающий скрипт управляет strict mode).

CODE2GRAPH_DEPLOY_BRANCH="main"

sync_origin_main() {
  local dir="$1"
  local deploy_commit="${2:-}"
  local branch="${CODE2GRAPH_DEPLOY_BRANCH}"

  if [[ ! -d "$dir/.git" ]]; then
    echo "ОШИБКА: ${dir} не является git-репозиторием"
    return 1
  fi

  pushd "$dir" >/dev/null

  if [[ -n "$deploy_commit" ]]; then
    echo "==> git sync (тестовый деплой: commit ${deploy_commit})"
    git fetch origin --prune

    local resolved=""
    if ! resolved="$(git rev-parse --verify "${deploy_commit}^{commit}" 2>/dev/null)"; then
      echo "ОШИБКА: commit '${deploy_commit}' не найден после git fetch origin"
      echo "    Убедитесь, что commit запушен в GitHub (ветка cursor/* или main)."
      popd >/dev/null
      return 1
    fi

    git checkout --detach "$resolved"
    echo "    detached HEAD @ $(git rev-parse --short HEAD) — $(git log -1 --format='%s')"
    popd >/dev/null
    return 0
  fi

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
