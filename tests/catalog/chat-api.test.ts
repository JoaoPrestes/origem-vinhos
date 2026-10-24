import { describe, it, expect } from 'bun:test';
import app from '../../src/index';

describe('Chat API Endpoint (POST /api/chat - spec09 §8.1)', () => {
  it('should return 400 when message is missing or invalid', async () => {
    const req = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('should return 200 with sommelier response format for greeting', async () => {
    const req = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Olá, boa noite!',
        history: [],
      }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reply).toBeDefined();
    expect(Array.isArray(data.recommendedProducts)).toBe(true);
    expect(data.metadata).toBeDefined();
    expect(data.metadata.requestId).toBeDefined();
  }, 15000);
});
