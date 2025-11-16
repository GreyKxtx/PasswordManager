# Безопасный облачный менеджер паролей

Система для защищенного хранения и управления паролями с сквозным шифрованием (E2EE) и двухфакторной аутентификацией.

## Архитектура системы

Проект состоит из следующих основных компонентов:

### 1. Frontend (Angular SPA)
- **Расположение**: `frontend/`
- **Технологии**: Angular, TypeScript, RxJS
- **Основные модули**:
  - Аутентификация (регистрация, вход, 2FA)
  - Криптография на клиенте (Web Crypto API, Argon2)
  - Хранилище паролей (Vault)
  - Управление сессиями
  - Настройки и профиль

### 2. Backend (Node.js/Express)
- **Расположение**: `backend/`
- **Технологии**: Node.js, Express, TypeScript, MongoDB (Mongoose)
- **Основные модули**:
  - REST API для аутентификации
  - API для работы с хранилищем
  - Управление сессиями
  - Аудит логирование
  - Middleware для безопасности

### 3. Browser Extension
- **Расположение**: `extension/`
- **Технологии**: TypeScript, Chrome Extension API
- **Функции**:
  - Автозаполнение форм логина/пароля
  - Интеграция с основным API
  - Определение форм на страницах

### 4. Shared
- **Расположение**: `shared/`
- **Содержимое**: Общие типы, интерфейсы, константы для всех компонентов

## Ключевые особенности безопасности

- **Сквозное шифрование (E2EE)**: Все данные шифруются на клиенте перед отправкой
- **KDF (Argon2id)**: Использование стойкого алгоритма для выработки ключей из пароля
- **AES-256-GCM**: Современное аутентифицированное шифрование
- **2FA**: Поддержка TOTP и WebAuthn
- **JWT токены**: Безопасная аутентификация с refresh токенами

## Структура проекта

```
PasswordManager/
├── frontend/          # Angular SPA приложение
├── backend/           # Node.js/Express API сервер
├── extension/         # Браузерное расширение
├── shared/            # Общие типы и утилиты
├── docs/              # Документация
└── tz.md              # Техническое задание
```

## Быстрый старт

### Требования
- Node.js 18+
- MongoDB 6+
- npm или yarn

### Установка

```bash
# Установка зависимостей для всех компонентов
npm run install:all

# Запуск backend
cd backend && npm run dev

# Запуск frontend
cd frontend && npm start

# Сборка extension
cd extension && npm run build
```

## API Endpoints

### Аутентификация
- `POST /auth/register` - Регистрация
- `POST /auth/login` - Вход
- `POST /auth/logout` - Выход
- `POST /auth/refresh` - Обновление токена
- `POST /auth/totp/enable` - Включение TOTP
- `POST /auth/webauthn/register` - Регистрация WebAuthn

### Хранилище
- `GET /vault/items` - Получить все записи
- `POST /vault/items` - Создать запись
- `PUT /vault/items/:id` - Обновить запись
- `DELETE /vault/items/:id` - Удалить запись
- `GET /vault/backup` - Экспорт хранилища
- `POST /vault/restore` - Импорт хранилища

### Сессии
- `GET /sessions` - Список активных сессий
- `DELETE /sessions/:id` - Завершить сессию

## Лицензия

MIT

