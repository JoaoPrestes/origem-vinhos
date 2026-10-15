import { db } from '../../infra/db';
import { favorites, products } from '../../infra/schema';
import { eq, and, isNull } from 'drizzle-orm';

export class FavoritesRepository {
  // Busca lista de vinhos favoritados pelo usuário (apenas vinhos com deletedAt IS NULL)
  async listByUser(userId: string) {
    return await db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
        description: products.description,
        image: products.image,
        type: products.type,
        grape: products.grape,
        country: products.country,
        harvest: products.harvest,
        alcohol: products.alcohol,
        deletedAt: products.deletedAt,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(favorites)
      .innerJoin(products, eq(favorites.productId, products.id))
      .where(
        and(
          eq(favorites.userId, userId),
          isNull(products.deletedAt)
        )
      );
  }

  // Busca lista de IDs dos produtos favoritados pelo usuário
  async getFavoriteProductIds(userId: string): Promise<string[]> {
    const result = await db
      .select({ productId: favorites.productId })
      .from(favorites)
      .innerJoin(products, eq(favorites.productId, products.id))
      .where(
        and(
          eq(favorites.userId, userId),
          isNull(products.deletedAt)
        )
      );
    return result.map(r => r.productId);
  }

  // Verifica se um produto específico está favoritado pelo usuário
  async isFavorited(userId: string, productId: string): Promise<boolean> {
    const result = await db
      .select({ id: favorites.id })
      .from(favorites)
      .innerJoin(products, eq(favorites.productId, products.id))
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.productId, productId),
          isNull(products.deletedAt)
        )
      )
      .limit(1);
    return result.length > 0;
  }

  // Adiciona produto aos favoritos de forma idempotente (ON CONFLICT DO NOTHING)
  async add(userId: string, productId: string): Promise<boolean> {
    await db
      .insert(favorites)
      .values({ userId, productId })
      .onConflictDoNothing({ target: [favorites.userId, favorites.productId] });
    return true;
  }

  // Remove produto dos favoritos de forma idempotente
  async remove(userId: string, productId: string): Promise<boolean> {
    await db
      .delete(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.productId, productId)
        )
      );
    return true;
  }
}
