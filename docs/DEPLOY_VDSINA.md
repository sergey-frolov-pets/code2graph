# Деплой на VDSINA (www.code2graph.ru)

Канонический репозиторий: **https://github.com/sergey-frolov-pets/code2graph**

---

## ⚠️ `curl raw.githubusercontent.com` → 404

Это **нормально**, если репозиторий `code2graph` **Private**.

GitHub **не отдаёт** файлы приватных репозиториев через `raw.githubusercontent.com` (всегда 404 без авторизации).

**Два решения:**

| Вариант | Действие |
|---------|----------|
| **A. Public repo** | GitHub → `code2graph` → Settings → Danger zone → **Change visibility → Public** → тогда работает `curl raw...` |
| **B. Private repo** | Установка через **PAT + GitHub API** или `git clone` (ниже) |

---

## DNS (reg.ru)

| Тип | Имя | Значение |
|-----|-----|----------|
| A | `@` | IP VPS |
| A | `www` | IP VPS |

---

## Установка (private `code2graph`) — one-liner

PAT: **Contents: Read** на репо `code2graph`.

```bash
export CODE2GRAPH_GIT_TOKEN=ghp_ваш_токен
export CODE2GRAPH_ADMIN_EMAIL=sfrolov2@gmail.com

curl -fsSL \
  -H "Authorization: token ${CODE2GRAPH_GIT_TOKEN}" \
  -H "Accept: application/vnd.github.raw" \
  "https://api.github.com/repos/sergey-frolov-pets/code2graph/contents/scripts/deploy/vdsina-install.sh?ref=main" \
  | sudo -E CODE2GRAPH_GIT_TOKEN="$CODE2GRAPH_GIT_TOKEN" \
         CODE2GRAPH_ADMIN_EMAIL="$CODE2GRAPH_ADMIN_EMAIL" bash
```

Или через helper-скрипт (после `git clone`):

```bash
sudo -E CODE2GRAPH_GIT_TOKEN=ghp_xxx bash scripts/deploy/install-vdsina-from-github.sh
```

---

## Установка (public `code2graph`)

```bash
curl -fsSL https://raw.githubusercontent.com/sergey-frolov-pets/code2graph/main/scripts/deploy/vdsina-install.sh | sudo bash
```

---

## Установка через git clone (private или public)

```bash
export CODE2GRAPH_GIT_TOKEN=ghp_ваш_токен
export CODE2GRAPH_ADMIN_EMAIL=sfrolov2@gmail.com

sudo apt update && sudo apt install -y git
git clone "https://x-access-token:${CODE2GRAPH_GIT_TOKEN}@github.com/sergey-frolov-pets/code2graph.git" /tmp/code2graph-setup
sudo -E CODE2GRAPH_GIT_TOKEN="$CODE2GRAPH_GIT_TOKEN" \
  CODE2GRAPH_ADMIN_EMAIL="$CODE2GRAPH_ADMIN_EMAIL" \
  bash /tmp/code2graph-setup/scripts/deploy/vdsina-install.sh
```

---

## После установки

```bash
sudo nano /opt/code2graph/server/.env
sudo systemctl restart code2graph-library
sudo systemctl status code2graph-library

Если unit не найден — установка прервалась до systemd. На VPS:

```bash
sudo bash /opt/code2graph/scripts/deploy/vdsina-fix-systemd.sh
```

Или полный перезапуск установки:

```bash
sudo bash /opt/code2graph/scripts/deploy/vdsina-install.sh
```
curl -sS https://www.code2graph.ru/api/auth/status
```

## Обновление

Скрипт по умолчанию жёстко синхронизирует локальный `main` с `origin/main` (publish в code2graph — force-push; обычный `git pull` на VPS может падать с «divergent branches»).

```bash
sudo bash /opt/code2graph/scripts/deploy/vdsina-update.sh
```

### Тест commit-а без merge в main

Чтобы проверить изменения из feature-ветки на VPS до merge в `main`, укажите SHA (короткий или полный). Commit должен быть **запушен** в GitHub.

```bash
# CLI
sudo bash /opt/code2graph/scripts/deploy/vdsina-update.sh --commit fcdb931

# или переменная окружения
sudo CODE2GRAPH_DEPLOY_COMMIT=fcdb931 bash /opt/code2graph/scripts/deploy/vdsina-update.sh
```

Скрипт делает `git fetch origin`, checkout в **detached HEAD** на указанный commit, собирает и выкладывает сайт.

Вернуть прод с `origin/main`:

```bash
sudo bash /opt/code2graph/scripts/deploy/vdsina-update.sh
```

Справка: `sudo bash /opt/code2graph/scripts/deploy/vdsina-update.sh --help`

Если обновление уже упало на git, вручную:

```bash
cd /opt/code2graph
git fetch origin main
git checkout -B main origin/main
sudo bash scripts/deploy/vdsina-update.sh
```

## Cron (автообновление)

```bash
echo '15 4 * * * root /opt/code2graph/scripts/deploy/vdsina-update.sh >> /var/log/code2graph-update.log 2>&1' \
  | sudo tee /etc/cron.d/code2graph-update
```

---

## Переменные

| Переменная | По умолчанию |
|------------|--------------|
| `CODE2GRAPH_REPO_URL` | `https://github.com/sergey-frolov-pets/code2graph.git` |
| `CODE2GRAPH_GIT_TOKEN` | — (для private) |
| `CODE2GRAPH_DOMAIN` | `www.code2graph.ru` |
| `CODE2GRAPH_INSTALL_DIR` | `/opt/code2graph` |
| `CODE2GRAPH_DEPLOY_COMMIT` | — (SHA для тестового деплоя, см. `vdsina-update.sh --commit`) |
| `CODE2GRAPH_ADMIN_EMAIL` | `admin@code2graph.ru` |
