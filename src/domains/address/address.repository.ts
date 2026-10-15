import { db } from '../../infra/db';
import { addresses } from '../../infra/schema';
import { eq, and, desc } from 'drizzle-orm';

export type AddressRecord = typeof addresses.$inferSelect;
export type NewAddressRecord = typeof addresses.$inferInsert;

export class AddressRepository {
  async insert(data: NewAddressRecord): Promise<AddressRecord> {
    const result = await db
      .insert(addresses)
      .values(data)
      .returning();

    if (!result[0]) {
      throw new Error('Falha ao registrar endereço no banco de dados.');
    }

    return result[0];
  }

  async findByUserId(userId: string): Promise<AddressRecord[]> {
    return await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, userId))
      .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
  }

  async findById(id: string, userId: string): Promise<AddressRecord | null> {
    const result = await db
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .limit(1);

    return result[0] || null;
  }

  async update(id: string, userId: string, data: Partial<NewAddressRecord>): Promise<AddressRecord | null> {
    const result = await db
      .update(addresses)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .returning();

    return result[0] || null;
  }

  async delete(id: string, userId: string): Promise<AddressRecord | null> {
    const result = await db
      .delete(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .returning();

    return result[0] || null;
  }

  async clearDefaultFlags(userId: string): Promise<void> {
    await db
      .update(addresses)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(addresses.userId, userId));
  }
}
