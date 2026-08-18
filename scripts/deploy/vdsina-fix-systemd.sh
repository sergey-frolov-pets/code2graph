#!/usr/bin/env bash
# Установить/перезапустить systemd unit code2graph-library (если install упал на npm build).
set -eo pipefail

INSTALL_DIR="${CODE2GRAPH_INSTALL_DIR:-/opt/code2graph}"
WEB_ROOT="${CODE2GRAPH_WEB_ROOT:-/var/www/code2graph}"

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
chmod 755 "$INSTALL_DIR" "$INSTALL_DIR/server"

# shellcheck disable=SC1091
source "$INSTALL_DIR/scripts/deploy/server-entry.sh"

SERVER_ENTRY="$(resolve_server_entry "$INSTALL_DIR/server")" || {
  echo "==> Сборка API (entry не найден)"
  cd "$INSTALL_DIR"
  npm --prefix server ci
  npm --prefix server run build
  SERVER_ENTRY="$(resolve_server_entry "$INSTALL_DIR/server")" || {
    echo "Ошибка: после build нет dist/server/src/index.js"
    exit 1
  }
}

if [[ -f "$INSTALL_DIR/dist/index.html" ]]; then
  echo "==> Статика -> ${WEB_ROOT}"
  install -d -m 0755 "$WEB_ROOT"
  rsync -a --delete "$INSTALL_DIR/dist/" "$WEB_ROOT/"
fi

NODE_BIN="$(command -v node)"
if [[ -z "$NODE_BIN" ]]; then
  echo "node не найден — установите Node.js 20"
  exit 1
fi

install -m 0644 "$UNIT_SRC" /etc/systemd/system/code2graph-library.service
sed -i "s|^ExecStart=.*|ExecStart=${NODE_BIN} ${SERVER_ENTRY}|" /etc/systemd/system/code2graph-library.service
sed -i 's|^EnvironmentFile=|EnvironmentFile=-|' /etc/systemd/system/code2graph-library.service

echo "==> Пробный запуск (www-data, 3s) entry=${SERVER_ENTRY}..."
if ! timeout 3 sudo -u www-data env PORT=3001 DB_PATH="$INSTALL_DIR/data/library.db" \
  bash -c "cd '$INSTALL_DIR/server' && exec $NODE_BIN ${SERVER_ENTRY}" 2>&1; then
  echo "Пробный запуск завершён (timeout или ошибка — см. выше)"
fi

systemctl daemon-reload
systemctl enable code2graph-library
systemctl restart code2graph-library
sleep 2
systemctl status code2graph-library --no-pager -l || true

echo "==> Проверка API:"
if curl -fsS --max-time 5 http://127.0.0.1:3001/api/auth/status; then
  echo ""
else
  echo "API не отвечает — последние логи:"
  journalctl -u code2graph-library -n 40 --no-pager
fi
