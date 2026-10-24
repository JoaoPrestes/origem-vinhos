import { db } from '../../../infra/db';
import { orderItems, products } from '../../../infra/schema';
import { eq, sql } from 'drizzle-orm';
import type { OrderStockDeductorPort } from '../ports/order-stock-deductor.port';

export class DrizzleOrderStockDeductorAdapter implements OrderStockDeductorPort {
  async deductStockForOrder(orderId: string): Promise<void> {
    const items = await db
      .select({ productId: orderItems.productId, quantity: orderItems.quantity })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    for (const item of items) {
      try {
        const result: any = await db.execute(sql`
          UPDATE products 
          SET stock = GREATEST(0, stock - ${item.quantity}), 
              updated_at = NOW() 
          WHERE id = ${item.productId}
          RETURNING stock;
        `);

        const updatedStock = result?.[0]?.stock ?? 0;
        if (Number(updatedStock) === 0) {
          console.warn(`WARN: STOCK_DEPLETED_CONCURRENTLY orderId=${orderId} productId=${item.productId}`);
        }
      } catch (err) {
        console.error(`Falha ao decrementar estoque do produto ${item.productId} para o pedido ${orderId}:`, err);
      }
    }
  }
}
