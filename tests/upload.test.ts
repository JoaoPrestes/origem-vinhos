import { describe, test, expect } from 'bun:test';
import { handleFileUpload } from '../src/domains/catalog/upload.handlers';
import { IdentityHandlers } from '../src/domains/identity/identity.handlers';
import { db } from '../src/infra/db';
import { users } from '../src/infra/schema';

const identityHandlers = new IdentityHandlers();

describe('Upload Handler Unit & Integration Tests', () => {
  test('Deve rejeitar requisição de upload para usuário deslogado', async () => {
    const req = new Request('http://localhost:3000/api/upload', {
      method: 'POST',
    });

    const res = await handleFileUpload(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('Não autorizado');
  });

  test('Deve rejeitar upload se o usuário não for Admin', async () => {
    const email = `customer-${Date.now()}@test.com`;
    const password = 'Password123!';

    // Register
    await identityHandlers.register(new Request('http://localhost:3000/api/identity/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Cliente Teste', email, password, birthDate: '1990-01-01' }),
    }));

    // Login
    const loginRes = await identityHandlers.login(new Request('http://localhost:3000/api/identity/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }));

    const cookie = loginRes.headers.get('Set-Cookie')!;

    const req = new Request('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: { Cookie: cookie },
    });

    const res = await handleFileUpload(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Apenas administradores');

    // Limpeza
    await db.delete(users);
  });

  test('Deve realizar o upload de uma imagem válida enviado por um Admin', async () => {
    const email = `admin-${Date.now()}@test.com`;
    const password = 'Password123!';

    // Register
    await identityHandlers.register(new Request('http://localhost:3000/api/identity/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Admin Teste', email, password, birthDate: '1985-05-05' }),
    }));

    // Promove o usuário recém-criado para Admin no banco
    await db.update(users).set({ profile: 'Admin' });

    // Login
    const loginRes = await identityHandlers.login(new Request('http://localhost:3000/api/identity/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }));

    const cookie = loginRes.headers.get('Set-Cookie')!;

    // Cria um arquivo de imagem fictício em memória
    const fileContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG header
    const blob = new Blob([fileContent], { type: 'image/png' });
    const formData = new FormData();
    formData.append('image', blob, 'test-wine.png');

    const req = new Request('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: formData,
    });

    const res = await handleFileUpload(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.url).toContain('/uploads/wine-');
    expect(data.url).toContain('.png');

    // Limpeza
    await db.delete(users);
  });
});
