import { db } from '../../../infra/db';
import { orders, orderItems, orderHistory, orderIdempotency } from '../../../infra/schema';
import { eq, and, desc } from 'drizzle-orm';
import { Order, type OrderStatus } from '../domain/order.entity';
import type {
  OrderRepositoryPort,
  OrderItemSnapshot,
  OrderIdempotencyRecord,
} from '../ports/order-repository.port';

export class DrizzleOrderRepository implements OrderRepositoryPort {
  async saveWithSnapshot(params: {
    order: Order;
    items: OrderItemSnapshot[];
    historyReason: string;
    idempotency?: OrderIdempotencyRecord;
  }): Promise<Order> {
    const { order, items, historyReason, idempotency } = params;

    return await db.transaction(async (tx) => {
      // 1. Insere o pedido
      await tx.insert(orders).values({
        id: order.id,
        displayCode: order.displayCode,
        userId: order.userId,
        status: order.status,
        totalCents: order.totalCents,
        itemsCount: order.itemsCount,
        currency: order.currency,
        shippingRecipientName: order.shippingRecipientName,
        shippingZipCode: order.shippingZipCode,
        shippingStreet: order.shippingStreet,
        shippingNumber: order.shippingNumber,
        shippingComplement: order.shippingComplement,
        shippingNeighborhood: order.shippingNeighborhood,
        shippingCity: order.shippingCity,
        shippingState: order.shippingState,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      });

      // 2. Insere os itens com snapshot congelado
      for (const item of items) {
        await tx.insert(orderItems).values({
          orderId: order.id,
          productId: item.productId,
          cartItemId: item.cartItemId,
          productName: item.productName,
          productImage: item.productImage,
          productType: item.productType,
          productGrape: item.productGrape,
          productHarvest: item.productHarvest,
          unitPriceCents: item.unitPriceCents,
          quantity: item.quantity,
          subtotalCents: item.subtotalCents,
          createdAt: item.createdAt ?? new Date(),
        });
      }

      // 3. Insere a entrada inicial de auditoria
      await tx.insert(orderHistory).values({
        orderId: order.id,
        recordType: 'STATE_TRANSITION',
        fromStatus: null,
        toStatus: order.status,
        reason: historyReason,
        createdByUserId: order.userId,
        createdAt: new Date(),
      });

      // 4. Se houver registro de idempotência em transação, atualiza para COMPLETED
      if (idempotency) {
        await tx
          .update(orderIdempotency)
          .set({
            status: 'COMPLETED',
            orderId: order.id,
          })
          .where(
            and(
              eq(orderIdempotency.idempotencyKey, idempotency.idempotencyKey),
              eq(orderIdempotency.userId, idempotency.userId)
            )
          );
      }

      return order;
    });
  }

  async findById(id: string): Promise<Order | null> {
    const result = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!result[0]) return null;

    return this.mapToDomain(result[0]);
  }

  async findByDisplayCode(displayCode: string): Promise<Order | null> {
    const result = await db
      .select()
      .from(orders)
      .where(eq(orders.displayCode, displayCode))
      .limit(1);

    if (!result[0]) return null;

    return this.mapToDomain(result[0]);
  }

  async listByUser(userId: string): Promise<Order[]> {
    const results = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));

    return results.map((row) => this.mapToDomain(row));
  }

  async updateStatus(
    id: string,
    fromStatus: OrderStatus,
    toStatus: OrderStatus,
    reason: string
  ): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const updated = await tx
        .update(orders)
        .set({
          status: toStatus,
          updatedAt: new Date(),
        })
        .where(and(eq(orders.id, id), eq(orders.status, fromStatus)))
        .returning();

      if (!updated[0]) return false;

      await tx.insert(orderHistory).values({
        orderId: id,
        recordType: 'STATE_TRANSITION',
        fromStatus,
        toStatus,
        reason,
        createdAt: new Date(),
      });

      return true;
    });
  }

  async findIdempotency(key: string, userId: string): Promise<OrderIdempotencyRecord | null> {
    const result = await db
      .select()
      .from(orderIdempotency)
      .where(
        and(
          eq(orderIdempotency.idempotencyKey, key),
          eq(orderIdempotency.userId, userId)
        )
      )
      .limit(1);

    if (!result[0]) return null;

    return {
      idempotencyKey: result[0].idempotencyKey,
      userId: result[0].userId,
      requestHash: result[0].requestHash,
      status: result[0].status,
      orderId: result[0].orderId,
      expiresAt: result[0].expiresAt,
      createdAt: result[0].createdAt,
    };
  }

  async saveIdempotency(record: OrderIdempotencyRecord): Promise<void> {
    await db.insert(orderIdempotency).values({
      idempotencyKey: record.idempotencyKey,
      userId: record.userId,
      requestHash: record.requestHash,
      status: record.status,
      orderId: record.orderId ?? null,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt ?? new Date(),
    });
  }

  async updateIdempotencyStatus(
    key: string,
    userId: string,
    status: 'COMPLETED' | 'FAILED',
    orderId?: string
  ): Promise<void> {
    await db
      .update(orderIdempotency)
      .set({
        status,
        orderId: orderId ?? null,
      })
      .where(
        and(
          eq(orderIdempotency.idempotencyKey, key),
          eq(orderIdempotency.userId, userId)
        )
      );
  }

  private mapToDomain(row: typeof orders.$inferSelect): Order {
    return new Order({
      id: row.id,
      displayCode: row.displayCode,
      userId: row.userId,
      status: row.status,
      totalCents: row.totalCents,
      itemsCount: row.itemsCount,
      currency: row.currency,
      shippingRecipientName: row.shippingRecipientName,
      shippingZipCode: row.shippingZipCode,
      shippingStreet: row.shippingStreet,
      shippingNumber: row.shippingNumber,
      shippingComplement: row.shippingComplement,
      shippingNeighborhood: row.shippingNeighborhood,
      shippingCity: row.shippingCity,
      shippingState: row.shippingState,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
