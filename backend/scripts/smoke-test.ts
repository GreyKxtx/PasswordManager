/**
 * Smoke тесты для проверки работоспособности бэкенда после рефакторинга
 * Запуск: tsx scripts/smoke-test.ts
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  response?: any;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (error: any) {
    results.push({ 
      name, 
      passed: false, 
      error: error.message,
      response: error.response 
    });
    console.error(`❌ ${name}: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Запуск smoke тестов для бэкенда...\n');

  // 1. Health Check
  await test('Health Check', async () => {
    const response = await fetch(`${BASE_URL}/health`);
    if (!response.ok) {
      throw new Error(`Expected 200, got ${response.status}`);
    }
    const data = await response.json();
    if (data.status !== 'ok') {
      throw new Error(`Expected status 'ok', got '${data.status}'`);
    }
    if (!data.timestamp) {
      throw new Error('Missing timestamp in response');
    }
  });

  // 2. Get Login Params (для несуществующего пользователя)
  await test('Get Login Params (несуществующий пользователь)', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/login/params?email=test@example.com`);
    if (!response.ok) {
      throw new Error(`Expected 200, got ${response.status}`);
    }
    const data = await response.json();
    if (!data.success || !data.data) {
      throw new Error('Invalid response format');
    }
    if (data.data.algorithm !== 'argon2id') {
      throw new Error('Invalid algorithm in response');
    }
  });

  // 3. Get Vault Items без токена (должен вернуть 401)
  await test('Get Vault Items без токена (401)', async () => {
    const response = await fetch(`${BASE_URL}/api/vault/items`);
    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
    const data = await response.json();
    if (data.success !== false || !data.error) {
      throw new Error('Invalid error response format');
    }
  });

  // 4. Get Vault Item с невалидным ID (должен вернуть 400)
  await test('Get Vault Item с невалидным ID (400)', async () => {
    const response = await fetch(`${BASE_URL}/api/vault/items/abracadabra`, {
      headers: {
        'Authorization': 'Bearer fake-token-for-test'
      }
    });
    // Может быть 400 (валидация) или 401 (невалидный токен)
    if (response.status !== 400 && response.status !== 401) {
      throw new Error(`Expected 400 or 401, got ${response.status}`);
    }
  });

  // 5. Невалидный JSON в теле запроса
  await test('Невалидный JSON в теле запроса (400)', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: '{"email": "test@example.com", "invalid": json here}'
    });
    // Express должен вернуть 400 для невалидного JSON
    if (response.status !== 400) {
      throw new Error(`Expected 400, got ${response.status}`);
    }
  });

  // 6. Валидация через Zod (невалидный email)
  await test('Валидация через Zod (невалидный email)', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'not-an-email',
        passwordVerifier: 'dGVzdA==',
        kdfParams: {
          algorithm: 'argon2id',
          memory: 19456,
          iterations: 2,
          parallelism: 1,
          salt: 'dGVzdA=='
        },
        vaultKeyEnc: 'dGVzdA==',
        vaultKeyEncIV: 'dGVzdA=='
      })
    });
    if (response.status !== 400) {
      throw new Error(`Expected 400, got ${response.status}`);
    }
    const data = await response.json();
    if (data.success !== false || !data.error || !data.details) {
      throw new Error('Invalid validation error response format');
    }
  });

  // Итоги
  console.log('\n📊 Результаты тестирования:');
  console.log(`Всего тестов: ${results.length}`);
  console.log(`Пройдено: ${results.filter(r => r.passed).length}`);
  console.log(`Провалено: ${results.filter(r => !r.passed).length}`);

  if (results.some(r => !r.passed)) {
    console.log('\n❌ Некоторые тесты провалились:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ Все тесты пройдены успешно!');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

