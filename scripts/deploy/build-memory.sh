#!/usr/bin/env bash
# Swap + NODE_OPTIONS for npm build on low-RAM VPS (1 GB).
set -euo pipefail

ensure_swap_for_build() {
  local swap_gb="${CODE2GRAPH_SWAP_GB:-2}"
  local ram_mb swap_mb
  ram_mb="$(awk '/^MemTotal:/{print int($2/1024)}' /proc/meminfo)"
  swap_mb="$(awk '/^SwapTotal:/{print int($2/1024)}' /proc/meminfo)"

  if [[ "$ram_mb" -ge 2048 ]] || [[ "$swap_mb" -ge 1024 ]]; then
    return 0
  fi

  echo "==> Мало RAM (${ram_mb} MB, swap ${swap_mb} MB) — swap ${swap_gb}G для npm build"

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
  local heap_mb="${CODE2GRAPH_NODE_HEAP_MB:-2048}"
  export NODE_OPTIONS="--max-old-space-size=${heap_mb}"
  echo "==> NODE_OPTIONS=${NODE_OPTIONS}"
}
