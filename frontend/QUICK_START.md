# Быстрый старт Frontend

## Установка зависимостей

```bash
npm install
```

## Запуск dev сервера

```bash
npm start
# или
ng serve
```

Приложение откроется на `http://localhost:4200`

## Сборка для production

```bash
npm run build
```

## Структура проекта

```
frontend/
├── src/
│   ├── app/
│   │   ├── auth/              # Модуль аутентификации
│   │   │   ├── components/
│   │   │   │   ├── login/
│   │   │   │   ├── register/
│   │   │   │   └── two-factor/
│   │   │   └── auth.routes.ts
│   │   ├── vault/             # Модуль хранилища
│   │   ├── settings/          # Модуль настроек
│   │   ├── shared/
│   │   │   └── ui/            # UI компоненты
│   │   ├── core/              # Core сервисы, guards
│   │   └── app.routes.ts      # Главный роутинг
│   ├── styles.css             # Tailwind стили
│   └── main.ts                # Точка входа
```

## UI Компоненты

Все компоненты в `src/app/shared/ui/`:

- `UiButtonComponent` - `<ui-button>`
- `UiInputComponent` - `<ui-input>`
- `UiLabelComponent` - `<ui-label>`
- `UiCardComponent` - `<ui-card>`
- `UiSpinnerComponent` - `<ui-spinner>`
- `UiDialogComponent` - `<ui-dialog>`
- `UiToastContainerComponent` - `<ui-toast-container>`
- И другие...

## Примеры использования

### Кнопка
```html
<ui-button>Обычная кнопка</ui-button>
<ui-button variant="outline">Outline</ui-button>
<ui-button variant="danger">Удалить</ui-button>
<ui-button [fullWidth]="true">На всю ширину</ui-button>
```

### Поле ввода
```html
<ui-label for="email">Email</ui-label>
<ui-input
  id="email"
  type="email"
  placeholder="you@example.com"
  formControlName="email"
/>
```

### Карточка
```html
<ui-card>
  <ui-card-header>
    <ui-card-title>Заголовок</ui-card-title>
  </ui-card-header>
  <ui-card-content>
    Содержимое карточки
  </ui-card-content>
</ui-card>
```

### Toast уведомления
```typescript
// В компоненте
constructor(private toastService: ToastService) {}

this.toastService.success('Успешно!');
this.toastService.error('Ошибка!');
this.toastService.warning('Предупреждение');
this.toastService.info('Информация');
```

## Роутинг

- `/auth/login` - Вход
- `/auth/register` - Регистрация
- `/auth/2fa` - 2FA
- `/vault` - Хранилище
- `/vault/backup` - Backup
- `/settings/*` - Настройки

## Следующие шаги разработки

1. **Реализовать CryptoService**:
   - KDF (Argon2id) для выработки ключей
   - Шифрование/расшифровка (AES-256-GCM)
   - Генерация VaultKey

2. **Реализовать VaultService**:
   - CRUD операции
   - Синхронизация с API

3. **Добавить MainLayout**:
   - Сайдбар навигации
   - Топбар с поиском
   - Меню пользователя

4. **Доработать страницы**:
   - Полная реализация VaultListComponent
   - Формы создания/редактирования
   - Интеграция с сервисами

## Примечания

- Предупреждения npm о deprecated пакетах - это нормально, они связаны с транзитивными зависимостями Angular
- Уязвимости можно исправить через `npm audit fix` (но это может сломать совместимость)
- Все компоненты standalone - не требуют NgModule
- Tailwind CSS настроен и готов к использованию

