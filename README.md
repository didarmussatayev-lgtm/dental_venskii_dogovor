# Система электронных согласий — MVP

Клиент сканирует QR-код → открывает форму на GitHub Pages → подписывает согласие → получает скачанный ZIP (только PDF).
Бэкенд генерирует DOCX/PDF, загружает в Google Drive и `.docx`, и `.pdf`, а клиенту отдаёт ZIP только с PDF.

---

## Архитектура

```
frontend/            # GitHub Pages (статика)
  index.html
  style.css
  script.js
  config.js          # конфигурация URL бэкенда

backend/             # FastAPI (Docker)
  app/
    main.py          # FastAPI app + CORS
    config.py        # Pydantic settings (.env)
    models.py        # Pydantic request models
    docgen.py        # DOCX → PDF (LibreOffice)
    drive.py         # Google Drive upload
    templates/
      soglasie_template_general.docx
      soglasie_template_invasia.docx
      soglasie_template_pregnant.docx
  Dockerfile
  requirements.txt
  .env.example
  create_template.py # helper: генерирует DOCX-шаблон
```

---

## Быстрый старт (локально)

### 1. Подготовить DOCX-шаблоны

В папке `backend/app/templates` должны лежать шаблоны для процедур из выпадающего списка формы:
- `Хирургия - удаление зуба`
- `Терапия - лечение под седацией (севоран)`
- `Терапия - лечение несовершеннолетних, согласие опекуна`
- `Имплантация - Договор на имплантацию`
- `Имплантация - Согласие на имплантацию`
- `Имплантация - Дополнительное соглашение к договору имплантации о гарантии`
- `Терапия - Согласие на эндодонтическое лечение`
- `Терапия - Согласие на лечение кариеса`
- `Терапия - Согласие на реставрацию зубов`
- `Терапия - Согласие на профессиональную чистку`
- `Терапия - Согласие на повторное эндодонтическое вмешательство`
- `Терапия - Согласие на глубокий кариес, переходящий в пульпит`

Для каждого выбранного пункта генерируется один комплект DOCX/PDF по соответствующему шаблону.

Правила плейсхолдеров в шаблонах:
- Используйте безопасные Jinja-ключи в ASCII-формате: `snake_case` (например, `{{ birth_date }}`, `{{ gender }}`).
- Избегайте пробелов и нестандартных имён переменных внутри `{{ ... }}` — это вызывает ошибки парсинга Jinja.
- Для обратной совместимости backend автоматически нормализует legacy-плейсхолдеры `{{Дата рождения}}` и `{{пол}}` в безопасные ключи.

### 2. Настроить переменные окружения

```bash
cp backend/.env.example backend/.env
# Отредактируйте backend/.env — укажите Drive folder ID и OAuth refresh-token credentials
```

### 3. Запустить бэкенд

**С Docker (рекомендуется):**

```bash
cd backend
docker build -t consent-backend .
docker run --env-file .env -p 8000:8000 consent-backend
```

**Без Docker (нужен LibreOffice):**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Запустить фронтенд локально

Откройте `frontend/index.html` через VS Code Live Server или:

```bash
cd frontend
python -m http.server 5500
# → http://localhost:5500
```

Убедитесь, что в `frontend/config.js` указан верный `BACKEND_URL`:

```js
const BACKEND_URL = 'http://localhost:8000';
```

---

## Настройка Google Drive

1. В [Google Cloud Console](https://console.cloud.google.com/) создайте проект.
2. Включите **Google Drive API**.
3. Создайте **OAuth Client ID** и получите `client_id` / `client_secret`.
4. Получите `refresh_token` для аккаунта, в чей Google Drive нужно загружать файлы.
5. Скопируйте ID папки из URL: `https://drive.google.com/drive/folders/<FOLDER_ID>`
6. Заполните в `backend/.env`:

```env
GOOGLE_DRIVE_FOLDER_ID=<FOLDER_ID>
GOOGLE_OAUTH_CLIENT_ID=<YOUR_GOOGLE_OAUTH_CLIENT_ID>
GOOGLE_OAUTH_CLIENT_SECRET=<YOUR_GOOGLE_OAUTH_CLIENT_SECRET>
GOOGLE_OAUTH_REFRESH_TOKEN=<YOUR_GOOGLE_OAUTH_REFRESH_TOKEN>
```

> **Важно:** не коммитьте `.env` в репозиторий — он в `.gitignore`.

---

## Деплой бэкенда на Railway

1. Подключите репозиторий к Railway.
2. Укажите Root Directory: `backend`.
3. Railway автоматически найдёт `Dockerfile` и соберёт образ.
4. Добавьте переменные окружения в настройках Railway (те же, что в `.env`).
5. После деплоя скопируйте HTTPS-URL вида `https://your-app.up.railway.app`.

---

## Настройка GitHub Pages (фронтенд)

1. В `frontend/config.js` замените URL:

```js
const BACKEND_URL = 'https://your-app.up.railway.app';
```

2. В настройках репозитория: **Settings → Pages → Source**: выберите ветку `main` и папку `/frontend`.
3. GitHub Pages будет доступен по адресу `https://<username>.github.io/<repo>/`.
4. Добавьте этот URL в `CORS_ORIGINS` на бэкенде.

---

## Проверка end-to-end

1. Откройте форму на GitHub Pages (или `http://localhost:5500`).
2. Заполните ФИО, телефон (+7 (7XX) XXX-XX-XX), ИИН (12 цифр), дату рождения, пол, аллергию и выберите процедуру из списка.
3. Нарисуйте подпись.
4. Отметьте чекбокс согласия — кнопка «Завершить» станет активной.
5. Нажмите «Завершить» — появится индикатор загрузки.
6. Браузер автоматически скачает `<IIN>_<FIO>.zip` (внутри только `.pdf`).
7. В папке Google Drive появятся отдельные `.docx` и `.pdf` файлы с именованием `<IIN>_<FIO>_<template>.<ext>`.

Проверить здоровье API:

```bash
curl https://your-app.up.railway.app/health
# {"status":"ok"}
```

---

## Ограничения MVP

- Нет базы данных — история только в Google Drive.
- Нет аутентификации пользователей / личного кабинета.
- Нет оплаты.
- LibreOffice в Docker увеличивает образ (~400 MB) и может замедлять холодный старт.
- При большом количестве одновременных запросов возможна блокировка LibreOffice — для масштабирования нужна очередь задач.

---

## Переменные окружения (backend/.env)

| Переменная | Описание | Пример |
|---|---|---|
| `APP_ENV` | Окружение | `production` |
| `LOG_LEVEL` | Уровень логирования | `INFO` |
| `CORS_ORIGINS` | Разрешённые origins (через запятую) | `https://user.github.io` |
| `GOOGLE_DRIVE_FOLDER_ID` | ID папки на Drive | `1BxiM...` |
| `GOOGLE_OAUTH_CLIENT_ID` | OAuth Client ID | `123456.apps.googleusercontent.com` |
| `GOOGLE_OAUTH_CLIENT_SECRET` | OAuth Client Secret | `GOCSPX-...` |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | OAuth Refresh Token для доступа к Drive | `1//0g...` |
| `TEMPLATE_PATH` | Путь к любому шаблону внутри `app/templates` (используется для определения директории шаблонов) | `app/templates/soglasie_template_general.docx` |
