import { db } from '../../infra/db';
import { products, catalogOutbox } from '../../infra/schema';
import { eq, and, isNull } from 'drizzle-orm';

export type NewProduct = typeof products.$inferInsert;
export type Product = typeof products.$inferSelect;

export class CatalogRepository {
  // Lista todos os vinhos ativos (onde deletedAt é nulo)
  async listActive(): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(isNull(products.deletedAt));
  }

  // Busca um vinho ativo pelo ID (para vitrine e carrinho)
  async findActiveById(id: string): Promise<Product | null> {
    const result = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, id),
          isNull(products.deletedAt)
        )
      )
      .limit(1);
    return result[0] || null;
  }

  // Busca qualquer vinho pelo ID, independente do status de deleção (útil para auditoria)
  async findById(id: string): Promise<Product | null> {
    const result = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    return result[0] || null;
  }

  // Cria um novo vinho no catálogo e registra evento atômico na outbox (versão 1)
  async create(data: NewProduct): Promise<Product> {
    return await db.transaction(async (tx) => {
      const result = await tx
        .insert(products)
        .values({
          ...data,
          version: 1,
        })
        .returning();

      const created = result[0];
      if (!created) {
        throw new Error('Falha ao criar o vinho no banco de dados.');
      }

      await tx.insert(catalogOutbox).values({
        productId: created.id,
        eventType: 'PRODUCT_CREATED',
        version: created.version,
        status: 'PENDING',
      });

      return created;
    });
  }

  // Atualiza as informações de um vinho incrementando a versão e emitindo outbox
  async update(id: string, data: Partial<NewProduct>): Promise<Product> {
    return await db.transaction(async (tx) => {
      const current = await tx
        .select({ version: products.version })
        .from(products)
        .where(and(eq(products.id, id), isNull(products.deletedAt)))
        .limit(1);

      if (!current[0]) {
        throw new Error('Produto não encontrado ou já foi excluído.');
      }

      const nextVersion = (current[0].version || 1) + 1;

      const result = await tx
        .update(products)
        .set({
          ...data,
          version: nextVersion,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(products.id, id),
            isNull(products.deletedAt)
          )
        )
        .returning();

      const updated = result[0];
      if (!updated) {
        throw new Error('Produto não encontrado ou já foi excluído.');
      }

      await tx.insert(catalogOutbox).values({
        productId: updated.id,
        eventType: 'PRODUCT_UPDATED',
        version: updated.version,
        status: 'PENDING',
      });

      return updated;
    });
  }

  // Realiza a exclusão lógica (soft delete) incrementando versão e emitindo outbox
  async softDelete(id: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const current = await tx
        .select({ version: products.version })
        .from(products)
        .where(and(eq(products.id, id), isNull(products.deletedAt)))
        .limit(1);

      if (!current[0]) {
        return false;
      }

      const nextVersion = (current[0].version || 1) + 1;

      const result = await tx
        .update(products)
        .set({
          deletedAt: new Date(),
          version: nextVersion,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(products.id, id),
            isNull(products.deletedAt)
          )
        )
        .returning();

      if (result.length > 0) {
        await tx.insert(catalogOutbox).values({
          productId: id,
          eventType: 'PRODUCT_DELETED',
          version: nextVersion,
          status: 'PENDING',
        });
        return true;
      }

      return false;
    });
  }
}

