/**
 * Поиск полей логина и пароля на странице
 */
interface FormFields {
  usernameField: HTMLInputElement | null;
  passwordField: HTMLInputElement | null;
}

interface VaultItemDecrypted {
  id: string;
  title: string;
  username?: string;
  url?: string;
  tags?: string[];
  password: string;
  notes?: string;
}

interface MessageResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Поиск полей формы
 */
function findFormFields(): FormFields[] {
  const passwordFields = Array.from(document.querySelectorAll<HTMLInputElement>(
    'input[type="password"]'
  ));

  const forms: FormFields[] = [];

  for (const passwordField of passwordFields) {
    // Ищем поле логина рядом с полем пароля
    const form = passwordField.closest('form');
    let usernameField: HTMLInputElement | null = null;

    if (form) {
      // Ищем в той же форме - расширенный поиск
      usernameField = form.querySelector<HTMLInputElement>(
        'input[type="email"], ' +
        'input[type="text"][name*="login" i], ' +
        'input[type="text"][name*="user" i], ' +
        'input[type="text"][name*="email" i], ' +
        'input[name*="username" i], ' +
        'input[id*="login" i], ' +
        'input[id*="user" i], ' +
        'input[id*="email" i], ' +
        'input[placeholder*="email" i], ' +
        'input[placeholder*="login" i], ' +
        'input[placeholder*="user" i], ' +
        'input[autocomplete="username"], ' +
        'input[autocomplete="email"]'
      ) || null;
    }

    // Если не нашли в форме, ищем в родительском контейнере
    if (!usernameField) {
      let parent = passwordField.parentElement;
      let depth = 0;
      // Ищем в родительских элементах до 3 уровней вверх
      while (parent && depth < 3) {
        usernameField = parent.querySelector<HTMLInputElement>(
          'input[type="email"], ' +
          'input[type="text"]:not([type="password"]), ' +
          'input[autocomplete="username"], ' +
          'input[autocomplete="email"]'
        ) || null;
        
        if (usernameField && usernameField !== passwordField) {
          break;
        }
        parent = parent.parentElement;
        depth++;
      }
    }

    // Если все еще не нашли, ищем все текстовые поля перед полем пароля в документе
    if (!usernameField) {
      const allInputs = Array.from(document.querySelectorAll<HTMLInputElement>(
        'input[type="email"], input[type="text"]:not([type="password"])'
      ));
      
      // Берем ближайшее поле перед полем пароля
      for (const input of allInputs) {
        const inputRect = input.getBoundingClientRect();
        const passwordRect = passwordField.getBoundingClientRect();
        
        // Проверяем, что поле находится выше или слева от поля пароля
        if (inputRect.bottom <= passwordRect.top || inputRect.right <= passwordRect.left) {
          usernameField = input;
          break;
        }
      }
    }

    forms.push({
      usernameField,
      passwordField,
    });
  }

  return forms;
}

/**
 * Создание иконки для автозаполнения
 */
function createAutofillIcon(entry: VaultItemDecrypted): HTMLElement {
  const icon = document.createElement('div');
  icon.className = 'pm-autofill-icon';
  icon.innerHTML = '🔐';
  icon.style.cssText = `
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 24px;
    height: 24px;
    cursor: pointer;
    z-index: 10000;
    background: #4a90e2;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  `;
  return icon;
}

/**
 * Создание выпадающего меню с записями
 */
function createDropdownMenu(entries: VaultItemDecrypted[], onSelect: (entry: VaultItemDecrypted) => void): HTMLElement {
  const menu = document.createElement('div');
  menu.className = 'pm-autofill-menu';
  menu.style.cssText = `
    position: absolute;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10001;
    max-height: 300px;
    overflow-y: auto;
    min-width: 250px;
  `;

  if (entries.length === 0) {
    menu.innerHTML = '<div style="padding: 12px; color: #999;">Нет записей</div>';
    return menu;
  }

  menu.innerHTML = entries.map(entry => `
    <div class="pm-menu-item" data-entry-id="${entry.id}" style="
      padding: 12px;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
    ">
      <div style="font-weight: 600; margin-bottom: 4px;">${escapeHtml(entry.title)}</div>
      ${entry.username ? `<div style="font-size: 12px; color: #666;">${escapeHtml(entry.username)}</div>` : ''}
    </div>
  `).join('');

  menu.querySelectorAll('.pm-menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const entryId = item.getAttribute('data-entry-id');
      const entry = entries.find(e => e.id === entryId);
      if (entry) {
        onSelect(entry);
        menu.remove();
      }
    });

    item.addEventListener('mouseenter', () => {
      (item as HTMLElement).style.background = '#f5f5f5';
    });

    item.addEventListener('mouseleave', () => {
      (item as HTMLElement).style.background = 'white';
    });
  });

  return menu;
}

