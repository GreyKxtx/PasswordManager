import { KdfParams, LoginResponse, VaultItemEncrypted, CreateVaultItemPayload, UpdateVaultItemPayload } from './types.js';

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

  return data.data;
}

/**
 * Вход пользователя
 */
export async function login(
  email: string,
  passwordVerifier: string
): Promise<LoginResponse> {
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

  return data.data;
}

/**
 * Получение всех записей vault
 */
export async function getVaultItems(accessToken: string): Promise<VaultItemEncrypted[]> {
  console.log('[API] Fetching vault items with token...');
  const response = await fetch(`${API_BASE_URL}/vault/items`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  console.log('[API] Vault items response status:', response.status);

  if (!response.ok) {
    if (response.status === 401) {
      // 401 может означать либо истекший токен, либо отозванную сессию
      console.log('[API] Got 401 Unauthorized - token expired or session revoked');
      const error = await response.json().catch(() => ({ error: 'Unauthorized' }));
      // Если это явно отозванная сессия, бросаем специальную ошибку
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(`Failed to get vault items: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to get vault items');
  }

  console.log('[API] Vault items fetched successfully');
  return data.data;
}

/**
 * Обновление access token через refresh token
 */
export async function refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  console.log('[API] Refreshing token...');
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  console.log('[API] Refresh token response status:', response.status);

  if (!response.ok) {
    // Если получили 401, проверяем причину
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({ error: 'Unauthorized' }));
      const errorMessage = errorData.error || 'Unauthorized';
      console.log('[API] Got 401 on refresh - error:', errorMessage);
      
      // Проверяем, является ли это отозванной сессией
      if (errorMessage.includes('Session revoked') || errorMessage.includes('revoked')) {
        console.log('[API] Session revoked detected');
        throw new Error('SESSION_REVOKED');
      }
      
      // Если refresh token истек - это нормальная ситуация, нужен новый логин
      // Но это не отозванная сессия, просто истек срок действия
      if (errorMessage.includes('Refresh token expired') || errorMessage.includes('expired')) {
        console.log('[API] Refresh token expired - need new login');
        throw new Error('REFRESH_TOKEN_EXPIRED');
      }
      
      // Другие ошибки (Invalid refresh token и т.д.)
      console.log('[API] Token refresh failed:', errorMessage);
      throw new Error('Token refresh failed');
    }
    throw new Error('Token refresh failed');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Token refresh failed');
  }

  console.log('[API] Token refreshed successfully');
  return data.data;
}

/**
 * Создание новой записи vault
 */
export async function createVaultItem(
  accessToken: string,
  payload: { title: string; username?: string; url?: string; tags?: string[]; encryptedData: string; iv: string; version: number }
): Promise<VaultItemEncrypted> {
  console.log('[API] Creating vault item...');
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

  console.log('[API] Vault item created successfully');
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
  console.log('[API] Updating vault item:', id);
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

  console.log('[API] Vault item updated successfully');
  return data.data;
}

/**
 * Удаление записи vault
 */
export async function deleteVaultItem(accessToken: string, id: string): Promise<void> {
  console.log('[API] Deleting vault item:', id);
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

  console.log('[API] Vault item deleted successfully');
}

