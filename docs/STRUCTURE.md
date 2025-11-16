# Структура проекта

## Общая структура

```
PasswordManager/
├── frontend/                 # Angular SPA приложение
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/        # Модуль аутентификации
│   │   │   ├── vault/       # Модуль хранилища
│   │   │   ├── settings/    # Модуль настроек
│   │   │   └── shared/      # Общие компоненты/сервисы
│   │   ├── assets/
│   │   └── environments/
│   ├── angular.json
│   └── package.json
│
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── controllers/     # Контроллеры запросов
│   │   ├── services/        # Бизнес-логика
│   │   ├── models/          # Mongoose модели
│   │   ├── routes/          # API маршруты
│   │   ├── middleware/      # Express middleware
│   │   ├── utils/           # Утилиты
│   │   ├── config/          # Конфигурация
│   │   ├── types/           # TypeScript типы
│   │   └── app.ts           # Главный файл приложения
│   ├── tsconfig.json
│   └── package.json
│
├── extension/               # Браузерное расширение
│   ├── src/
│   │   ├── background/      # Background script
│   │   ├── content/         # Content scripts
│   │   ├── popup/           # Popup UI
│   │   ├── options/        # Options page
│   │   └── shared/          # Общий код
│   ├── manifest.json
│   └── package.json
│
├── shared/                  # Общие типы и утилиты
│   ├── types/               # TypeScript типы
│   ├── utils/               # Общие утилиты
│   └── constants/           # Константы
│
├── docs/                    # Документация
│   ├── STRUCTURE.md         # Этот файл
│   └── API.md               # API документация
│
├── README.md
├── ARCHITECTURE.md
├── package.json             # Root package.json
└── .gitignore
```

## Детальная структура компонентов

### Frontend (Angular)

```
frontend/src/app/
├── auth/
│   ├── components/
│   │   ├── login/
│   │   ├── register/
│   │   ├── two-factor/
│   │   └── webauthn/
│   ├── services/
│   │   └── auth.service.ts
│   ├── guards/
│   │   └── auth.guard.ts
│   └── auth.module.ts
│
├── vault/
│   ├── components/
│   │   ├── vault-list/
│   │   ├── vault-item/
│   │   ├── edit-item/
│   │   └── backup-restore/
│   ├── services/
│   │   ├── vault.service.ts
│   │   └── crypto.service.ts
│   └── vault.module.ts
│
├── settings/
│   ├── components/
│   │   ├── profile/
│   │   ├── security/
│   │   └── devices/
│   └── settings.module.ts
│
└── shared/
    ├── components/
    ├── services/
    │   ├── api.service.ts
    │   └── session.service.ts
    ├── interceptors/
    │   └── auth.interceptor.ts
    └── models/
```

### Backend (Node.js/Express)

```
backend/src/
├── controllers/
│   ├── auth.controller.ts
│   ├── vault.controller.ts
│   ├── session.controller.ts
│   └── audit.controller.ts
│
├── services/
│   ├── user.service.ts
│   ├── auth.service.ts
│   ├── vault.service.ts
│   ├── session.service.ts
│   ├── audit.service.ts
│   └── webauthn.service.ts
│
├── models/
│   ├── user.model.ts
│   ├── vault-item.model.ts
│   ├── session.model.ts
│   └── audit-log.model.ts
│
├── routes/
│   ├── auth.routes.ts
│   ├── vault.routes.ts
│   ├── session.routes.ts
│   └── audit.routes.ts
│
├── middleware/
│   ├── auth.middleware.ts
│   ├── rate-limit.middleware.ts
│   ├── error-handler.middleware.ts
│   └── validation.middleware.ts
│
├── utils/
│   ├── crypto.util.ts
│   ├── validation.util.ts
│   └── logger.util.ts
│
├── config/
│   ├── database.config.ts
│   ├── jwt.config.ts
│   └── app.config.ts
│
└── app.ts
```

### Extension (Browser Extension)

```
extension/src/
├── background/
│   ├── background.ts        # Главный background script
│   ├── api-client.ts        # Клиент для API
│   └── vault-manager.ts     # Управление хранилищем
│
├── content/
│   ├── content.ts           # Content script
│   ├── form-detector.ts     # Определение форм
│   └── autofill.ts          # Автозаполнение
│
├── popup/
│   ├── popup.html
│   ├── popup.ts
│   └── popup.css
│
├── options/
│   ├── options.html
│   ├── options.ts
│   └── options.css
│
└── shared/
    ├── types.ts
    ├── crypto.ts            # Криптография для расширения
    └── utils.ts
```

## Основные файлы конфигурации

### Frontend
- `angular.json` - Конфигурация Angular CLI
- `tsconfig.json` - TypeScript конфигурация
- `package.json` - Зависимости

### Backend
- `tsconfig.json` - TypeScript конфигурация
- `package.json` - Зависимости
- `.env` - Переменные окружения (не в git)

### Extension
- `manifest.json` - Манифест расширения
- `package.json` - Зависимости
- `tsconfig.json` - TypeScript конфигурация

## Принципы организации

1. **Модульность**: Каждый функциональный модуль изолирован
2. **Разделение ответственности**: Четкое разделение между слоями (controllers, services, models)
3. **Переиспользование**: Общий код в `shared/`
4. **Типизация**: Строгая типизация TypeScript
5. **Безопасность**: Криптография только на клиенте

