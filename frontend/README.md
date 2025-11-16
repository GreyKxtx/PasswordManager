# Frontend - Password Manager

Angular SPA приложение для управления паролями с сквозным шифрованием.

## Технологический стек

- **Angular 17+** - фреймворк
- **TypeScript** - язык программирования
- **Tailwind CSS** - стилизация
- **Headless UI компоненты** - переиспользуемые UI компоненты

## Структура проекта

```
frontend/
├── src/
│   ├── app/
│   │   ├── auth/              # Модуль аутентификации
│   │   ├── vault/             # Модуль хранилища
│   │   ├── settings/          # Модуль настроек
│   │   ├── shared/
│   │   │   └── ui/            # UI компоненты
│   │   ├── core/              # Core сервисы, guards, interceptors
│   │   └── layouts/           # Layout компоненты
│   ├── styles.css             # Глобальные стили (Tailwind)
│   └── main.ts                # Точка входа
├── angular.json
├── tailwind.config.js
└── package.json
```

## UI Компоненты

Все компоненты находятся в `src/app/shared/ui/` и сделаны standalone:

- **Button** - кнопки с вариантами (default, outline, ghost, danger)
- **Input** - поля ввода с поддержкой форм
- **Label** - метки для полей
- **Card** - карточки с header, content, footer
- **Spinner** - индикатор загрузки
- **Dialog** - модальные окна
- **Dropdown** - выпадающие меню
- **Toast** - уведомления
- **Checkbox** - чекбоксы
- **Switch** - переключатели
- **Badge** - бейджи
- **Tabs** - вкладки

## Установка и запуск

```bash
# Установка зависимостей
npm install

# Запуск dev сервера
npm start

# Сборка для production
npm run build
```

## Роутинг

- `/auth/login` - Вход
- `/auth/register` - Регистрация
- `/auth/2fa` - Двухфакторная аутентификация
- `/vault` - Хранилище паролей
- `/vault/backup` - Резервное копирование
- `/settings/profile` - Профиль
- `/settings/security` - Безопасность
- `/settings/devices` - Устройства и сессии
- `/settings/audit` - Логи аудита

## Особенности

- Standalone компоненты (Angular 17+)
- Headless UI подход (похож на shadcn)
- Tailwind CSS для стилизации
- TypeScript strict mode
- Reactive Forms
- HTTP Interceptors для авторизации

