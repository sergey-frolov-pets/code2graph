#!/usr/bin/env bash
# NODE heap + optional swap for npm build (Vite на 1–2 GB VPS).
set -euo pipefail

read_memory_mb() {
  awk '/^MemTotal:/{print int($2/1024)}' /proc/meminfo
}

read_swap_mb() {
  awk '/^SwapTotal:/{print int($2/1024)}' /proc/meminfo
}

ensure_swap_for_build() {
  local swap_gb="${CODE2GRAPH_SWAP_GB:-1}"
  local ram_mb swap_mb
  ram_mb="$(read_memory_mb)"
  swap_mb="$(read_swap_mb)"

  # До ~3 GB RAM сборка фронта может выйти за лимит — swap как буфер на пике.
  if [[ "$ram_mb" -ge 3072 && "$swap_mb" -ge 512 ]]; then
    return 0
  fi

  if [[ "$swap_mb" -ge 1024 ]]; then
    return 0
  fi

  echo "==> RAM ${ram_mb} MB, swap ${swap_mb} MB — swap ${swap_gb}G буфер для npm build"

  if [[ ! -f /swapfile ]]; then
    if fallocate -l "${swap_gb}G" /swapfile 2>/dev/null; then
      :
    else
      dd if=/dev/zero of=/swapfile bs=1M count=$((swap_gb * 1024)) status=none
    fi
    chmod 600 /swapfile
    mkswap /swapfile
  fi

  if ! swapon --show 2>/dev/null | grep -q '/swapfile'; then
    swapon /swapfile
  fi

  if ! grep -q '^/swapfile ' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi

  free -h
}

export_node_build_memory() {
  local ram_mb heap_mb
  ram_mb="$(read_memory_mb)"
  heap_mb="${CODE2GRAPH_NODE_HEAP_MB:-}"

  if [[ -z "$heap_mb" ]]; then
    if [[ "$ram_mb" -le 2200 ]]; then
      heap_mb=1536
    else
      heap_mb=2048
    fi
  fi

  export NODE_OPTIONS="--max-old-space-size=${heap_mb}"
  echo "==> RAM ${ram_mb} MB, NODE_OPTIONS=${NODE_OPTIONS}"
}
