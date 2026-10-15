import { describe, it, expect } from 'bun:test';
import * as schema from '../../src/infra/schema';

describe('Payment Schema Integrity (Drizzle ORM)', () => {
  it('should export all required tables for Payment domain', () => {
    expect((schema as any).paymentAttempts).toBeDefined();
    expect((schema as any).paymentHistory).toBeDefined();
    expect((schema as any).paymentOutbox).toBeDefined();
    expect((schema as any).paymentIdempotency).toBeDefined();
  });
});
