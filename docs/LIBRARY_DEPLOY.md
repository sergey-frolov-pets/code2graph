# Развёртывание Library API (библиотека диаграмм)

Отдельный Node.js-сервер для общей библиотеки диаграмм и free LLM proxy. Фронтенд vuePlantUML (GitHub Pages) подключается к нему через настройки приложения.

## Рекомендуемые тарифы VPS

Для Library API достаточно минимальной конфигурации: SQLite + Hono, типичная нагрузка — десятки запросов в минуту.

### VDSina (обычно дешевле)

| Тариф | CPU | RAM | Диск | Трафик | Цена |
|-------|-----|-----|------|--------|------|
| Базовый | 1 core | 1 GB | 10 GB | 1 TB/мес | **150 ₽/мес** (5 ₽/день) |
| Комфорт | 1 core | 2 GB | 50 GB | 32 TB/мес | **600 ₽/мес** |

- Публичный IP включён в тариф
- Посуточная оплата — можно протестировать за 5 ₽
- Дата-центры: Москва, Нидерланды
- Сайт: https://vdsina.ru/pricing/standard

**Рекомендация:** базовый тариф 1 GB / 10 GB — **оптимальный выбор** для личной или небольшой командной библиотеки.

### Beget VPS

| Тариф | CPU | RAM | Диск | Цена сервера | IP |
|-------|-----|-----|------|--------------|-----|
| Минимальный | 1 core | 1 GB | 10 GB SSD | **330 ₽/мес** | +150 ₽/мес |
| Средний | 2 cores | 4 GB | 40 GB SSD | **990 ₽/мес** | +150 ₽/мес |

- С апреля 2026: линейный конфигуратор, IP оплачивается отдельно
- Бесплатное резервное копирование VPS
- Сайт: https://beget.com/ru/vps/custom

**Рекомендация:** минимальный VPS + IP ≈ **480 ₽/мес**. Удобен, если уже есть аккаунт Beget.

### Сравнение

| | VDSina базовый | Beget минимальный |
|--|----------------|-------------------|
| Итого с IP | ~150 ₽/мес | ~480 ₽/мес |
| Тест | 5 ₽/день | 30 дней trial |
| Для Library API | ✅ Достаточно | ✅ Достаточно |

---

## Пошаговая установка на Ubuntu 22/24 (VPS)

### 1. Подготовка сервера

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl nginx certbot python3-certbot-nginx
```

Установка Node.js 20:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x
```

### 2. Клонирование и сборка API

```bash
sudo mkdir -p /opt/vueplantuml
sudo chown "$USER":"$USER" /opt/vueplantuml
cd /opt/vueplantuml

git clone https://github.com/YOUR_USER/vuePlantUML.git .
cd server
npm ci
npm run build
```

### 3. Переменные окружения

Создайте `/opt/vueplantuml/server/.env`:

```bash
PORT=3001
DB_PATH=/opt/vueplantuml/data/library.db

# Обязательно для продакшена — Basic Auth
LIBRARY_AUTH_USERNAME=your_login
LIBRARY_AUTH_PASSWORD=your_strong_password_here

# Опционально: free LLM proxy
GEMINI_API_KEY=your-gemini-key
LLM_RATE_LIMIT_PER_MINUTE=20
```

Создайте каталог для SQLite:

```bash
mkdir -p /opt/vueplantuml/data
```

### 4. systemd-сервис

Файл `/etc/systemd/system/vueplantuml-library.service`:

```ini
[Unit]
Description=vuePlantUML Library API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/vueplantuml/server
EnvironmentFile=/opt/vueplantuml/server/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo chown -R www-data:www-data /opt/vueplantuml/data
sudo systemctl daemon-reload
sudo systemctl enable --now vueplantuml-library
sudo systemctl status vueplantuml-library
```

Проверка (с учётными данными):

```bash
curl -u 'your_login:your_strong_password_here' http://127.0.0.1:3001/api/health
# {"ok":true,"service":"vueplantuml-library-api"}
```

### 5. Nginx + HTTPS

Замените `library.example.com` на ваш домен (поддомен A-записи на IP VPS).

Файл `/etc/nginx/sites-available/vueplantuml-library`:

```nginx
server {
    listen 80;
    server_name library.example.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 1m;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/vueplantuml-library /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d library.example.com
```

### 6. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## Подключение приложения vuePlantUML

1. Откройте приложение (например https://puml.sergey-frolov.ru/).
2. **Настройки → Библиотека**:
   - **Адрес сервера:** `https://library.example.com` (без `/api` — приложение добавит автоматически)
   - **Логин:** тот же, что `LIBRARY_AUTH_USERNAME`
   - **Пароль:** тот же, что `LIBRARY_AUTH_PASSWORD` → **Сохранить пароль**
3. Нажмите **Проверить подключение к библиотеке**.
4. Откройте **Библиотека** в шапке — секции и диаграммы синхронизируются с сервера.

Для free LLM (Google Gemini без ключа) тот же URL и учётные данные используются автоматически.

### Локальный режим

Если адрес сервера пустой — библиотека работает только в IndexedDB браузера, без синхронизации.

---

## Безопасность

- **Всегда** задавайте `LIBRARY_AUTH_USERNAME` и `LIBRARY_AUTH_PASSWORD` на публичном VPS.
- Без этих переменных API открыт для всех (режим только для локальной разработки).
- Используйте HTTPS (Let's Encrypt через certbot).
- Пароль в браузере хранится в `localStorage` — для общих компьютеров используйте отдельный аккаунт браузера или не сохраняйте пароль.

---

## Обновление

```bash
cd /opt/vueplantuml
git pull
cd server
npm ci
npm run build
sudo systemctl restart vueplantuml-library
```

Данные SQLite в `data/library.db` сохраняются при обновлении.

## Резервное копирование

```bash
cp /opt/vueplantuml/data/library.db /backup/library-$(date +%Y%m%d).db
```

Или экспорт через UI: **Библиотека → Перенос → Экспорт** (`vueplantuml-library.json`).
