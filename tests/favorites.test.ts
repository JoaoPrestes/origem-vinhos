import { describe, test, expect, beforeAll } from 'bun:test';
import { db } from '../src/infra/db';
import { users, products, favorites } from '../src/infra/schema';
import { eq } from 'drizzle-orm';

import { FavoritesRepository } from '../src/domains/favorites/favorites.repository';
import { AddFavoriteUseCase } from '../src/domains/favorites/use-cases/add-favorite.usecase';
import { RemoveFavoriteUseCase } from '../src/domains/favorites/use-cases/remove-favorite.usecase';
import { ToggleFavoriteUseCase } from '../src/domains/favorites/use-cases/toggle-favorite.usecase';
import { ListFavoritesUseCase } from '../src/domains/favorites/use-cases/list-favorites.usecase';

describe('Favorites Domain Use Cases & Business Rules', () => {
  let testUserId: string;
  let testProductId: string;
  let testProductId2: string;

  beforeAll(async () => {
    // Limpa dados de teste prévios se existirem
    await db.delete(favorites);

    // Garante um usuário e produto de teste
    const userList = await db.select().from(users).limit(1);
    if (userList.length > 0 && userList[0]) {
      testUserId = userList[0].id;
    } else {
      const newUser = await db.insert(users).values({
        name: 'Usuário Teste Favoritos',
        email: `test_fav_${Date.now()}@email.com`,
        password: 'password_hash',
        birthDate: new Date('1990-01-01'),
        profile: 'Customer',
      }).returning();
      testUserId = newUser[0]!.id;
    }

    const productList = await db.select().from(products).limit(2);
    if (productList.length >= 2 && productList[0] && productList[1]) {
      testProductId = productList[0].id;
      testProductId2 = productList[1].id;
    } else {
      const p1 = await db.insert(products).values({
        name: 'Vinho Teste Favorito 1',
        price: '100.00',
        description: 'Vinho teste',
        image: 'http://img.com/1.jpg',
        type: 'Tinto',
        grape: 'Merlot',
        country: 'Brasil',
        harvest: 2020,
        alcohol: '13.00',
      }).returning();
      const p2 = await db.insert(products).values({
        name: 'Vinho Teste Favorito 2',
        price: '200.00',
        description: 'Vinho teste 2',
        image: 'http://img.com/2.jpg',
        type: 'Branco',
        grape: 'Chardonnay',
        country: 'Chile',
        harvest: 2021,
        alcohol: '12.50',
      }).returning();
      testProductId = p1[0]!.id;
      testProductId2 = p2[0]!.id;
    }
  });

  test('RN-FAV-02 & RN-FAV-04: Adicionar favorito de forma idempotente (AddFavoriteUseCase)', async () => {
    const addUseCase = new AddFavoriteUseCase();
    const result1 = await addUseCase.execute(testUserId, testProductId);
    expect(result1).toBe(true);

    // Segunda execução não deve falhar nem duplicar
    const result2 = await addUseCase.execute(testUserId, testProductId);
    expect(result2).toBe(true);

    const listUseCase = new ListFavoritesUseCase();
    const favIds = await listUseCase.getIds(testUserId);
    expect(favIds).toContain(testProductId);
  });

  test('RN-FAV-04: Alternar favorito com ToggleFavoriteUseCase', async () => {
    const toggleUseCase = new ToggleFavoriteUseCase();
    
    // testProductId já está favoritado, o toggle deve remover (isFavorited = false)
    const toggleResult1 = await toggleUseCase.execute(testUserId, { productId: testProductId });
    expect(toggleResult1.isFavorited).toBe(false);

    // Segundo toggle deve adicionar de volta (isFavorited = true)
    const toggleResult2 = await toggleUseCase.execute(testUserId, { productId: testProductId });
    expect(toggleResult2.isFavorited).toBe(true);
  });

  test('RN-FAV-03: Remover favorito com RemoveFavoriteUseCase', async () => {
    const removeUseCase = new RemoveFavoriteUseCase();
    const listUseCase = new ListFavoritesUseCase();

    await removeUseCase.execute(testUserId, testProductId);

    const favIds = await listUseCase.getIds(testUserId);
    expect(favIds).not.toContain(testProductId);
  });

  test('RN-FAV-03: Idempotência ao remover favorito que não existe', async () => {
    const removeUseCase = new RemoveFavoriteUseCase();
    // Tenta remover o mesmo produto novamente
    const result = await removeUseCase.execute(testUserId, testProductId);
    expect(result).toBe(true);
  });

  test('RN-FAV-06: Produtos com Soft Delete não devem ser retornados nos favoritos', async () => {
    // Cria um produto temporário especificamente para este teste
    const [softDelProduct] = await db.insert(products).values({
      name: 'Vinho Temp Soft Delete',
      price: '150.00',
      description: 'Vinho para teste de soft delete',
      image: 'http://img.com/sd.jpg',
      type: 'Tinto',
      grape: 'Cabernet',
      country: 'Brasil',
      harvest: 2022,
      alcohol: '14.00',
    }).returning();

    if (!softDelProduct) throw new Error('Falha ao criar produto temporário para o teste.');

    const addUseCase = new AddFavoriteUseCase();
    const listUseCase = new ListFavoritesUseCase();

    // Adiciona aos favoritos
    await addUseCase.execute(testUserId, softDelProduct.id);

    // Verifica que consta antes do soft delete
    let favIds = await listUseCase.getIds(testUserId);
    expect(favIds).toContain(softDelProduct.id);

    // Simula Soft Delete do produto
    await db.update(products).set({ deletedAt: new Date() }).where(eq(products.id, softDelProduct.id));

    // O produto não deve mais aparecer na lista nem nos IDs
    favIds = await listUseCase.getIds(testUserId);
    expect(favIds).not.toContain(softDelProduct.id);

    const fullList = await listUseCase.execute(testUserId);
    expect(fullList.some(p => p.id === softDelProduct.id)).toBe(false);
  });

});

