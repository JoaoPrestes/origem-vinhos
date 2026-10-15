import { and, eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../infra/schema';
import type { OrderCartCleanerPort } from '../ports/order-cart-cleaner.port';

export class DrizzleOrderCartCleanerAdapter implements OrderCartCleanerPort {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  async removePaidItemsByCartItemIds(userId: string, cartItemIds: string[]): Promise<void> {
    if (!cartItemIds || cartItemIds.length === 0) return;

    await this.db
      .delete(schema.cartItems)
      .where(
        and(
          eq(schema.cartItems.userId, userId),
          inArray(schema.cartItems.id, cartItemIds)
        )
      );
  }
}
