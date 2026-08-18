#!/usr/bin/env bash
# Установить/перезапустить systemd unit code2graph-library (если install упал на npm build).
set -eo pipefail

INSTALL_DIR="${CODE2GRAPH_INSTALL_DIR:-/opt/code2graph}"

if [[ $EUID -ne 0 ]]; then
  echo "Запустите: sudo bash scripts/deploy/vdsina-fix-systemd.sh"
  exit 1
fi

if [[ ! -d "$INSTALL_DIR" ]]; then
  echo "Не найден $INSTALL_DIR — сначала запустите vdsina-install.sh"
  exit 1
fi

UNIT_SRC="$INSTALL_DIR/deploy/systemd/code2graph-library.service"
if [[ ! -f "$UNIT_SRC" ]]; then
  echo "Не найден $UNIT_SRC"
  exit 1
fi

if [[ ! -f "$INSTALL_DIR/server/.env" ]]; then
  if [[ -f "$INSTALL_DIR/deploy/server.env.example" ]]; then
    cp "$INSTALL_DIR/deploy/server.env.example" "$INSTALL_DIR/server/.env"
    echo "Создан server/.env — задайте AUTH_TOKEN_SECRET."
  fi
fi

mkdir -p "$INSTALL_DIR/data"
chown -R www-data:www-data "$INSTALL_DIR/data"

if [[ ! -f "$INSTALL_DIR/server/dist/index.js" ]]; then
  echo "==> Сборка API (dist/index.js не найден)"
  cd "$INSTALL_DIR"
  npm --prefix server ci
  npm --prefix server run build
fi

NODE_BIN="$(command -v node)"
if [[ -z "$NODE_BIN" ]]; then
  echo "node не найден — установите Node.js 20"
  exit 1
fi

install -m 0644 "$UNIT_SRC" /etc/systemd/system/code2graph-library.service
# Подставить реальный путь к node (не всегда /usr/bin/node)
sed -i "s|^ExecStart=.*|ExecStart=${NODE_BIN} dist/index.js|" /etc/systemd/system/code2graph-library.service

systemctl daemon-reload
systemctl enable code2graph-library
systemctl restart code2graph-library
systemctl status code2graph-library --no-pager

echo "==> Проверка API:"
curl -sS http://127.0.0.1:3001/api/auth/status || true
