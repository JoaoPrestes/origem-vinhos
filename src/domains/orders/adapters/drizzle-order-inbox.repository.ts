import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../infra/schema';

export class DrizzleOrderInboxRepository {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  async hasEvent(eventId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: schema.orderInboxEvents.id })
      .from(schema.orderInboxEvents)
      .where(eq(schema.orderInboxEvents.eventId, eventId))
      .limit(1);

    return Boolean(row);
  }

  async recordEvent(
    eventId: string,
    orderId: string,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    await this.db
      .insert(schema.orderInboxEvents)
      .values({
        eventId,
        eventType: 'PAYMENT_CONFIRMED',
        orderId,
        status,
        errorMessage: errorMessage ?? null,
      })
      .onConflictDoNothing();
  }
}
