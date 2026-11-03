#!/usr/bin/env bash
# Загрузка vdsina-install.sh из sergey-frolov-pets/code2graph (только ветка main) и запуск.
# Для PRIVATE repo raw.githubusercontent.com не работает (404) — используем GitHub API.
set -euo pipefail

TOKEN="${CODE2GRAPH_GIT_TOKEN:-}"
REPO="sergey-frolov-pets/code2graph"
DEPLOY_BRANCH="main"
SCRIPT_PATH="scripts/deploy/vdsina-install.sh"

if [[ -n "${CODE2GRAPH_REF:-}" && "${CODE2GRAPH_REF}" != "$DEPLOY_BRANCH" ]]; then
  echo "ОШИБКА: деплой разрешён только из ветки ${DEPLOY_BRANCH}. CODE2GRAPH_REF=${CODE2GRAPH_REF} игнорируется."
  exit 1
fi

if [[ -z "$TOKEN" ]]; then
  echo "Задайте CODE2GRAPH_GIT_TOKEN (PAT с Contents: Read на code2graph)."
  echo "Или сделайте репозиторий code2graph Public — тогда работает:"
  echo "  curl -fsSL https://raw.githubusercontent.com/${REPO}/${DEPLOY_BRANCH}/${SCRIPT_PATH} | sudo bash"
  exit 1
fi

curl -fsSL \
  -H "Authorization: token ${TOKEN}" \
  -H "Accept: application/vnd.github.raw" \
  "https://api.github.com/repos/${REPO}/contents/${SCRIPT_PATH}?ref=${DEPLOY_BRANCH}" \
  | sudo -E CODE2GRAPH_GIT_TOKEN="$TOKEN" bash
