import { db } from '../../infra/db';
import { products } from '../../infra/schema';
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

  // Cria um novo vinho no catálogo
  async create(data: NewProduct): Promise<Product> {
    const result = await db
      .insert(products)
      .values(data)
      .returning();
      
    if (!result[0]) {
      throw new Error('Falha ao criar o vinho no banco de dados.');
    }
    
    return result[0];
  }

  // Atualiza as informações de um vinho
  async update(id: string, data: Partial<NewProduct>): Promise<Product> {
    const result = await db
      .update(products)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(products.id, id),
          isNull(products.deletedAt) // Apenas permite editar vinhos não excluídos
        )
      )
      .returning();
      
    if (!result[0]) {
      throw new Error('Produto não encontrado ou já foi excluído.');
    }
    
    return result[0];
  }

  // Realiza a exclusão lógica (soft delete) marcando a data de deleção
  async softDelete(id: string): Promise<boolean> {
    const result = await db
      .update(products)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(products.id, id),
          isNull(products.deletedAt) // Apenas deleta se já não estiver deletado
        )
      )
      .returning();
      
    return result.length > 0;
  }
}
