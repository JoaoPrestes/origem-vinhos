import { describe, it, expect } from 'bun:test';
import * as schema from '../../src/infra/schema';

describe('Orders Schema Integrity (Drizzle ORM)', () => {
  it('should export all required tables for Orders domain', () => {
    expect(schema.orders).toBeDefined();
    expect(schema.orderItems).toBeDefined();
    expect(schema.orderHistory).toBeDefined();
    expect(schema.orderIdempotency).toBeDefined();
    expect(schema.orderInboxEvents).toBeDefined();
  });
});
