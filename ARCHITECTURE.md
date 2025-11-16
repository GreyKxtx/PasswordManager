# Архитектура системы

## Общая схема

```
┌─────────────────┐
│   Angular SPA    │  ← Веб-интерфейс пользователя
│   (Frontend)     │
└────────┬────────┘
         │ HTTPS/REST API
         │
┌────────▼────────┐
│  Express API    │  ← Backend сервер
│   (Backend)     │
└────────┬────────┘
         │
┌────────▼────────┐
│    MongoDB      │  ← База данных
└─────────────────┘

┌─────────────────┐
│ Browser         │  ← Браузерное расширение
│ Extension       │     (автозаполнение)
└─────────────────┘
```

## Компоненты системы

### 1. Frontend (Angular)

#### Структура модулей:
- **AuthModule**: Аутентификация и авторизация
  - LoginComponent
  - RegisterComponent
  - TwoFactorComponent
  - WebAuthnComponent
  
- **VaultModule**: Работа с хранилищем паролей
  - VaultListComponent
  - VaultItemComponent
  - EditItemComponent
  - BackupRestoreComponent
  
- **SettingsModule**: Настройки пользователя
  - ProfileComponent
  - SecurityComponent (2FA, сессии)
  - DevicesComponent

#### Сервисы:
- **AuthService**: Управление токенами, логин/логаут
- **CryptoService**: Криптографические операции (KDF, шифрование)
- **VaultService**: Работа с хранилищем (CRUD операции)
- **SessionService**: Управление сессиями
- **ApiService**: HTTP клиент с interceptors

#### Guards и Interceptors:
- **AuthGuard**: Защита маршрутов
- **HttpInterceptor**: Добавление JWT токенов, обработка 401

### 2. Backend (Node.js/Express)

#### Структура:
```
backend/
├── src/
│   ├── controllers/     # Контроллеры для обработки запросов
│   ├── services/        # Бизнес-логика
│   ├── models/          # Mongoose модели
│   ├── routes/          # Маршруты API
│   ├── middleware/      # Middleware (auth, rate-limit, etc.)
│   ├── utils/           # Утилиты
│   ├── config/          # Конфигурация
│   └── types/           # TypeScript типы
```

#### Основные контроллеры:
- **AuthController**: Регистрация, вход, 2FA
- **VaultController**: CRUD операции с записями
- **SessionController**: Управление сессиями
- **AuditController**: Аудит логи

#### Сервисы:
- **UserService**: Работа с пользователями
- **AuthService**: Проверка passwordVerifier (timing-safe сравнение), генерация JWT
- **VaultService**: Операции с хранилищем (сервер не расшифровывает данные)
- **SessionService**: Управление сессиями
- **AuditService**: Логирование событий
- **WebAuthnService**: WebAuthn операции

#### Middleware:
- **authMiddleware**: Проверка JWT токенов
- **rateLimitMiddleware**: Ограничение частоты запросов
- **errorHandler**: Централизованная обработка ошибок
- **helmet**: Безопасные HTTP заголовки

### 3. Database (MongoDB)

#### Коллекции:
- **users**: Пользователи
  - email (unique)
  - passwordVerifier (результат Argon2id KDF, вычислен на клиенте)
  - kdfParams (параметры KDF: algorithm, memory, iterations, parallelism, salt)
  - vaultKeyEnc (VaultKey, зашифрованный PasswordKey)
  - vaultKeyEncIV (IV для шифрования VaultKey)
  - twoFactorEnabled
  - totpSecretEnc (зашифрован VaultKey)
  - webauthnCredentials[]
  
- **vaultItems**: Записи хранилища
  - userId
  - data (зашифровано, AES-256-GCM с VaultKey)
  - type
  - folder
  - tags[]
  - version (для синхронизации)
  - createdAt
  - updatedAt
  - lastModified
  
- **sessions**: Активные сессии
  - userId
  - device
  - ip
  - userAgent
  - createdAt
  - lastActiveAt
  - valid
  
- **auditLogs**: Аудит события
  - userId
  - action
  - timestamp
  - details

### 4. Browser Extension

#### Структура:
```
extension/
├── src/
│   ├── background/      # Background script
│   ├── content/         # Content scripts
│   ├── popup/           # Popup UI
│   ├── options/         # Options page
│   └── shared/          # Общий код
├── manifest.json
└── package.json
```

#### Компоненты:
- **Background Script**: Управление данными, API запросы
- **Content Scripts**: Определение форм, автозаполнение
- **Popup**: UI для быстрого доступа
- **Options**: Настройки расширения

## Поток данных

### Регистрация пользователя:
1. Пользователь вводит email и мастер-пароль
2. Frontend: KDF (Argon2id) от мастер-пароля → PasswordKey
3. Frontend: Дополнительный проход KDF → PasswordVerifier
4. Frontend: Генерация случайного VaultKey (256 бит)
5. Frontend: Шифрование VaultKey с PasswordKey → vaultKeyEnc
6. Frontend: Отправка email, passwordVerifier, kdfParams, vaultKeyEnc, vaultKeyEncIV на сервер
7. Backend: Сохранение в БД (без знания мастер-пароля и ключей)
8. Backend: Возврат JWT токенов

### Вход в систему:
1. Пользователь вводит email и мастер-пароль
2. Frontend: KDF (Argon2id) от мастер-пароля → PasswordKey
3. Frontend: Дополнительный проход KDF → PasswordVerifier
4. Frontend: Отправка email, passwordVerifier на сервер
5. Backend: Сравнение passwordVerifier с сохраненным (timing-safe)
6. Backend: Возврат JWT токенов, vaultKeyEnc, vaultKeyEncIV
7. Frontend: Расшифровка vaultKeyEnc с PasswordKey → VaultKey (хранится в памяти)

### Создание записи в хранилище:
1. Пользователь вводит данные (логин, пароль, заметка)
2. Frontend: Шифрование данных (AES-256-GCM) с VaultKey
3. Frontend: Отправка зашифрованных данных на сервер
4. Backend: Сохранение в MongoDB (без расшифровки)
5. Backend: Возврат itemId, version, lastModified

### Получение записей:
1. Frontend: Запрос GET /vault/items
2. Backend: Возврат зашифрованных записей
3. Frontend: Расшифровка каждой записи с VaultKey
4. Frontend: Поиск и фильтрация по расшифрованным данным (на клиенте)
5. Frontend: Отображение расшифрованных данных

## Безопасность

### Криптография:
- **KDF**: Argon2id (19 МБ памяти, 2+ итерации) - выполняется **только на клиенте**
- **Шифрование**: AES-256-GCM (256-битный ключ, 96-битный IV)
- **Проверка пароля**: Сервер сравнивает passwordVerifier (результат KDF), не вычисляет Argon2id
- **JWT**: RS256 или HS256

### Защита от атак:
- **Rate Limiting**: Ограничение частоты запросов
- **CORS**: Настроен для разрешенных доменов
- **CSP**: Content Security Policy
- **Helmet**: Безопасные HTTP заголовки
- **Input Validation**: Валидация всех входных данных

### Хранение ключей:
- VaultKey хранится только в памяти клиента (в браузере или extension)
- PasswordKey (выведен из мастер-пароля) хранится только в памяти клиента
- При логауте все ключи очищаются из памяти
- Мастер-пароль никогда не отправляется на сервер
- VaultKey в БД хранится в зашифрованном виде (vaultKeyEnc)

## Масштабирование

- Горизонтальное масштабирование backend через load balancer
- MongoDB репликация для высокой доступности
- Кэширование на уровне приложения (Redis - опционально)
- CDN для статических файлов frontend

