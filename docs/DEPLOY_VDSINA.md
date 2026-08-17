# Деплой на VDSINA (www.code2graph.ru)

Сайт: **https://www.code2graph.ru** — фронтенд (PWA) + API на одном домене (`/api`).

## DNS (reg.ru)

| Тип | Имя | Значение |
|-----|-----|----------|
| A | `@` | IP VPS VDSINA |
| A | `www` | IP VPS VDSINA |

Дождите распространения DNS, затем установка.

## Первичная установка (голая Ubuntu 22/24)

На VPS VDSINA:

```bash
curl -fsSL https://raw.githubusercontent.com/sergey-frolov-pets/code2graph/main/scripts/deploy/vdsina-install.sh | sudo bash
```

Или из клонированного репозитория:

```bash
sudo bash scripts/deploy/vdsina-install.sh
```

Переменные (опционально):

| Переменная | По умолчанию |
|------------|--------------|
| `CODE2GRAPH_DOMAIN` | `www.code2graph.ru` |
| `CODE2GRAPH_REPO_URL` | `https://github.com/sergey-frolov-pets/code2graph.git` |
| `CODE2GRAPH_INSTALL_DIR` | `/opt/code2graph` |
| `CODE2GRAPH_ADMIN_EMAIL` | для certbot |

После установки отредактируйте `/opt/code2graph/server/.env` (секрет, LLM ключи для free tier).

## Обновление сайта

```bash
sudo bash /opt/code2graph/scripts/deploy/vdsina-update.sh
```

Скрипт: `git pull` → `npm run build` → rsync `dist/` → `systemctl restart code2graph-library`.

## Автообновление (cron)

```bash
echo '15 4 * * * root /opt/code2graph/scripts/deploy/vdsina-update.sh >> /var/log/code2graph-update.log 2>&1' \
  | sudo tee /etc/cron.d/code2graph-update
```

## Проверка

```bash
curl -sS https://www.code2graph.ru/api/health
systemctl status code2graph-library
```

## LLM ключи BYOK

Ключи пользователя для BYOK-провайдеров хранятся **только в localStorage браузера** и не отправляются на сервер Code2Graph.

Free LLM (`*-free` провайдеры) использует ключи из `server/.env` на VPS.
