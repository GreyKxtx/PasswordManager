# Backend API

Backend сервер для менеджера паролей на Node.js/Express/TypeScript/MongoDB.

## Требования

- Node.js 18+
- MongoDB 6+
- npm или yarn

## Установка

```bash
# Установка зависимостей
npm install
```

## Настройка

Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Отредактируйте `.env` и укажите:
- `MONGODB_URI` - URI для подключения к MongoDB
- `JWT_SECRET` - секретный ключ для JWT (обязательно измените в продакшене!)
- `PORT` - порт для сервера (по умолчанию 3000)
- `CORS_ORIGIN` - URL фронтенда (по умолчанию http://localhost:4200)

## Запуск

### Режим разработки

```bash
npm run dev
```

Сервер запустится на `http://localhost:3000` с автоматической перезагрузкой при изменениях.

### Продакшен

```bash
# Сборка
npm run build

# Запуск
npm start
```

## API Endpoints

### Аутентификация

- `POST /api/auth/register` - Регистрация нового пользователя
- `POST /api/auth/login` - Вход пользователя
- `POST /api/auth/refresh` - Обновление токенов
- `GET /api/auth/me` - Получение текущего пользователя (требует авторизации)

### Health Check

- `GET /health` - Проверка состояния сервера

## Структура проекта

```
backend/
├── src/
│   ├── config/          # Конфигурация (БД, env)
│   ├── controllers/     # Контроллеры для обработки запросов
│   ├── middleware/      # Middleware (auth, error handling)
│   ├── models/          # Mongoose модели
│   ├── routes/          # API маршруты
│   ├── services/        # Бизнес-логика
│   └── index.ts         # Точка входа
├── dist/                # Скомпилированный код
├── .env                 # Переменные окружения (не в git)
└── package.json
```

## Безопасность

- ✅ Rate limiting для защиты от брутфорса
- ✅ Helmet для безопасных HTTP заголовков
- ✅ CORS настройка
- ✅ Timing-safe сравнение passwordVerifier
- ✅ JWT токены с коротким временем жизни
- ✅ Валидация входных данных

## Разработка

### TypeScript

Проект использует TypeScript. Для проверки типов:

```bash
npm run type-check
```

### Переменные окружения

Все настройки через `.env` файл. Не коммитьте `.env` в git!