/**
 * Автозаполнение формы
 */
function autofillForm(usernameField: HTMLInputElement | null, passwordField: HTMLInputElement, entry: VaultItemDecrypted): void {
  // Заполняем поле логина, если оно найдено и есть username в записи
  if (usernameField && entry.username) {
    // Устанавливаем значение
    usernameField.value = entry.username;
    
    // Вызываем события для фреймворков (React, Vue, Angular и т.д.)
    usernameField.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    usernameField.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    
    // Для React
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(usernameField, entry.username);
      usernameField.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Для других фреймворков
    usernameField.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    usernameField.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    
    console.log('[CONTENT] Username filled:', entry.username);
  } else if (usernameField) {
    console.log('[CONTENT] Username field found but no username in entry');
  } else {
    console.log('[CONTENT] Username field not found');
  }

  // Заполняем поле пароля
  passwordField.value = entry.password;
  
  // Вызываем события для фреймворков
  passwordField.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  passwordField.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  
  // Для React
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(passwordField, entry.password);
    passwordField.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  // Для других фреймворков
  passwordField.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
  passwordField.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  
  console.log('[CONTENT] Password filled');

  // Фокус на поле пароля
  passwordField.focus();
}

// Хранилище для отслеживания уже обработанных полей
const processedFields = new WeakSet<HTMLInputElement>();

/**
 * Вставка иконок автозаполнения
 */
async function injectAutofillIcons(): Promise<void> {
  // Удаляем только иконки, которые больше не нужны (меню удаляем отдельно)
  const existingIcons = document.querySelectorAll('.pm-autofill-icon');
  existingIcons.forEach(icon => {
    const field = (icon as HTMLElement).dataset.fieldId;
    if (!field || !document.getElementById(field)) {
      icon.remove();
    }
  });

  const forms = findFormFields();
  if (forms.length === 0) return;

  const domain = window.location.hostname;

  // Запрашиваем записи для текущего домена
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_ENTRIES_FOR_DOMAIN',
      domain,
    }) as MessageResponse;

    if (!response.success || !response.data) {
      return;
    }

    const entries = response.data as VaultItemDecrypted[];
    if (entries.length === 0) return;

    // Для каждой найденной формы создаем иконку
    for (const form of forms) {
      if (!form.passwordField) continue;

      // Пропускаем уже обработанные поля
      if (processedFields.has(form.passwordField)) {
        // Проверяем, есть ли уже иконка для этого поля
        const fieldId = form.passwordField.id || `pm-field-${Date.now()}`;
        if (!form.passwordField.id) {
          form.passwordField.id = fieldId;
        }
        const existingIcon = document.querySelector(`[data-field-id="${fieldId}"]`);
        if (existingIcon) continue;
      }

      // Проверяем, что поле видимо и в DOM
      const rect = form.passwordField.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || !form.passwordField.offsetParent) {
        continue;
      }

      // Создаем уникальный ID для поля, если его нет
      const fieldId = form.passwordField.id || `pm-field-${Date.now()}-${Math.random()}`;
      if (!form.passwordField.id) {
        form.passwordField.id = fieldId;
      }

      // Проверяем, не добавлена ли уже иконка для этого поля
      if (document.querySelector(`[data-field-id="${fieldId}"]`)) {
        continue;
      }

      const icon = createAutofillIcon(entries[0]);
      icon.dataset.fieldId = fieldId;
      
      // Используем fixed позиционирование относительно viewport
      const fieldRect = form.passwordField.getBoundingClientRect();
      icon.style.position = 'fixed';
      icon.style.right = `${window.innerWidth - fieldRect.right + 8}px`;
      icon.style.top = `${fieldRect.top + window.scrollY + (fieldRect.height / 2) - 12}px`;
      icon.style.left = 'auto';
      icon.style.pointerEvents = 'auto';
      
      document.body.appendChild(icon);

      // Отслеживаем скролл и ресайз для обновления позиции
      const updatePosition = () => {
        if (!form.passwordField || !document.body.contains(icon)) return;
        const rect = form.passwordField.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          icon.style.display = 'none';
          return;
        }
        icon.style.display = 'flex';
        icon.style.right = `${window.innerWidth - rect.right + 8}px`;
        icon.style.top = `${rect.top + window.scrollY + (rect.height / 2) - 12}px`;
      };

      // Обновляем позицию при скролле и ресайзе
      let scrollTimeout: number;
      const onScroll = () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = window.setTimeout(updatePosition, 10);
      };

      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', updatePosition, { passive: true });

      // Обработчик клика на иконку
      icon.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();

        // Удаляем старое меню
        document.querySelectorAll('.pm-autofill-menu').forEach(m => m.remove());

        // Создаем новое меню
        const menu = createDropdownMenu(entries, (entry) => {
          autofillForm(form.usernameField, form.passwordField!, entry);
        });

        // Позиционируем меню
        const iconRect = icon.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = `${iconRect.bottom + 4}px`;
        menu.style.left = `${iconRect.left}px`;

        document.body.appendChild(menu);

        // Закрываем меню при клике вне его
        const closeMenu = (e: MouseEvent) => {
          if (!menu.contains(e.target as Node) && !icon.contains(e.target as Node)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
          }
        };

        setTimeout(() => {
          document.addEventListener('click', closeMenu);
        }, 0);
      });

      processedFields.add(form.passwordField);
    }
  } catch (error) {
    console.error('[CONTENT] Error injecting autofill icons:', error);
  }
}

