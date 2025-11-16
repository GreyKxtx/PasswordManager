# Быстрый старт Backend

## 1. Установка зависимостей

```bash
cd backend
npm install
```

## 2. Настройка MongoDB

Убедитесь, что MongoDB запущен локально или используйте MongoDB Atlas.

## 3. Создание .env файла

Создайте файл `.env` в папке `backend/`:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/password-manager
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:4200
```

**Важно:** Измените `JWT_SECRET` на случайную строку в продакшене!

## 4. Запуск сервера

```bash
npm run dev
```

Сервер запустится на `http://localhost:3000`

## 5. Проверка работы

Откройте в браузере: `http://localhost:3000/health`

Должен вернуться JSON:
```json
{
  "status": "ok",
  "timestamp": "..."
}
```

## Готово! 🎉

Теперь фронтенд может подключаться к бэкенду через proxy (настроен в `frontend/proxy.conf.json`).

