import { db } from '../../infra/db';
import { users } from '../../infra/schema';
import { eq } from 'drizzle-orm';

// Tipo de inserção gerado pelo Drizzle para a tabela de usuários
export type NewUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export class UserRepository {
  // Busca um usuário pelo e-mail
  async findByEmail(email: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result[0] || null;
  }

  // Busca um usuário pelo ID
  async findById(id: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0] || null;
  }

  // Cria um novo usuário no banco de dados
  async createUser(data: NewUser): Promise<User> {
    const result = await db
      .insert(users)
      .values(data)
      .returning();
    
    if (!result[0]) {
      throw new Error('Falha ao criar o usuário no banco de dados.');
    }
    
    return result[0];
  }

  // Atualiza os dados de um usuário existente
  async updateUser(id: string, data: Partial<NewUser>): Promise<User> {
    const result = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
      
    if (!result[0]) {
      throw new Error('Usuário não encontrado para atualização.');
    }
    
    return result[0];
  }

  // Exclui o usuário do banco de dados (cascade deletará carrinho automaticamente)
  async deleteUser(id: string): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning();
    return (result.length > 0);
  }
}
