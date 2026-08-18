#!/usr/bin/env bash
# Ручная зеркальная публикация vuePUML/main → sergey-frolov-pets/code2graph (main).
# Нужен PAT с Contents: Read and write на репозиторий code2graph.
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: CODE2GRAPH_PUBLISH_PAT=ghp_xxx $0"
  echo "   or: $0 ghp_xxx"
  exit 1
fi

PAT="${CODE2GRAPH_PUBLISH_PAT:-$1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"

trap 'rm -rf "$TMP"' EXIT

git clone --branch main "$ROOT" "$TMP/vuePUML"
cd "$TMP/vuePUML"

rm -rf publish/
rm -f scratchpad.md netlify.toml
rm -f scripts/migrate-to-code2graph.mjs
rm -f docs/diagram-converter-plan.md docs/REFACTORING.md
rm -f .github/workflows/publish-code2graph.yml
rm -f .github/workflows/publish-ozadachnik.yml

git add -A
if ! git diff --staged --quiet; then
  git commit -m "chore: strip obsolete files for code2graph mirror"
fi

git -c credential.helper= push \
  "https://x-access-token:${PAT}@github.com/sergey-frolov-pets/code2graph.git" \
  HEAD:main --force

echo "Published to https://github.com/sergey-frolov-pets/code2graph"
