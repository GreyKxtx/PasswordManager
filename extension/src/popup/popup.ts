import { Message, MessageResponse, VaultItemDecrypted } from '../shared/types';

// Элементы DOM
const loginScreen = document.getElementById('login-screen')!;
const twoFactorScreen = document.getElementById('two-factor-screen')!;
const unlockedScreen = document.getElementById('unlocked-screen')!;
const allEntriesScreen = document.getElementById('all-entries-screen')!;

const loginForm = document.getElementById('login-form') as HTMLFormElement;
const emailInput = document.getElementById('email') as HTMLInputElement;
const passwordInput = document.getElementById('password') as HTMLInputElement;
const loginBtn = document.getElementById('login-btn') as HTMLButtonElement;
const loginError = document.getElementById('login-error')!;

const twoFactorForm = document.getElementById('two-factor-form') as HTMLFormElement;
const twoFactorCodeInput = document.getElementById('two-factor-code') as HTMLInputElement;
const verify2FABtn = document.getElementById('verify-2fa-btn') as HTMLButtonElement;
const backToLoginBtn = document.getElementById('back-to-login-btn')!;
const twoFactorError = document.getElementById('two-factor-error')!;

const logoutBtn = document.getElementById('logout-btn')!;
const currentDomainEl = document.getElementById('current-domain')!;
const entriesList = document.getElementById('entries-list')!;
const allEntriesList = document.getElementById('all-entries-list')!;
const syncBtn = document.getElementById('sync-btn') as HTMLButtonElement;
const showAllBtn = document.getElementById('show-all-btn')!;
const backBtn = document.getElementById('back-btn')!;
const addItemBtn = document.getElementById('add-item-btn')!;
const addItemAllBtn = document.getElementById('add-item-all-btn')!;

// Элементы формы
const itemFormScreen = document.getElementById('item-form-screen')!;
const itemForm = document.getElementById('item-form') as HTMLFormElement;
const formTitle = document.getElementById('form-title')!;
const formBackBtn = document.getElementById('form-back-btn')!;
const formCancelBtn = document.getElementById('form-cancel-btn')!;
const formError = document.getElementById('form-error')!;
const itemTitleInput = document.getElementById('item-title') as HTMLInputElement;
const itemUsernameInput = document.getElementById('item-username') as HTMLInputElement;
const itemPasswordInput = document.getElementById('item-password') as HTMLInputElement;
const itemUrlInput = document.getElementById('item-url') as HTMLInputElement;
const itemNotesInput = document.getElementById('item-notes') as HTMLTextAreaElement;
const itemTagsInput = document.getElementById('item-tags') as HTMLInputElement;
const generatePasswordBtn = document.getElementById('generate-password-btn')!;
const togglePasswordBtn = document.getElementById('toggle-password-btn')!;

let editingItemId: string | null = null;

/**
 * Отправка сообщения в background
 */
function sendMessage(message: Message): Promise<MessageResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: MessageResponse) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Проверка авторизации при загрузке
 */
async function checkAuthOnLoad(): Promise<void> {
  try {
    // Принудительно проверяем авторизацию при каждом открытии popup
    const response = await sendMessage({ type: 'CHECK_AUTH' });
    if (response.success && response.data === true) {
      // Авторизация валидна, показываем разблокированный экран
      showUnlockedScreen();
      try {
        await loadCurrentDomainEntries();
      } catch (error) {
        console.error('Error loading entries:', error);
        // Если не удалось загрузить записи, возможно сессия отозвана
        // Проверяем авторизацию еще раз
        const recheckResponse = await sendMessage({ type: 'CHECK_AUTH' });
        if (!recheckResponse.success || !recheckResponse.data) {
          showLoginScreen();
          const errorEl = document.getElementById('login-error');
          if (errorEl) {
            errorEl.textContent = 'Сессия была завершена. Пожалуйста, войдите снова.';
            errorEl.style.display = 'block';
          }
        }
      }
    } else {
      // Авторизация невалидна или сессия отозвана
      showLoginScreen();
      if (response.error && response.error.includes('revoked')) {
        const errorEl = document.getElementById('login-error');
        if (errorEl) {
          errorEl.textContent = 'Сессия была завершена на другом устройстве. Пожалуйста, войдите снова.';
          errorEl.style.display = 'block';
        }
      }
    }
  } catch (error) {
    console.error('Auth check error:', error);
    showLoginScreen();
    // Показываем сообщение об ошибке
    const errorEl = document.getElementById('login-error');
    if (errorEl) {
      errorEl.textContent = 'Ошибка проверки авторизации. Пожалуйста, войдите снова.';
      errorEl.style.display = 'block';
    }
  }
}

