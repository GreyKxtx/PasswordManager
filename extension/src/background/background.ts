import { computePasswordVerifier, derivePasswordKey, decryptVaultKey, decryptSecret, encryptSecret, extractDomain, matchesDomain } from '../shared/crypto.js';
import { getLoginParams, login as apiLogin, verify2FA as apiVerify2FA, getVaultItems, refreshToken as apiRefreshToken, createVaultItem, updateVaultItem, deleteVaultItem } from '../shared/api.js';

// Локальные типы (не импортируем из types.js, так как он пустой после компиляции)
interface VaultItemDecrypted {
  id: string;
  title: string;
  username?: string;
  url?: string;
  tags?: string[];
  password: string;
  notes?: string;
}

interface VaultItemEncrypted {
  id: string;
  title: string;
  username?: string;
  url?: string;
  tags?: string[];
  encryptedData: string;
  iv: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

type Message =
  | { type: 'PING' }
  | { type: 'CHECK_AUTH' }
  | { type: 'LOGIN'; email: string; password: string }
  | { type: 'VERIFY_2FA'; code: string }
  | { type: 'LOGOUT' }
  | { type: 'GET_ENTRIES_FOR_DOMAIN'; domain: string }
  | { type: 'GET_ALL_ENTRIES' }
  | { type: 'SYNC_VAULT' }
  | { type: 'CREATE_ITEM'; item: Partial<VaultItemDecrypted> }
  | { type: 'UPDATE_ITEM'; id: string; item: Partial<VaultItemDecrypted> }
  | { type: 'DELETE_ITEM'; id: string };

type MessageResponse =
  | { success: true; data?: any; error?: string }
  | { success: false; error: string };

// Состояние расширения (хранится только в памяти)
interface ExtensionState {
  accessToken: string | null;
  refreshToken: string | null;
  vaultKey: CryptoKey | null;
  vaultItems: VaultItemDecrypted[];
  domainIndex: Record<string, VaultItemDecrypted[]>; // domain -> entries[]
  tempToken2FA: string | null; // Временный токен для 2FA
  passwordKeyFor2FA: CryptoKey | null; // passwordKey для расшифровки vaultKey после 2FA
}

let state: ExtensionState = {
  accessToken: null,
  refreshToken: null,
  vaultKey: null,
  vaultItems: [],
  domainIndex: {},
  tempToken2FA: null,
  passwordKeyFor2FA: null,
};

/**
 * Инициализация: загрузка токенов из storage (но НЕ vaultKey - он только в памяти)
 */
async function initialize(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['accessToken', 'refreshToken']);
    if (result.accessToken && result.refreshToken) {
      state.accessToken = result.accessToken;
      state.refreshToken = result.refreshToken;
      // Проверяем, что токены валидны (это обнаружит отозванные сессии)
      const isAuth = await checkAuth();
      if (!isAuth) {
        console.log('[BACKGROUND] Session invalid or revoked during initialization');
      }
    }
  } catch (error) {
    console.error('[BACKGROUND] Initialization error:', error);
  }
}

// Инициализация будет вызвана в конце файла

/**
 * Проверка авторизации
 */
