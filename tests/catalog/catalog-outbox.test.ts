import { describe, it, expect, beforeEach } from 'bun:test';
import { db } from '../../src/infra/db';
import { products, catalogOutbox } from '../../src/infra/schema';
import { CatalogRepository } from '../../src/domains/catalog/catalog.repository';
import { eq } from 'drizzle-orm';

describe('Catalog Repository Outbox Integration (spec09 §6.1)', () => {
  const catalogRepo = new CatalogRepository();
  let createdProductId: string;

  beforeEach(async () => {
    // Limpeza de tabelas para isolamento
    await db.delete(catalogOutbox);
    await db.delete(products);
  });

  it('should atomically record a PRODUCT_CREATED event with version = 1 when creating a product', async () => {
    const product = await catalogRepo.create({
      name: 'Vinho Tinto Teste Outbox',
      price: '150.00',
      description: 'Descrição de teste',
      image: '/images/teste.jpg',
      type: 'Tinto',
      grape: 'Cabernet',
      country: 'Brasil',
      harvest: 2020,
      alcohol: '13.50',
      stock: 10,
      sensory_profile: 'Frutas vermelhas e carvalho',
      pairing: 'Carnes vermelhas',
      harvest_notes: 'Safra excelente',
    });

    createdProductId = product.id;
    expect(product.version).toBe(1);
    expect(product.stock).toBe(10);
    expect(product.sensory_profile).toBe('Frutas vermelhas e carvalho');

    // Confere evento na catalog_outbox
    const events = await db
      .select()
      .from(catalogOutbox)
      .where(eq(catalogOutbox.productId, product.id));

    expect(events.length).toBe(1);
    expect(events[0]!.eventType).toBe('PRODUCT_CREATED');
    expect(events[0]!.version).toBe(1);
    expect(events[0]!.status).toBe('PENDING');
  });

  it('should increment version to 2 and record a PRODUCT_UPDATED outbox event when updating a product', async () => {
    const product = await catalogRepo.create({
      name: 'Vinho Tinto Original',
      price: '100.00',
      description: 'Original',
      image: '/images/orig.jpg',
      type: 'Tinto',
      grape: 'Merlot',
      country: 'Brasil',
      harvest: 2019,
      alcohol: '13.00',
      stock: 5,
    });

    const updated = await catalogRepo.update(product.id, {
      name: 'Vinho Tinto Atualizado',
      price: '120.00',
      stock: 4,
      sensory_profile: 'Novo perfil sensorial adicionado',
    });

    expect(updated.version).toBe(2);
    expect(updated.stock).toBe(4);
    expect(updated.sensory_profile).toBe('Novo perfil sensorial adicionado');

    const events = await db
      .select()
      .from(catalogOutbox)
      .where(eq(catalogOutbox.productId, product.id))
      .orderBy(catalogOutbox.createdAt);

    expect(events.length).toBe(2);
    expect(events[0]!.eventType).toBe('PRODUCT_CREATED');
    expect(events[0]!.version).toBe(1);
    expect(events[1]!.eventType).toBe('PRODUCT_UPDATED');
    expect(events[1]!.version).toBe(2);
    expect(events[1]!.status).toBe('PENDING');
  });

  it('should record a PRODUCT_DELETED outbox event with incremented version on soft delete', async () => {
    const product = await catalogRepo.create({
      name: 'Vinho A Ser Deletado',
      price: '80.00',
      description: 'Desc',
      image: '/images/del.jpg',
      type: 'Branco',
      grape: 'Chardonnay',
      country: 'Chile',
      harvest: 2021,
      alcohol: '12.50',
    });

    const deletedSuccess = await catalogRepo.softDelete(product.id);
    expect(deletedSuccess).toBe(true);

    const events = await db
      .select()
      .from(catalogOutbox)
      .where(eq(catalogOutbox.productId, product.id))
      .orderBy(catalogOutbox.createdAt);

    expect(events.length).toBe(2);
    expect(events[1]!.eventType).toBe('PRODUCT_DELETED');
    expect(events[1]!.version).toBe(2);
    expect(events[1]!.status).toBe('PENDING');
  });
});
