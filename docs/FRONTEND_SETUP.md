# Настройка Frontend

## Что создано

### 1. Базовая структура Angular проекта
- ✅ Standalone компоненты (Angular 17+)
- ✅ Роутинг настроен согласно плану
- ✅ Конфигурация Tailwind CSS
- ✅ TypeScript конфигурация

### 2. UI Компоненты (Headless подход)

Все компоненты в `frontend/src/app/shared/ui/`:

**Базовые:**
- ✅ `UiButtonComponent` - кнопки с вариантами (default, outline, ghost, danger)
- ✅ `UiInputComponent` - поля ввода с поддержкой форм
- ✅ `UiLabelComponent` - метки
- ✅ `UiCardComponent` - карточки (header, title, content, footer)
- ✅ `UiSpinnerComponent` - индикатор загрузки

**Интерактивные:**
- ✅ `UiDialogComponent` - модальные окна
- ✅ `UiDropdownComponent` - выпадающие меню
- ✅ `UiToastService` + `UiToastContainerComponent` - уведомления
- ✅ `UiCheckboxComponent` - чекбоксы
- ✅ `UiSwitchComponent` - переключатели
- ✅ `UiBadgeComponent` - бейджи
- ✅ `UiTabsComponent` - вкладки

### 3. Страницы

**Auth:**
- ✅ `/auth/login` - страница входа
- ✅ `/auth/register` - регистрация
- ✅ `/auth/2fa` - двухфакторная аутентификация

**Vault:**
- ✅ `/vault` - список записей (заглушка)
- ✅ `/vault/backup` - резервное копирование

**Settings:**
- ✅ `/settings/profile` - профиль
- ✅ `/settings/security` - безопасность
- ✅ `/settings/devices` - устройства и сессии
- ✅ `/settings/audit` - логи аудита

**Технические:**
- ✅ `/**` - страница 404

### 4. Core функциональность

- ✅ `AuthService` - сервис аутентификации
- ✅ `AuthGuard` - защита маршрутов
- ✅ `authInterceptor` - добавление JWT токенов к запросам
- ✅ `ToastService` - глобальные уведомления

## Установка и запуск

```bash
cd frontend

# Установка зависимостей
npm install

# Запуск dev сервера
npm start

# Откроется на http://localhost:4200
```

## Следующие шаги

1. **Реализовать CryptoService**:
   - KDF (Argon2id) для выработки ключей
   - Шифрование/расшифровка (AES-256-GCM)
   - Генерация VaultKey

2. **Реализовать VaultService**:
   - CRUD операции с записями
   - Синхронизация с сервером

3. **Доработать страницы**:
   - Полная реализация VaultListComponent
   - Формы создания/редактирования записей
   - Интеграция с CryptoService

4. **Добавить Layout**:
   - MainLayoutComponent с сайдбаром и топбаром
   - Навигация между разделами

5. **Реализовать 2FA**:
   - TOTP настройка и проверка
   - WebAuthn интеграция

## Особенности реализации

- Все компоненты standalone (не требуют NgModule)
- Headless UI подход - компоненты управляют только логикой и стилями
- Tailwind CSS для стилизации
- TypeScript strict mode
- Reactive Forms для всех форм
- HTTP Interceptors для автоматической авторизации

## Структура стилей

Используется система дизайна на основе CSS переменных:
- Цвета через HSL переменные
- Темная/светлая тема через `.dark` класс
- Адаптивность через Tailwind утилиты