/**
 * Слушатель сообщений от background script
 */
chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
  if (message.type === 'SESSION_REVOKED') {
    console.log('[POPUP] Received SESSION_REVOKED message');
    // Сессия была отозвана, показываем экран логина
    showLoginScreen();
    // Показываем уведомление пользователю
    const errorEl = document.getElementById('login-error');
    if (errorEl) {
      errorEl.textContent = 'Сессия была завершена на другом устройстве. Пожалуйста, войдите снова.';
      errorEl.style.display = 'block';
      errorEl.classList.add('show');
    }
    sendResponse({ success: true });
  }
  return true; // Сообщаем, что ответ будет отправлен асинхронно
});

/**
 * Показать экран логина
 */
function showLoginScreen(): void {
  console.log('[POPUP] Showing login screen');
  loginScreen.classList.remove('hidden');
  twoFactorScreen.classList.add('hidden');
  unlockedScreen.classList.add('hidden');
  allEntriesScreen.classList.add('hidden');
  // Очищаем поля ввода
  emailInput.value = '';
  passwordInput.value = '';
  // Скрываем ошибку, если она была показана ранее
  hideError();
}

/**
 * Показать экран 2FA
 */
function showTwoFactorScreen(): void {
  console.log('[POPUP] Showing 2FA screen');
  loginScreen.classList.add('hidden');
  twoFactorScreen.classList.remove('hidden');
  unlockedScreen.classList.add('hidden');
  allEntriesScreen.classList.add('hidden');
  // Очищаем поле ввода кода
  twoFactorCodeInput.value = '';
  hideTwoFactorError();
}

/**
 * Показать экран разблокирован
 */
function showUnlockedScreen(): void {
  loginScreen.classList.add('hidden');
  twoFactorScreen.classList.add('hidden');
  unlockedScreen.classList.remove('hidden');
  allEntriesScreen.classList.add('hidden');
}

/**
 * Показать экран всех записей
 */
function showAllEntriesScreen(): void {
  loginScreen.classList.add('hidden');
  twoFactorScreen.classList.add('hidden');
  unlockedScreen.classList.add('hidden');
  allEntriesScreen.classList.remove('hidden');
}

/**
 * Обработка логина
 */
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError('Заполните все поля');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Вход...';
  hideError();

  try {
    const response = await sendMessage({
      type: 'LOGIN',
      email,
      password,
    });

    if (response.success) {
      // Проверяем, требуется ли 2FA
      if (response.data && response.data.require2FA) {
        showTwoFactorScreen();
      } else {
        showUnlockedScreen();
        await loadCurrentDomainEntries();
      }
    } else {
      showError(response.error || 'Ошибка входа');
    }
  } catch (error: any) {
    showError(error.message || 'Ошибка входа');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Войти';
  }
});

/**
 * Обработка 2FA
 */
twoFactorForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const code = twoFactorCodeInput.value.trim();

  if (!code || !/^\d{6}$/.test(code)) {
    showTwoFactorError('Введите 6-значный код');
    return;
  }

  verify2FABtn.disabled = true;
  verify2FABtn.textContent = 'Проверка...';
  hideTwoFactorError();

  try {
    const response = await sendMessage({
      type: 'VERIFY_2FA',
      code,
    });

    if (response.success) {
      showUnlockedScreen();
      await loadCurrentDomainEntries();
    } else {
      showTwoFactorError(response.error || 'Неверный код');
    }
  } catch (error: any) {
    showTwoFactorError(error.message || 'Ошибка проверки кода');
  } finally {
    verify2FABtn.disabled = false;
    verify2FABtn.textContent = 'Подтвердить';
  }
});

/**
 * Назад к логину
 */
