import { eq, asc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../infra/schema';
import type { PaymentOutboxRepositoryPort, OutboxRecord } from '../workers/payment-outbox.worker';

export class DrizzlePaymentOutboxRepository implements PaymentOutboxRepositoryPort {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  async findPending(limit: number = 20): Promise<OutboxRecord[]> {
    const rows = await this.db
      .select()
      .from(schema.paymentOutbox)
      .where(eq(schema.paymentOutbox.status, 'PENDING'))
      .orderBy(asc(schema.paymentOutbox.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      eventType: r.eventType,
      payload: r.payload,
      status: r.status,
      retryCount: r.retryCount,
      processedAt: r.processedAt,
    }));
  }

  async markProcessed(id: string): Promise<void> {
    await this.db
      .update(schema.paymentOutbox)
      .set({
        status: 'PROCESSED',
        processedAt: new Date(),
      })
      .where(eq(schema.paymentOutbox.id, id));
  }

  async incrementRetry(id: string, error: string): Promise<void> {
    const [row] = await this.db
      .select({ retryCount: schema.paymentOutbox.retryCount })
      .from(schema.paymentOutbox)
      .where(eq(schema.paymentOutbox.id, id));

    const nextCount = (row?.retryCount ?? 0) + 1;
    const newStatus = nextCount >= 5 ? 'FAILED' : 'PENDING';

    await this.db
      .update(schema.paymentOutbox)
      .set({
        retryCount: nextCount,
        status: newStatus,
      })
      .where(eq(schema.paymentOutbox.id, id));
  }
}
