import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { BunSqliteFtsAdapter } from '../../src/domains/catalog/adapters/bun-sqlite-fts.adapter';

describe('BunSqliteFtsAdapter (spec09 §6.2 & §10.3)', () => {
  let adapter: BunSqliteFtsAdapter;

  beforeEach(() => {
    // Banco em memória para execução limpa e ultra-rápida de testes
    adapter = new BunSqliteFtsAdapter(':memory:');
  });

  afterEach(() => {
    adapter.close();
  });

  it('should initialize tables and handle version control', async () => {
    expect(await adapter.getVersion('prod-unknown')).toBeNull();

    await adapter.upsertChunks('prod-1', 1, [
      { id: 'prod-1_identidade', type: 'identidade', content: 'Vinho Tinto Serra Malbec 2018' }
    ]);

    expect(await adapter.getVersion('prod-1')).toBe(1);
  });

  it('should perform lexical search with Portuguese prefix expansion (BDD Scenario 11)', async () => {
    await adapter.upsertChunks('prod-1', 1, [
      { id: 'prod-1_identidade', type: 'identidade', content: 'Vinho Tinto Serra Malbec, safra 2018' },
      { id: 'prod-1_sensorial', type: 'sensorial', content: 'Vinhos encorpados com taninos firmes e notas de carvalho' }
    ]);

    await adapter.upsertChunks('prod-2', 1, [
      { id: 'prod-2_identidade', type: 'identidade', content: 'Vinho Branco Brisa Sauvignon Blanc 2021' },
      { id: 'prod-2_sensorial', type: 'sensorial', content: 'Vinho leve, refrescante com notas cítricas' }
    ]);

    // Busca singular "encorpado" deve encontrar "encorpados" via expansão de prefixo "encorpad*"
    const results = await adapter.query('encorpado', 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.productId).toBe('prod-1');

    // Busca por termo do segundo vinho
    const whiteResults = await adapter.query('refrescante', 5);
    expect(whiteResults.length).toBeGreaterThan(0);
    expect(whiteResults[0]!.productId).toBe('prod-2');
  });

  it('should return empty results cleanly when search contains only stopwords', async () => {
    await adapter.upsertChunks('prod-1', 1, [
      { id: 'prod-1_identidade', type: 'identidade', content: 'Vinho Tinto Serra Malbec' }
    ]);

    const results = await adapter.query('de para com um os', 5);
    expect(results).toEqual([]);
  });

  it('should delete product chunks completely on deleteProductChunks', async () => {
    await adapter.upsertChunks('prod-1', 1, [
      { id: 'prod-1_identidade', type: 'identidade', content: 'Vinho Tinto Serra Malbec' }
    ]);

    await adapter.deleteProductChunks('prod-1');
    const results = await adapter.query('Malbec', 5);
    expect(results).toEqual([]);
  });

  it('should execute in-place table reconstruction safely without file deletion', async () => {
    await adapter.upsertChunks('prod-1', 1, [
      { id: 'prod-1_identidade', type: 'identidade', content: 'Vinho Tinto Serra Malbec' }
    ]);

    expect(await adapter.getVersion('prod-1')).toBe(1);

    await adapter.rebuildInPlace();

    expect(await adapter.getVersion('prod-1')).toBeNull();
    const results = await adapter.query('Malbec', 5);
    expect(results).toEqual([]);
  });
});