backToLoginBtn.addEventListener('click', () => {
  showLoginScreen();
});

/**
 * Выход
 */
logoutBtn.addEventListener('click', async () => {
  try {
    await sendMessage({ type: 'LOGOUT' });
    showLoginScreen();
    emailInput.value = '';
    passwordInput.value = '';
  } catch (error) {
    console.error('Logout error:', error);
  }
});

/**
 * Получение текущего домена активной вкладки
 */
async function getCurrentDomain(): Promise<string | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url) return null;
    
    const url = new URL(tab.url);
    return url.hostname;
  } catch {
    return null;
  }
}

/**
 * Загрузка записей для текущего домена
 */
async function loadCurrentDomainEntries(): Promise<void> {
  const domain = await getCurrentDomain();
  
  if (domain) {
    currentDomainEl.textContent = `Домен: ${domain}`;
    
    try {
      const response = await sendMessage({
        type: 'GET_ENTRIES_FOR_DOMAIN',
        domain,
      });

      if (response.success && response.data) {
        renderEntries(response.data as VaultItemDecrypted[], entriesList);
      } else {
        // Если получили ошибку "Not authenticated", значит сессия отозвана
        if (response.error && response.error.includes('Not authenticated')) {
          throw new Error('Session revoked');
        }
        entriesList.innerHTML = '<div class="empty-state">Нет записей для этого домена</div>';
      }
    } catch (error: any) {
      console.error('Load entries error:', error);
      // Если ошибка связана с авторизацией, пробрасываем дальше
      if (error.message && error.message.includes('Session revoked')) {
        throw error;
      }
      entriesList.innerHTML = '<div class="empty-state">Ошибка загрузки</div>';
    }
  } else {
    currentDomainEl.textContent = 'Не удалось определить домен';
    entriesList.innerHTML = '<div class="empty-state">Откройте веб-страницу</div>';
  }
}

/**
 * Загрузка всех записей
 */
async function loadAllEntries(): Promise<void> {
  try {
    const response = await sendMessage({ type: 'GET_ALL_ENTRIES' });

    if (response.success && response.data) {
      renderEntries(response.data as VaultItemDecrypted[], allEntriesList);
    } else {
      allEntriesList.innerHTML = '<div class="empty-state">Нет записей</div>';
    }
  } catch (error) {
    console.error('Load all entries error:', error);
    allEntriesList.innerHTML = '<div class="empty-state">Ошибка загрузки</div>';
  }
}

/**
 * Отрисовка списка записей
 */
function renderEntries(entries: VaultItemDecrypted[], container: HTMLElement): void {
  if (entries.length === 0) {
    container.innerHTML = '<div class="empty-state">Нет записей</div>';
    return;
  }

  container.innerHTML = entries.map(entry => {
    // Форматируем URL для отображения (обрезаем длинные URL)
    let displayUrl = entry.url || '';
    if (displayUrl.length > 40) {
      displayUrl = displayUrl.substring(0, 37) + '...';
    }
    
    return `
    <div class="entry-item" data-entry-id="${entry.id}">
      <div class="entry-header">
        <div class="entry-title">${escapeHtml(entry.title)}</div>
        ${entry.url ? `
          <a href="${escapeHtml(entry.url)}" target="_blank" rel="noopener noreferrer" class="entry-url" title="${escapeHtml(entry.url)}">
            ${escapeHtml(displayUrl)}
          </a>
        ` : ''}
      </div>
      ${entry.username ? `<div class="entry-username">${escapeHtml(entry.username)}</div>` : ''}
      <div class="entry-actions">
        <button class="autofill-btn" data-entry-id="${entry.id}">Автозаполнить</button>
        <button class="copy-password-btn" data-entry-id="${entry.id}">Копировать пароль</button>
        <button class="edit-btn" data-entry-id="${entry.id}">Редактировать</button>
        <button class="delete-btn" data-entry-id="${entry.id}">Удалить</button>
      </div>
    </div>
    `;
  }).join('');

  // Обработчики кнопок
  container.querySelectorAll('.autofill-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const entryId = (e.target as HTMLElement).dataset.entryId!;
      const entry = entries.find(e => e.id === entryId);
      if (entry) {
        await autofillEntry(entry);
      }
    });
  });

  container.querySelectorAll('.copy-password-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const entryId = (e.target as HTMLElement).dataset.entryId!;
      const entry = entries.find(e => e.id === entryId);
      if (entry) {
        await copyPassword(entry.password);
      }
    });
  });

  container.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const entryId = (e.target as HTMLElement).dataset.entryId!;
      const entry = entries.find(e => e.id === entryId);
      if (entry) {
        showItemForm(entry);
      }
    });
  });

  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const entryId = (e.target as HTMLElement).dataset.entryId!;
      if (confirm('Вы уверены, что хотите удалить эту запись?')) {
        await deleteItem(entryId);
      }
    });
  });
}

