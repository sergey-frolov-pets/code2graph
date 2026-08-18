#!/usr/bin/env bash
# Nginx + статика Code2Graph (если install не завершил веб-часть).
set -eo pipefail

INSTALL_DIR="${CODE2GRAPH_INSTALL_DIR:-/opt/code2graph}"
WEB_ROOT="${CODE2GRAPH_WEB_ROOT:-/var/www/code2graph}"
DOMAIN="${CODE2GRAPH_DOMAIN:-www.code2graph.ru}"

if [[ $EUID -ne 0 ]]; then
  echo "Запустите: sudo bash scripts/deploy/vdsina-fix-nginx.sh"
  exit 1
fi

if [[ ! -f "$INSTALL_DIR/dist/index.html" ]]; then
  echo "Нет $INSTALL_DIR/dist/index.html — сначала: npm run build"
  exit 1
fi

echo "==> Статика -> ${WEB_ROOT}"
install -d -m 0755 "$WEB_ROOT"
rsync -a --delete "$INSTALL_DIR/dist/" "$WEB_ROOT/"

NGINX_SITE="/etc/nginx/sites-available/code2graph"
cat >"$NGINX_SITE" <<EOF
server {
    listen 80;
    server_name ${DOMAIN} code2graph.ru;

    root ${WEB_ROOT};
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 4m;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/code2graph
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl reload nginx

echo "==> HTTP проверка"
curl -fsS "http://127.0.0.1/api/auth/status" || true
echo ""

if [[ "${CODE2GRAPH_SKIP_CERTBOT:-}" != "1" ]]; then
  echo "==> TLS (certbot)"
  certbot --nginx -d "$DOMAIN" -d code2graph.ru \
    --non-interactive --agree-tos \
    -m "${CODE2GRAPH_ADMIN_EMAIL:-admin@code2graph.ru}" 2>/dev/null || \
    echo "Certbot: запустите вручную после DNS: certbot --nginx -d $DOMAIN -d code2graph.ru"
fi

echo "==> Готово: http://${DOMAIN} и https://${DOMAIN}"
