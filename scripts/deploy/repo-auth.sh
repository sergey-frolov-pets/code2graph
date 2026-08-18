#!/usr/bin/env bash
# Git auth for private sergey-frolov-pets/code2graph on VPS.
# Sourced by deploy scripts — no set -euo here (caller controls strict mode).

CODE2GRAPH_DEFAULT_REPO="https://github.com/sergey-frolov-pets/code2graph.git"

load_deploy_env() {
  if [[ -f /etc/code2graph/deploy.env ]]; then
    # shellcheck disable=SC1091
    source /etc/code2graph/deploy.env
  fi
}

resolve_code2graph_repo_url() {
  load_deploy_env
  local url="${CODE2GRAPH_REPO_URL:-$CODE2GRAPH_DEFAULT_REPO}"
  if [[ -n "${CODE2GRAPH_GIT_TOKEN:-}" ]] && [[ "$url" == https://github.com/* ]]; then
    url="https://x-access-token:${CODE2GRAPH_GIT_TOKEN}@${url#https://}"
  fi
  printf '%s' "$url"
}

configure_git_origin() {
  local dir="$1"
  local url
  url="$(resolve_code2graph_repo_url)"
  if [[ -d "$dir/.git" ]]; then
    git -C "$dir" remote set-url origin "$url"
  fi
}

save_deploy_env() {
  local env_file="/etc/code2graph/deploy.env"
  if [[ -n "${CODE2GRAPH_GIT_TOKEN:-}" ]]; then
    install -d -m 0700 /etc/code2graph
    cat >"$env_file" <<EOF
# Code2Graph VPS deploy — git access (code2graph repo)
CODE2GRAPH_REPO_URL=${CODE2GRAPH_REPO_URL:-$CODE2GRAPH_DEFAULT_REPO}
CODE2GRAPH_GIT_TOKEN=${CODE2GRAPH_GIT_TOKEN}
EOF
    chmod 0600 "$env_file"
  fi
}