async function checkAuth(): Promise<boolean> {
  if (!state.accessToken || !state.refreshToken) {
    console.log('[BACKGROUND] No tokens found');
    return false;
  }

  try {
    // Пробуем получить vault items - если токен валиден, запрос пройдет
    // Это реальный запрос к серверу, который проверит валидность сессии
    console.log('[BACKGROUND] Checking auth by fetching vault items...');
    await getVaultItems(state.accessToken);
    console.log('[BACKGROUND] Auth check successful - session is valid');
    return true;
  } catch (error: any) {
    console.log('[BACKGROUND] Auth check failed:', error.message);
    // Токен истек или сессия отозвана, пробуем обновить
    if (error.message === 'UNAUTHORIZED') {
      console.log('[BACKGROUND] Token expired or session revoked, trying to refresh...');
      try {
        const tokens = await apiRefreshToken(state.refreshToken);
        console.log('[BACKGROUND] Token refreshed successfully');
        state.accessToken = tokens.accessToken;
        state.refreshToken = tokens.refreshToken;
        await saveTokens();
        return true;
      } catch (refreshError: any) {
        console.log('[BACKGROUND] Token refresh failed:', refreshError.message);
        
        // Если refresh token истек - это нормальная ситуация, нужен новый логин
        // Но это не отозванная сессия, просто истек срок действия
        if (refreshError.message === 'REFRESH_TOKEN_EXPIRED') {
          console.log('[BACKGROUND] Refresh token expired - need new login');
          await performLogout();
          // Не отправляем SESSION_REVOKED, так как это просто истекший токен
          return false;
        }
        
        // Если refresh не прошел из-за отозванной сессии
        if (refreshError.message === 'SESSION_REVOKED') {
          console.log('[BACKGROUND] Session revoked, logging out...');
          await performLogout();
          // Уведомляем popup о необходимости перелогиниться
          notifyPopupOfLogout();
          return false;
        }
        
        // Другие ошибки (Invalid token и т.д.) - нужен новый логин
        console.log('[BACKGROUND] Refresh failed, logging out...');
        await performLogout();
        // Уведомляем popup
        notifyPopupOfLogout();
        return false;
      }
    }
    // Другие ошибки
    console.log('[BACKGROUND] Other error, logging out...');
    await performLogout();
    return false;
  }
}

/**
 * Сохранение токенов в storage
 */
async function saveTokens(): Promise<void> {
  await chrome.storage.local.set({
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
  });
}

/**
 * Логин пользователя
 */
async function performLogin(email: string, password: string): Promise<{ require2FA?: boolean; tempToken?: string }> {
  try {
    // 1. Получаем KDF параметры
    const kdfParams = await getLoginParams(email);
    
    // Проверяем, что salt не пустой
    // Если salt пустой, это означает, что пользователь не найден в базе данных
    if (!kdfParams || !kdfParams.salt || kdfParams.salt.length === 0) {
      console.error('[BACKGROUND] Invalid KDF params received (user not found):', kdfParams);
      throw new Error('Пользователь с таким email не найден. Проверьте правильность email или зарегистрируйтесь.');
    }

    // 2. Вычисляем passwordVerifier
    const passwordVerifier = await computePasswordVerifier(password, kdfParams);

    // 3. Выполняем логин
    const loginResponse = await apiLogin(email, passwordVerifier);

    // 4. Проверяем, требуется ли 2FA
    if ('require2FA' in loginResponse && loginResponse.require2FA) {
      // Сохраняем tempToken и вычисляем passwordKey для последующего использования
      state.tempToken2FA = loginResponse.tempToken;
      state.passwordKeyFor2FA = await derivePasswordKey(password, kdfParams);
      return { require2FA: true, tempToken: loginResponse.tempToken };
    }

    // 5. Обычный логин без 2FA
    const loginData = loginResponse as any; // LoginResponse

    // Проверяем, что у нас есть необходимые данные
    if (!loginData.vaultKeyEnc || !loginData.vaultKeyEncIV) {
      throw new Error('Missing vaultKeyEnc or vaultKeyEncIV in login response');
    }

    // 6. Сохраняем токены
    state.accessToken = loginData.accessToken;
    state.refreshToken = loginData.refreshToken;
    await saveTokens();

    // 7. Вычисляем passwordKey
    const passwordKey = await derivePasswordKey(password, kdfParams);

    // 8. Расшифровываем vaultKey
    state.vaultKey = await decryptVaultKey(
      loginData.vaultKeyEnc,
      loginData.vaultKeyEncIV,
      passwordKey
    );

    // 9. Синхронизируем vault
    await syncVault();

    return {};
  } catch (error) {
    console.error('[BACKGROUND] Login error:', error);
    throw error;
  }
}

/**
 * Завершение логина с 2FA
 */
