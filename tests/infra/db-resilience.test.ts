import { describe, it, expect } from 'bun:test';
import { db, connection } from '../../src/infra/db';

describe('Database Infrastructure Resilience (db.ts)', () => {
  it('should cleanly initialize db and connection instances', () => {
    expect(db).toBeDefined();
    expect(connection).toBeDefined();
    expect(typeof db.select).toBe('function');
  });

  it('should not throw on module import when DATABASE_URL is not explicitly set in test env', async () => {
    const dbModule = await import('../../src/infra/db');
    expect(dbModule.db).toBeDefined();
    expect(dbModule.connection).toBeDefined();
  });
});
