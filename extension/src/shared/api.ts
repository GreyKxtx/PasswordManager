import { KdfParams, LoginResponse, Login2FAResponse, VaultItemEncrypted, CreateVaultItemPayload, UpdateVaultItemPayload } from './types.js';

const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Получение KDF параметров для логина
 */
export async function getLoginParams(email: string): Promise<KdfParams> {
  const response = await fetch(`${API_BASE_URL}/auth/login/params?email=${encodeURIComponent(email)}`);
  
  if (!response.ok) {
    throw new Error(`Failed to get login params: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to get login params');
  }

  const kdfParams = data.data;
  
  // Проверяем, что salt валидный
  if (!kdfParams.salt || typeof kdfParams.salt !== 'string' || kdfParams.salt.length === 0) {
    throw new Error('Invalid salt received from server');
  }

  return kdfParams;
}

/**
 * Вход пользователя
 */
export async function login(
  email: string,
  passwordVerifier: string
): Promise<LoginResponse | Login2FAResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      passwordVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Login failed');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Login failed');
  }

  const responseData = data.data;

  // Если требуется 2FA, возвращаем сразу
  if ('require2FA' in responseData && responseData.require2FA) {
    return responseData;
  }

  // Проверяем, что для обычного логина есть все необходимые данные
  if (!responseData.vaultKeyEnc || !responseData.vaultKeyEncIV) {
    throw new Error('Server response missing required vault key data');
  }

  return responseData;
}

/**
 * Завершение логина с 2FA
 */
export async function verify2FA(tempToken: string, code: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/2fa/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tempToken,
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || '2FA verification failed');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '2FA verification failed');
  }

  return data.data;
}

/**
 * Получение всех записей vault
 */
export async function getVaultItems(accessToken: string): Promise<VaultItemEncrypted[]> {
  const response = await fetch(`${API_BASE_URL}/vault/items`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(`Failed to get vault items: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to get vault items');
  }

  return data.data;
}

/**
 * Обновление access token через refresh token
 */
export async function refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({ error: 'Unauthorized' }));
      const errorMessage = errorData.error || 'Unauthorized';
      
      // Проверяем, является ли это отозванной сессией
      if (errorMessage.includes('Session revoked') || errorMessage.includes('revoked')) {
        throw new Error('SESSION_REVOKED');
      }
      
      // Если refresh token истек
      if (errorMessage.includes('Refresh token expired') || errorMessage.includes('expired')) {
        throw new Error('REFRESH_TOKEN_EXPIRED');
      }
      
      throw new Error('Token refresh failed');
    }
    throw new Error('Token refresh failed');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Token refresh failed');
  }

  return data.data;
}

/**
 * Создание новой записи vault
 */
export async function createVaultItem(
  accessToken: string,
  payload: { title: string; username?: string; url?: string; tags?: string[]; encryptedData: string; iv: string; version: number }
): Promise<VaultItemEncrypted> {
  const response = await fetch(`${API_BASE_URL}/vault/items`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(`Failed to create vault item: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to create vault item');
  }

  return data.data;
}

/**
 * Обновление записи vault
 */
export async function updateVaultItem(
  accessToken: string,
  id: string,
  payload: { title?: string; username?: string; url?: string; tags?: string[]; encryptedData?: string; iv?: string; version?: number }
): Promise<VaultItemEncrypted> {
  const response = await fetch(`${API_BASE_URL}/vault/items/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(`Failed to update vault item: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to update vault item');
  }

  return data.data;
}

/**
 * Удаление записи vault
 */
export async function deleteVaultItem(accessToken: string, id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/vault/items/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(`Failed to delete vault item: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to delete vault item');
  }
}

