# Деплой на VDSINA (www.code2graph.ru)

Канонический репозиторий: **https://github.com/sergey-frolov-pets/code2graph**  
Сайт: **https://www.code2graph.ru** — фронтенд (PWA) + API на одном домене (`/api`).

---

## DNS (reg.ru)

| Тип | Имя | Значение |
|-----|-----|----------|
| A | `@` | IP VPS VDSINA |
| A | `www` | IP VPS VDSINA |

```bash
dig +short www.code2graph.ru A
```

---

## Установка на VPS

### Если репозиторий `code2graph` **публичный**

```bash
curl -fsSL https://raw.githubusercontent.com/sergey-frolov-pets/code2graph/main/scripts/deploy/vdsina-install.sh | sudo bash
```

### Если репозиторий `code2graph` **приватный** (PAT обязателен)

`raw.githubusercontent.com` **не работает** для private repo → клонируем `code2graph` с токеном:

**1. Fine-grained PAT**

- Repository: **only `code2graph`**
- Permission: **Contents: Read-only**

**2. На VPS (Ubuntu 22/24)**

```bash
export CODE2GRAPH_GIT_TOKEN=ghp_ваш_токен
export CODE2GRAPH_ADMIN_EMAIL=sfrolov2@gmail.com

sudo apt update && sudo apt install -y git
git clone "https://x-access-token:${CODE2GRAPH_GIT_TOKEN}@github.com/sergey-frolov-pets/code2graph.git" /tmp/code2graph-setup
sudo -E CODE2GRAPH_GIT_TOKEN="$CODE2GRAPH_GIT_TOKEN" \
  CODE2GRAPH_ADMIN_EMAIL="$CODE2GRAPH_ADMIN_EMAIL" \
  bash /tmp/code2graph-setup/scripts/deploy/vdsina-install.sh
```

Токен сохранится в `/etc/code2graph/deploy.env` для `git pull` при обновлениях.

### Уже есть клон `code2graph`

```bash
cd /opt/code2graph
sudo -E CODE2GRAPH_GIT_TOKEN=ghp_xxx bash scripts/deploy/vdsina-install.sh
```

---

## После установки

```bash
sudo nano /opt/code2graph/server/.env   # AUTH_TOKEN_SECRET, LLM ключи
sudo systemctl restart code2graph-library
```

---

## Переменные окружения

| Переменная | По умолчанию |
|------------|--------------|
| `CODE2GRAPH_REPO_URL` | `https://github.com/sergey-frolov-pets/code2graph.git` |
| `CODE2GRAPH_GIT_TOKEN` | — (нужен для private repo) |
| `CODE2GRAPH_DOMAIN` | `www.code2graph.ru` |
| `CODE2GRAPH_INSTALL_DIR` | `/opt/code2graph` |
| `CODE2GRAPH_WEB_ROOT` | `/var/www/code2graph` |
| `CODE2GRAPH_ADMIN_EMAIL` | `admin@code2graph.ru` |

---

## Обновление

```bash
sudo bash /opt/code2graph/scripts/deploy/vdsina-update.sh
```

## Автообновление (cron)

```bash
echo '15 4 * * * root /opt/code2graph/scripts/deploy/vdsina-update.sh >> /var/log/code2graph-update.log 2>&1' \
  | sudo tee /etc/cron.d/code2graph-update
```

---

## Проверка

```bash
curl -sS https://www.code2graph.ru/api/auth/status
systemctl status code2graph-library
```

С авторизацией:

```bash
curl -sS -u 'логин:пароль' https://www.code2graph.ru/api/health
```

---

## LLM

- **BYOK** — ключи только в `localStorage` браузера  
- **Free LLM** — ключи в `/opt/code2graph/server/.env`