async function performVerify2FA(code: string): Promise<void> {
  try {
    if (!state.tempToken2FA || !state.passwordKeyFor2FA) {
      throw new Error('2FA session not found. Please login again.');
    }

    // 1. Верифицируем 2FA код
    const loginResponse = await apiVerify2FA(state.tempToken2FA, code);

    // 2. Сохраняем токены
    state.accessToken = loginResponse.accessToken;
    state.refreshToken = loginResponse.refreshToken;
    await saveTokens();

    // 3. Расшифровываем vaultKey используя сохраненный passwordKey
    state.vaultKey = await decryptVaultKey(
      loginResponse.vaultKeyEnc,
      loginResponse.vaultKeyEncIV,
      state.passwordKeyFor2FA
    );

    // 4. Очищаем временные данные 2FA
    state.tempToken2FA = null;
    state.passwordKeyFor2FA = null;

    // 5. Синхронизируем vault
    await syncVault();
  } catch (error) {
    console.error('[BACKGROUND] 2FA verification error:', error);
    // Очищаем временные данные при ошибке
    state.tempToken2FA = null;
    state.passwordKeyFor2FA = null;
    throw error;
  }
}

/**
 * Выход из системы
 */
async function performLogout(): Promise<void> {
  state.accessToken = null;
  state.refreshToken = null;
  state.vaultKey = null;
  state.vaultItems = [];
  state.domainIndex = {};
  state.tempToken2FA = null;
  state.passwordKeyFor2FA = null;

  await chrome.storage.local.remove(['accessToken', 'refreshToken']);
  console.log('[BACKGROUND] Logout successful');
}

/**
 * Уведомление popup о необходимости перелогиниться
 */
function notifyPopupOfLogout(): void {
  console.log('[BACKGROUND] Notifying popup about logout...');
  // Отправляем сообщение всем popup окнам
  chrome.runtime.sendMessage({ type: 'SESSION_REVOKED' }).catch(() => {
    // Игнорируем ошибки, если popup не открыт
    console.log('[BACKGROUND] Popup not open, message not sent');
  });
}

/**
 * Синхронизация vault с сервера
 */
async function syncVault(): Promise<void> {
  if (!state.accessToken || !state.vaultKey) {
    throw new Error('Not authenticated');
  }

  try {
    // Получаем зашифрованные записи
    const encryptedItems: VaultItemEncrypted[] = await getVaultItems(state.accessToken);

    // Расшифровываем каждую запись
    const decryptedItems: VaultItemDecrypted[] = [];

    for (const item of encryptedItems) {
      try {
        // Расшифровываем секретные данные
        const secretData = await decryptSecret(
          state.vaultKey!,
          item.encryptedData,
          item.iv
        );

        decryptedItems.push({
          id: item.id,
          title: item.title,
          username: item.username,
          url: item.url,
          tags: item.tags,
          password: secretData.password,
          notes: secretData.notes,
        });
      } catch (error) {
        console.error(`[BACKGROUND] Failed to decrypt item ${item.id}:`, error);
      }
    }

    // Обновляем состояние
    state.vaultItems = decryptedItems;

    // Строим индекс по доменам
    rebuildDomainIndex();

    console.log(`[BACKGROUND] Vault synced: ${decryptedItems.length} items`);
  } catch (error: any) {
    console.error('[BACKGROUND] Sync vault error:', error);
    // Если получили 401, проверяем авторизацию
    if (error.message === 'UNAUTHORIZED') {
      const isAuth = await checkAuth();
      if (!isAuth) {
        throw new Error('Session revoked');
      }
      // Если авторизация восстановлена, повторяем синхронизацию
      return syncVault();
    }
    throw error;
  }
}

/**
 * Перестроение индекса доменов
 */
function rebuildDomainIndex(): void {
  state.domainIndex = {};
  for (const item of state.vaultItems) {
    if (item.url) {
      const domain = extractDomain(item.url);
      if (!state.domainIndex[domain]) {
        state.domainIndex[domain] = [];
      }
      state.domainIndex[domain].push(item);
    }
  }
}

/**
 * Добавление элемента в индекс доменов
 */
function addItemToDomainIndex(item: VaultItemDecrypted): void {
  if (item.url) {
    const domain = extractDomain(item.url);
    if (!state.domainIndex[domain]) {
      state.domainIndex[domain] = [];
    }
    state.domainIndex[domain].push(item);
  }
}

/**
 * Удаление элемента из индекса доменов
 */
function removeItemFromDomainIndex(itemId: string, url?: string): void {
  if (url) {
    const domain = extractDomain(url);
    if (state.domainIndex[domain]) {
      state.domainIndex[domain] = state.domainIndex[domain].filter(item => item.id !== itemId);
      if (state.domainIndex[domain].length === 0) {
        delete state.domainIndex[domain];
      }
    }
  }
}