/**
 * Автозаполнение записи на текущей странице
 */
async function autofillEntry(entry: VaultItemDecrypted): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) return;

    await chrome.tabs.sendMessage(tab.id, {
      type: 'AUTOFILL',
      entryId: entry.id,
      username: entry.username || '',
      password: entry.password,
    });

    // Закрываем popup после автозаполнения
    window.close();
  } catch (error) {
    console.error('Autofill error:', error);
    alert('Ошибка автозаполнения. Убедитесь, что страница загружена.');
  }
}

/**
 * Копирование пароля в буфер обмена
 */
async function copyPassword(password: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(password);
    // Можно показать уведомление
    alert('Пароль скопирован');
  } catch (error) {
    console.error('Copy error:', error);
  }
}

/**
 * Синхронизация vault
 */
syncBtn.addEventListener('click', async () => {
  syncBtn.disabled = true;
  syncBtn.textContent = 'Синхронизация...';

  try {
    const response = await sendMessage({ type: 'SYNC_VAULT' });
    if (response.success) {
      await loadCurrentDomainEntries();
      syncBtn.textContent = 'Синхронизировано';
      setTimeout(() => {
        syncBtn.textContent = 'Синхронизировать';
      }, 2000);
    } else {
      alert('Ошибка синхронизации: ' + (response.error || 'Unknown error'));
    }
  } catch (error: any) {
    alert('Ошибка синхронизации: ' + error.message);
  } finally {
    syncBtn.disabled = false;
  }
});

/**
 * Показать все записи
 */
showAllBtn.addEventListener('click', async () => {
  showAllEntriesScreen();
  await loadAllEntries();
});

/**
 * Назад к домену
 */
backBtn.addEventListener('click', () => {
  showUnlockedScreen();
  loadCurrentDomainEntries();
});

/**
 * Показать ошибку
 */
function showError(message: string): void {
  loginError.textContent = message;
  loginError.style.display = 'block';
  loginError.classList.add('show');
}

/**
 * Скрыть ошибку
 */
function hideError(): void {
  loginError.classList.remove('show');
  loginError.style.display = 'none';
}

/**
 * Показать ошибку 2FA
 */
function showTwoFactorError(message: string): void {
  twoFactorError.textContent = message;
  twoFactorError.style.display = 'block';
  twoFactorError.classList.add('show');
}

/**
 * Скрыть ошибку 2FA
 */
function hideTwoFactorError(): void {
  twoFactorError.classList.remove('show');
  twoFactorError.style.display = 'none';
}

/**
 * Показать форму создания/редактирования
 */
function showItemForm(item?: VaultItemDecrypted): void {
  editingItemId = item ? item.id : null;
  formTitle.textContent = item ? 'Редактировать запись' : 'Новая запись';
  
  // Заполняем форму данными записи (если редактирование)
  if (item) {
    itemTitleInput.value = item.title || '';
    itemUsernameInput.value = item.username || '';
    itemPasswordInput.value = item.password || '';
    itemUrlInput.value = item.url || '';
    itemNotesInput.value = item.notes || '';
    itemTagsInput.value = item.tags ? item.tags.join(', ') : '';
  } else {
    // Очищаем форму для создания
    itemForm.reset();
  }
  
  hideFormError();
  itemFormScreen.classList.remove('hidden');
  unlockedScreen.classList.add('hidden');
  allEntriesScreen.classList.add('hidden');
}

/**
 * Скрыть форму
 */
