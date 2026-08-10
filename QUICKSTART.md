# 🚀 Быстрый старт

## Шаг 1: Настроить бэкенд

Скопируйте и заполните файл переменных окружения:
```bash
cp backend/.env.example backend/.env
# Укажите GOOGLE_DRIVE_FOLDER_ID и GOOGLE_SERVICE_ACCOUNT_JSON
```

Запустите бэкенд:
```bash
cd backend
docker build -t consent-backend .
docker run --env-file .env -p 8000:8000 consent-backend
```

## Шаг 2: Настроить фронтенд

Откройте `config.js` и укажите URL бэкенда:
```js
const BACKEND_URL = 'http://localhost:8000';
```

Откройте `index.html` в браузере (или используйте Live Server).

## Шаг 3: Заполнение формы

Заполните все поля:
1. ФИО
2. Телефон (+7 (7XX) XXX-XX-XX)
3. ИИН (12 цифр)
4. Аллергия (или «НЕТ»)
5. Подпись (нарисуйте на canvas)
6. Отметьте чекбокс согласия на обработку ПД

## Шаг 4: Отправка

Нажмите «ЗАВЕРШИТЬ» — сервер сгенерирует PDF, загрузит его в Google Drive и вернёт браузеру для скачивания.

---

📖 Полная документация в [README.md](README.md)