/**
 * Получение записей для домена
 */
function getEntriesForDomain(domain: string): VaultItemDecrypted[] {
  const entries: VaultItemDecrypted[] = [];

  for (const item of state.vaultItems) {
    if (matchesDomain(item.url, domain)) {
      entries.push(item);
    }
  }

  return entries;
}

/**
 * Получение всех записей
 */
function getAllEntries(): VaultItemDecrypted[] {
  return [...state.vaultItems];
}

/**
 * Проверка авторизации с отправкой ответа об ошибке
 * @param sendResponse - функция для отправки ответа
 * @param requireVaultKey - требуется ли наличие vaultKey (по умолчанию true)
 * @returns true если авторизован, false если нет (ответ уже отправлен)
 */
async function requireAuth(
  sendResponse: (response: MessageResponse) => void,
  requireVaultKey: boolean = true
): Promise<boolean> {
  const isAuth = await checkAuth();
  if (!isAuth || (requireVaultKey && !state.vaultKey)) {
    sendResponse({ success: false, error: 'Not authenticated' });
    return false;
  }
  return true;
}

/**
 * Обработчик сообщений от popup и content scripts
 */
chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse: (response: MessageResponse) => void) => {
    // Асинхронная обработка
    (async () => {
      try {
        switch (message.type) {
          case 'PING':
            sendResponse({ success: true, data: 'pong' });
            break;

          case 'CHECK_AUTH':
            const isAuth = await checkAuth();
            // Если авторизация невалидна, возвращаем false с информацией об ошибке
            if (!isAuth) {
              sendResponse({ 
                success: true, 
                data: false,
                error: state.accessToken ? 'Session revoked or expired' : 'Not authenticated'
              });
            } else {
              sendResponse({ success: true, data: true });
            }
            break;

          case 'LOGIN':
            const loginResult = await performLogin(message.email, message.password);
            if (loginResult.require2FA) {
              sendResponse({ success: true, data: { require2FA: true, tempToken: loginResult.tempToken } });
            } else {
              sendResponse({ success: true });
            }
            break;

          case 'VERIFY_2FA':
            await performVerify2FA(message.code);
            sendResponse({ success: true });
            break;

          case 'LOGOUT':
            await performLogout();
            sendResponse({ success: true });
            break;

          case 'GET_ENTRIES_FOR_DOMAIN':
            if (!(await requireAuth(sendResponse))) {
              return;
            }
            const domainEntries = getEntriesForDomain(message.domain);
            sendResponse({ success: true, data: domainEntries });
            break;

          case 'GET_ALL_ENTRIES':
            if (!(await requireAuth(sendResponse))) {
              return;
            }
            const allEntries = getAllEntries();
            sendResponse({ success: true, data: allEntries });
            break;

          case 'SYNC_VAULT':
            if (!(await requireAuth(sendResponse, false))) {
              return;
            }
            await syncVault();
            sendResponse({ success: true });
            break;

          case 'CREATE_ITEM':
            if (!(await requireAuth(sendResponse))) {
              return;
            }
            try {
              // Шифруем секретные данные
              const secretData = {
                password: message.item.password || '',
                notes: message.item.notes,
              };
              const encrypted = await encryptSecret(state.vaultKey!, secretData);
              
              // Создаем запись на сервере
              const createdItem = await createVaultItem(state.accessToken!, {
                title: message.item.title || '',
                username: message.item.username,
                url: message.item.url,
                tags: message.item.tags,
                encryptedData: encrypted.encryptedData,
                iv: encrypted.iv,
                version: 1,
              });
              
              // Расшифровываем для кэша
              const decryptedSecret = await decryptSecret(state.vaultKey!, createdItem.encryptedData, createdItem.iv);
              const decryptedItem: VaultItemDecrypted = {
                id: createdItem.id,
                title: createdItem.title,
                username: createdItem.username,
                url: createdItem.url,
                tags: createdItem.tags,
                password: decryptedSecret.password,
                notes: decryptedSecret.notes,
              };
              
              // Обновляем кэш
              state.vaultItems.push(decryptedItem);
              addItemToDomainIndex(decryptedItem);
              
              sendResponse({ success: true, data: decryptedItem });
            } catch (error: any) {
              console.error('[BACKGROUND] Create item error:', error);
              sendResponse({ success: false, error: error.message || 'Failed to create item' });
            }
            break;

          case 'UPDATE_ITEM':
            if (!(await requireAuth(sendResponse))) {
              return;
            }
            try {
              // Находим существующую запись
              const existingItem = state.vaultItems.find(item => item.id === message.id);
              if (!existingItem) {
                sendResponse({ success: false, error: 'Item not found' });
                return;
              }
              
              // Объединяем существующие данные с новыми
              const updatedData: Partial<VaultItemDecrypted> = {
                ...existingItem,
                ...message.item,
              };
              
              // Шифруем секретные данные (если они изменились)
              let encryptedData: string | undefined = undefined;
              let iv: string | undefined = undefined;
              
              if (message.item.password !== undefined || message.item.notes !== undefined) {
                const secretData = {
                  password: updatedData.password || '',
                  notes: updatedData.notes,
                };
                const encrypted = await encryptSecret(state.vaultKey!, secretData);
                encryptedData = encrypted.encryptedData;
                iv = encrypted.iv;
              }
              
              // Обновляем запись на сервере
              const payload: any = {};
              if (message.item.title !== undefined) payload.title = updatedData.title;
              if (message.item.username !== undefined) payload.username = updatedData.username;
              if (message.item.url !== undefined) payload.url = updatedData.url;
              if (message.item.tags !== undefined) payload.tags = updatedData.tags;
              if (encryptedData) payload.encryptedData = encryptedData;
              if (iv) payload.iv = iv;
              
              const updatedItem = await updateVaultItem(state.accessToken!, message.id, payload);
              
              // Расшифровываем для кэша
              const decryptedSecret = await decryptSecret(state.vaultKey!, updatedItem.encryptedData, updatedItem.iv);
              const decryptedUpdatedItem: VaultItemDecrypted = {
                id: updatedItem.id,
                title: updatedItem.title,
                username: updatedItem.username,
                url: updatedItem.url,
                tags: updatedItem.tags,
                password: decryptedSecret.password,
                notes: decryptedSecret.notes,
              };
              
              // Обновляем кэш
              const index = state.vaultItems.findIndex(item => item.id === message.id);
              if (index !== -1) {
                const oldItem = state.vaultItems[index];
                state.vaultItems[index] = decryptedUpdatedItem;
                
                // Обновляем индекс доменов только если URL изменился
                if (oldItem.url !== decryptedUpdatedItem.url) {
                  removeItemFromDomainIndex(message.id, oldItem.url);
                  addItemToDomainIndex(decryptedUpdatedItem);
                }
              }
              
              sendResponse({ success: true, data: decryptedUpdatedItem });
            } catch (error: any) {
              console.error('[BACKGROUND] Update item error:', error);
              sendResponse({ success: false, error: error.message || 'Failed to update item' });
            }
            break;

          case 'DELETE_ITEM':
            if (!(await requireAuth(sendResponse, false))) {
              return;
            }
            try {
              // Удаляем запись на сервере
              await deleteVaultItem(state.accessToken!, message.id);
              
              // Удаляем из кэша
              const itemToDelete = state.vaultItems.find(item => item.id === message.id);
              state.vaultItems = state.vaultItems.filter(item => item.id !== message.id);
              
              // Удаляем из индекса доменов
              if (itemToDelete) {
                removeItemFromDomainIndex(message.id, itemToDelete.url);
              }
              
              sendResponse({ success: true });
            } catch (error: any) {
              console.error('[BACKGROUND] Delete item error:', error);
              sendResponse({ success: false, error: error.message || 'Failed to delete item' });
            }
            break;

          default:
            sendResponse({ success: false, error: 'Unknown message type' });
        }
      } catch (error: any) {
        console.error('[BACKGROUND] Message handler error:', error);
        sendResponse({ success: false, error: error.message || 'Unknown error' });
      }
    })();

    // Возвращаем true для асинхронного ответа
    return true;
  }
);

// Инициализация при запуске
initialize().catch(console.error);

