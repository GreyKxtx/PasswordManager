# Инструкция по тестированию бэкенда

## Быстрый старт

### 1. Убедитесь, что сервер запущен

```bash
npm run dev
```

Сервер должен запуститься на `http://localhost:3000` (или порт из `.env`).

### 2. Запустите автоматические smoke-тесты

```bash
npm run test:smoke
```

Этот скрипт проверит:
- ✅ Health check endpoint
- ✅ Get login params (для несуществующего пользователя)
- ✅ Защищенные эндпоинты без токена (401)
- ✅ Валидацию ObjectId (400 для невалидного ID)
- ✅ Обработку невалидного JSON (400)
- ✅ Валидацию через Zod (400 для невалидных данных)

### 3. Ручное тестирование через HTTP-клиент

Используйте файл `test-smoke.http` с REST Client extension в VS Code или аналогичным инструментом.

Или используйте curl:

```bash
# Health check
curl http://localhost:3000/health

# Get login params
curl "http://localhost:3000/api/auth/login/params?email=test@example.com"

# Защищенный endpoint без токена (должен вернуть 401)
curl http://localhost:3000/api/vault/items

# Невалидный ObjectId (должен вернуть 400)
curl -H "Authorization: Bearer fake-token" http://localhost:3000/api/vault/items/abracadabra

# Невалидный JSON (должен вернуть 400)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "invalid": json here}'
```

## Что проверять

### 1. Логирование

Проверьте, что в логах:
- ✅ Используется структурированный формат: `[timestamp] [LEVEL] message {context}`
- ✅ Есть уровни: `INFO`, `WARN`, `ERROR`
- ✅ Есть контекст: `path`, `method`, `ip`, `userId` (если есть)
- ❌ НЕТ `console.log` напрямую (кроме logger.ts)
- ❌ НЕТ чувствительных данных: токены, verifier, encryptedData

### 2. Обработка ошибок

Проверьте, что:
- ✅ Все ошибки возвращаются в едином формате: `{ success: false, error: string, details?: any }`
- ✅ 401 ошибки обрабатываются через `errorHandler` (AuthTokenError)
- ✅ 400 ошибки валидации содержат `details` с описанием ошибок Zod
- ✅ 500 ошибки не раскрывают stack trace в production
- ✅ Логи содержат достаточно информации для отладки, но не раскрывают чувствительные данные

### 3. Валидация

Проверьте, что:
- ✅ Невалидные ObjectId возвращают 400 с понятным сообщением
- ✅ Невалидные данные валидируются через Zod и возвращают 400 с `details`
- ✅ Невалидный JSON обрабатывается корректно (400)

### 4. Защищенные эндпоинты

Проверьте, что:
- ✅ Запросы без токена возвращают 401
- ✅ Запросы с невалидным токеном возвращают 401
- ✅ Запросы с истекшим токеном возвращают 401
- ✅ Запросы с валидным токеном работают корректно

## Полный тест-кейс: Регистрация → Логин → CRUD

### 1. Регистрация

**Важно:** Для реального теста регистрации нужны данные, сгенерированные на клиенте (Argon2id, шифрование). Используйте фронтенд для генерации правильных данных.

### 2. Логин

После регистрации через фронтенд:
```bash
# Получить KDF params
curl "http://localhost:3000/api/auth/login/params?email=your@email.com"

# Логин (нужен passwordVerifier, сгенерированный на клиенте)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "passwordVerifier": "..."}'
```

### 3. CRUD Vault

После получения токена:
```bash
TOKEN="your-access-token"

# Получить все записи
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/vault/items

# Создать запись
curl -X POST http://localhost:3000/api/vault/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "encryptedData": "base64...",
    "iv": "base64...",
    "version": 1
  }'

# Обновить запись
curl -X PUT http://localhost:3000/api/vault/items/ITEM_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated"}'

# Удалить запись
curl -X DELETE http://localhost:3000/api/vault/items/ITEM_ID \
  -H "Authorization: Bearer $TOKEN"
```

## Проверка логгера

Запустите сервер и выполните несколько запросов. Проверьте вывод в консоли:

**Хорошо:**
```
[2025-01-16T10:00:00.000Z] [INFO] Server is running on http://localhost:3000 {"port":3000,"environment":"development"}
[2025-01-16T10:00:01.000Z] [WARN] Auth error: TokenNotFoundError {"message":"No token provided","path":"/api/vault/items","method":"GET","ip":"::1"}
[2025-01-16T10:00:02.000Z] [ERROR] Get vault items error {"error":"Unauthorized","userId":"..."}
```

**Плохо:**
```
console.log('Server started')
[ERROR] { stack: '...', message: '...', ... } // полный stack trace в production
```

## После успешного тестирования

Если все тесты пройдены:
1. ✅ Бэкенд готов к работе
2. ✅ Можно переходить к тестированию фронтенда
3. ✅ После фронтенда - расширение