function hideItemForm(): void {
  editingItemId = null;
  itemFormScreen.classList.add('hidden');
  // Возвращаемся к предыдущему экрану
  if (allEntriesScreen.classList.contains('hidden')) {
    showUnlockedScreen();
  } else {
    allEntriesScreen.classList.remove('hidden');
  }
}

/**
 * Генерация случайного пароля
 */
function generatePassword(): string {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const values = crypto.getRandomValues(new Uint8Array(length));
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[values[i] % charset.length];
  }
  return password;
}

/**
 * Создание или обновление записи
 */
async function saveItem(): Promise<void> {
  const title = itemTitleInput.value.trim();
  if (!title) {
    showFormError('Название обязательно');
    return;
  }

  const itemData: Partial<VaultItemDecrypted> = {
    title,
    username: itemUsernameInput.value.trim() || undefined,
    password: itemPasswordInput.value || undefined,
    url: itemUrlInput.value.trim() || undefined,
    notes: itemNotesInput.value.trim() || undefined,
    tags: itemTagsInput.value.trim()
      ? itemTagsInput.value.split(',').map(t => t.trim()).filter(t => t.length > 0)
      : undefined,
  };

  try {
    hideFormError();
    
    if (editingItemId) {
      // Обновление существующей записи
      const response = await sendMessage({
        type: 'UPDATE_ITEM',
        id: editingItemId,
        item: itemData,
      });
      
      if (response.success) {
        hideItemForm();
        // Перезагружаем записи
        if (allEntriesScreen.classList.contains('hidden')) {
          await loadCurrentDomainEntries();
        } else {
          await loadAllEntries();
        }
      } else {
        showFormError(response.error || 'Ошибка обновления записи');
      }
    } else {
      // Создание новой записи
      const response = await sendMessage({
        type: 'CREATE_ITEM',
        item: itemData,
      });
      
      if (response.success) {
        hideItemForm();
        // Перезагружаем записи
        if (allEntriesScreen.classList.contains('hidden')) {
          await loadCurrentDomainEntries();
        } else {
          await loadAllEntries();
        }
      } else {
        showFormError(response.error || 'Ошибка создания записи');
      }
    }
  } catch (error: any) {
    console.error('Save item error:', error);
    showFormError(error.message || 'Ошибка сохранения записи');
  }
}

/**
 * Удаление записи
 */
async function deleteItem(id: string): Promise<void> {
  try {
    const response = await sendMessage({
      type: 'DELETE_ITEM',
      id,
    });
    
    if (response.success) {
      // Перезагружаем записи
      if (allEntriesScreen.classList.contains('hidden')) {
        await loadCurrentDomainEntries();
      } else {
        await loadAllEntries();
      }
    } else {
      alert('Ошибка удаления: ' + (response.error || 'Unknown error'));
    }
  } catch (error: any) {
    console.error('Delete item error:', error);
    alert('Ошибка удаления: ' + error.message);
  }
}

/**
 * Показать ошибку формы
 */
function showFormError(message: string): void {
  formError.textContent = message;
  formError.style.display = 'block';
  formError.classList.add('show');
}

/**
 * Скрыть ошибку формы
 */
function hideFormError(): void {
  formError.classList.remove('show');
  formError.style.display = 'none';
}

/**
 * Экранирование HTML
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Создание новой записи
 */
addItemBtn.addEventListener('click', () => {
  showItemForm();
});

addItemAllBtn.addEventListener('click', () => {
  showItemForm();
});

/**
 * Обработчики формы
 */
formBackBtn.addEventListener('click', () => {
  hideItemForm();
});

formCancelBtn.addEventListener('click', () => {
  hideItemForm();
});

itemForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  await saveItem();
});

generatePasswordBtn.addEventListener('click', () => {
  itemPasswordInput.value = generatePassword();
  itemPasswordInput.type = 'text';
  togglePasswordBtn.textContent = 'Скрыть';
});

togglePasswordBtn.addEventListener('click', () => {
  if (itemPasswordInput.type === 'password') {
    itemPasswordInput.type = 'text';
    togglePasswordBtn.textContent = 'Скрыть';
  } else {
    itemPasswordInput.type = 'password';
    togglePasswordBtn.textContent = 'Показать';
  }
});

// Инициализация при загрузке
checkAuthOnLoad();

