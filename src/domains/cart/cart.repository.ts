import { db } from '../../infra/db';
import { cartItems, products } from '../../infra/schema';
import { eq, and } from 'drizzle-orm';

export type CartItem = typeof cartItems.$inferSelect;
export type NewCartItem = typeof cartItems.$inferInsert;

export class CartRepository {
  // Lista todos os itens no carrinho do usuário, trazendo informações adicionais do vinho (produto)
  async listByUser(userId: string) {
    return await db
      .select({
        id: cartItems.id,
        quantity: cartItems.quantity,
        createdAt: cartItems.createdAt,
        updatedAt: cartItems.updatedAt,
        product: {
          id: products.id,
          name: products.name,
          price: products.price,
          image: products.image,
          description: products.description,
          type: products.type,
          grape: products.grape,
          country: products.country,
          harvest: products.harvest,
          alcohol: products.alcohol,
          deletedAt: products.deletedAt, // Usado para detectar soft deletes na integração
        }
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.userId, userId));
  }

  // Busca um item específico no carrinho pelo ID do usuário e do produto
  async findByUserAndProduct(userId: string, productId: string): Promise<CartItem | null> {
    const result = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.userId, userId),
          eq(cartItems.productId, productId)
        )
      )
      .limit(1);
    return result[0] || null;
  }

  // Adiciona um item ao carrinho
  async addItem(data: NewCartItem): Promise<CartItem> {
    const result = await db
      .insert(cartItems)
      .values(data)
      .returning();

    if (!result[0]) {
      throw new Error('Falha ao adicionar item ao carrinho no banco de dados.');
    }

    return result[0];
  }

  // Atualiza a quantidade de um item de carrinho por ID
  async updateQuantity(id: string, quantity: number): Promise<CartItem> {
    const result = await db
      .update(cartItems)
      .set({
        quantity,
        updatedAt: new Date(),
      })
      .where(eq(cartItems.id, id))
      .returning();

    if (!result[0]) {
      throw new Error('Item do carrinho não encontrado para atualização.');
    }

    return result[0];
  }

  // Remove fisicamente um item do carrinho
  async removeItem(id: string): Promise<boolean> {
    const result = await db
      .delete(cartItems)
      .where(eq(cartItems.id, id))
      .returning();
    return result.length > 0;
  }

  // Remove múltiplos itens do carrinho por ID (usado na limpeza programática de soft deletes)
  async removeMultipleItems(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    for (const id of ids) {
      await db.delete(cartItems).where(eq(cartItems.id, id));
    }
  }

  // Limpa/esvazia completamente o carrinho de um usuário
  async clearCart(userId: string): Promise<void> {
    await db
      .delete(cartItems)
      .where(eq(cartItems.userId, userId))
      .returning();
  }
}