interface AutofillMessage {
  type: 'AUTOFILL';
  entryId: string;
  username: string;
  password: string;
}

/**
 * Обработка сообщений от popup
 */
chrome.runtime.onMessage.addListener((message: AutofillMessage, sender, sendResponse) => {
  if (message.type === 'AUTOFILL') {
    const forms = findFormFields();
    if (forms.length > 0) {
      const form = forms[0];
      if (form.passwordField) {
        autofillForm(form.usernameField, form.passwordField, {
          id: message.entryId,
          title: '',
          username: message.username,
          password: message.password,
        });
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Password field not found' });
      }
    } else {
      sendResponse({ success: false, error: 'No forms found' });
    }
    return true;
  }
});

/**
 * Экранирование HTML
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Инициализация: вставка иконок при загрузке и при изменениях DOM
 */
function init(): void {
  let injectTimeout: number;
  let lastInjectTime = 0;
  const DEBOUNCE_DELAY = 1000; // 1 секунда между вызовами
  const MIN_INTERVAL = 500; // Минимальный интервал между вызовами

  const debouncedInject = () => {
    const now = Date.now();
    const timeSinceLastInject = now - lastInjectTime;
    
    clearTimeout(injectTimeout);
    
    if (timeSinceLastInject < MIN_INTERVAL) {
      injectTimeout = window.setTimeout(() => {
        lastInjectTime = Date.now();
        injectAutofillIcons();
      }, MIN_INTERVAL - timeSinceLastInject);
    } else {
      injectTimeout = window.setTimeout(() => {
        lastInjectTime = Date.now();
        injectAutofillIcons();
      }, DEBOUNCE_DELAY);
    }
  };

  // Вставляем иконки при загрузке
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        lastInjectTime = Date.now();
        injectAutofillIcons();
      }, 1000);
    });
  } else {
    setTimeout(() => {
      lastInjectTime = Date.now();
      injectAutofillIcons();
    }, 1000);
  }

  // Отслеживаем изменения DOM (для SPA) с debounce
  const observer = new MutationObserver((mutations) => {
    // Игнорируем изменения, которые мы сами вносим
    let shouldUpdate = false;
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          // Обновляем только если добавлены input поля или формы
          if (el.tagName === 'INPUT' || el.tagName === 'FORM' || 
              el.querySelector('input[type="password"]') || 
              el.querySelector('input[type="email"]') ||
              el.querySelector('input[type="text"]')) {
            shouldUpdate = true;
            break;
          }
        }
      }
      if (shouldUpdate) break;
    }
    
    if (shouldUpdate) {
      debouncedInject();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false, // Не отслеживаем изменения атрибутов
  });
}

init();

