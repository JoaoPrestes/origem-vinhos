import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { db } from '../src/infra/db';
import { users, products, cartItems, addresses, favorites } from '../src/infra/schema';
import { IdentityHandlers } from '../src/domains/identity/identity.handlers';
import { CatalogHandlers } from '../src/domains/catalog/catalog.handlers';
import { CartHandlers } from '../src/domains/cart/cart.handlers';
import { AddressHandlers } from '../src/domains/address/address.handlers';
import { AuthService } from '../src/domains/identity/auth.service';
import { UserRepository } from '../src/domains/identity/user.repository';
import { sql } from 'drizzle-orm';

const identityHandlers = new IdentityHandlers();
const catalogHandlers = new CatalogHandlers();
const cartHandlers = new CartHandlers();
const addressHandlers = new AddressHandlers();
const authService = new AuthService();
const userRepository = new UserRepository();

// Variáveis para guardar IDs compartilhados nos fluxos de teste
let customerTokenCookie: string;
let adminTokenCookie: string;
let wineId: string;
let secondWineId: string;

describe('Suíte de Testes E2E / Integração — Origem Vinhos V1', () => {
  
  beforeAll(async () => {
    // Limpeza completa das tabelas do banco de dados isolado de testes (origemvinhos_test)
    await db.delete(favorites);
    await db.delete(cartItems);
    await db.delete(addresses);
    await db.delete(products);
    await db.delete(users);
  });

  afterAll(async () => {
    // Limpeza ao concluir a suíte no banco isolado de testes
    await db.delete(favorites);
    await db.delete(cartItems);
    await db.delete(addresses);
    await db.delete(products);
    await db.delete(users);
  });


  // =========================================================================
  // 1. TESTES DO DOMÍNIO IDENTITY (USUÁRIOS & AUTENTICAÇÃO)
  // =========================================================================
  describe('Identity Domain', () => {
    
    test('Deve rejeitar cadastro de usuário menor de 18 anos', async () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 17); // 17 anos atrás
      
      const req = new Request('http://localhost/api/identity/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'João Menor de Idade',
          email: 'menor@email.com',
          password: 'password123',
          birthDate: birthDate.toISOString(),
        }),
      });

      const res = await identityHandlers.register(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Erro de validação.');
      expect(data.details).toContain('Você deve ter 18 anos ou mais para se cadastrar.');
    });

    test('Deve cadastrar usuário maior de 18 anos (Customer) com sucesso', async () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 25); // 25 anos atrás

      const req = new Request('http://localhost/api/identity/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'João da Silva',
          email: 'joao@email.com',
          password: 'password123',
          birthDate: birthDate.toISOString(),
        }),
      });

      const res = await identityHandlers.register(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.message).toBe('Cadastro realizado com sucesso.');
      expect(data.user.name).toBe('João da Silva');
      expect(data.user.email).toBe('joao@email.com');
      expect(data.user.profile).toBe('Customer');
      expect(data.user.password).toBeUndefined(); // Senha omitida
    });

    test('Deve rejeitar cadastro com e-mail duplicado', async () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 30);

      const req = new Request('http://localhost/api/identity/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'João Duplicado',
          email: 'joao@email.com',
          password: 'password123',
          birthDate: birthDate.toISOString(),
        }),
      });

      const res = await identityHandlers.register(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Este e-mail já está cadastrado.');
    });

    test('Deve rejeitar login com credenciais inválidas', async () => {
      const req = new Request('http://localhost/api/identity/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'joao@email.com',
          password: 'senha_errada',
        }),
      });

      const res = await identityHandlers.login(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Credenciais inválidas.');
    });

    test('Deve realizar login com sucesso e retornar o cookie de sessão', async () => {
      const req = new Request('http://localhost/api/identity/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'joao@email.com',
          password: 'password123',
        }),
      });

      const res = await identityHandlers.login(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toBe('Login realizado com sucesso.');
      
      const setCookie = res.headers.get('Set-Cookie');
      expect(setCookie).not.toBeNull();
      expect(setCookie).toContain('session_token=');
      expect(setCookie).toContain('HttpOnly');
      
      customerTokenCookie = setCookie!;
    });

    test('Deve retornar perfil do usuário logado', async () => {
      const req = new Request('http://localhost/api/identity/me', {
        method: 'GET',
        headers: { 'Cookie': customerTokenCookie },
      });

      const res = await identityHandlers.getProfile(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.user.email).toBe('joao@email.com');
      expect(data.user.profile).toBe('Customer');
    });
  });

  // =========================================================================
  // 2. TESTES DO DOMÍNIO CATALOG (CATÁLOGO DE VINHOS)
  // =========================================================================
  describe('Catalog Domain', () => {
    
    // Configura um usuário administrador no banco para testar rotas restritas
    beforeAll(async () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 40);
      
      const hashedPassword = await authService.hashPassword('admin123');
      const adminUser = await userRepository.createUser({
        name: 'Adega Admin',
        email: 'admin@origemvinhos.com',
        password: hashedPassword,
        birthDate,
        profile: 'Admin', // Perfil administrador
      });

      // Gera cookie de sessão para o administrador
      adminTokenCookie = authService.getSetCookieHeader(adminUser.id);
    });

    test('Deve proibir criação de vinhos por usuário comum (Customer)', async () => {
      const req = new Request('http://localhost/api/catalog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': customerTokenCookie, // Cookie de Customer
        },
        body: JSON.stringify({
          name: 'Vinho Proibido',
          price: 99.90,
          description: 'Não deveria ser cadastrado.',
          image: 'http://imagem.com/vinho.jpg',
          type: 'Tinto',
          grape: 'Cabernet',
          country: 'Brasil',
          harvest: 2020,
          alcohol: 13.0,
        }),
      });

      const res = await catalogHandlers.create(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toBe('Acesso proibido. Apenas administradores podem realizar esta ação.');
    });

    test('Deve permitir a criação de vinhos por usuário com perfil Admin', async () => {
      const req = new Request('http://localhost/api/catalog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminTokenCookie, // Cookie de Admin
        },
        body: JSON.stringify({
          name: 'Vinho Dourado Malbec',
          price: 120.00,
          description: 'Um vinho tinto encorpado de Mendoza.',
          image: 'http://imagem.com/malbec.jpg',
          type: 'Tinto',
          grape: 'Malbec',
          country: 'Argentina',
          harvest: 2021,
          alcohol: 14.5,
        }),
      });

      const res = await catalogHandlers.create(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.message).toBe('Vinho cadastrado com sucesso.');
      expect(data.product.name).toBe('Vinho Dourado Malbec');
      
      wineId = data.product.id; // Guarda o ID para testes posteriores
    });

    test('Deve listar os vinhos cadastrados no catálogo público', async () => {
      const req = new Request('http://localhost/api/catalog', { method: 'GET' });
      const res = await catalogHandlers.list(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(1);
      expect(data[0].id).toBe(wineId);
    });

    test('Deve aplicar filtros de busca por tipo/uva/país na listagem', async () => {
      // Cadastra um segundo vinho para testar filtros
      const reqAdd = new Request('http://localhost/api/catalog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminTokenCookie,
        },
        body: JSON.stringify({
          name: 'Champagne Imperial Brut',
          price: 350.00,
          description: 'Espumante clássico francês.',
          image: 'http://imagem.com/champagne.jpg',
          type: 'Espumante',
          grape: 'Chardonnay',
          country: 'França',
          harvest: 2019,
          alcohol: 12.0,
        }),
      });
      const resAdd = await catalogHandlers.create(reqAdd);
      const dataAdd = await resAdd.json();
      secondWineId = dataAdd.product.id;

      // Filtra por tipo=Espumante
      const reqFilter1 = new Request('http://localhost/api/catalog?type=Espumante', { method: 'GET' });
      const resFilter1 = await catalogHandlers.list(reqFilter1);
      const dataFilter1 = await resFilter1.json();
      expect(dataFilter1.length).toBe(1);
      expect(dataFilter1[0].id).toBe(secondWineId);

      // Filtra por uva=Malbec
      const reqFilter2 = new Request('http://localhost/api/catalog?grape=Malbec', { method: 'GET' });
      const resFilter2 = await catalogHandlers.list(reqFilter2);
      const dataFilter2 = await resFilter2.json();
      expect(dataFilter2.length).toBe(1);
      expect(dataFilter2[0].id).toBe(wineId);
    });

    test('Deve proibir exclusão de vinho por usuário não autenticado', async () => {
      const req = new Request(`http://localhost/api/catalog/${secondWineId}`, { method: 'DELETE' });
      const res = await catalogHandlers.delete(req, secondWineId);
      expect(res.status).toBe(401);
    });

    test('Deve proibir exclusão de vinho por usuário comum (Customer)', async () => {
      const req = new Request(`http://localhost/api/catalog/${secondWineId}`, {
        method: 'DELETE',
        headers: { 'Cookie': customerTokenCookie },
      });
      const res = await catalogHandlers.delete(req, secondWineId);
      expect(res.status).toBe(403);
    });

    test('Deve permitir a exclusão lógica de vinho por usuário Administrador', async () => {
      // Cadastra um vinho especificamente para testar exclusão
      const reqCreate = new Request('http://localhost/api/catalog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminTokenCookie,
        },
        body: JSON.stringify({
          name: 'Vinho Para Exclusao Teste',
          price: 150.00,
          description: 'Vinho temporário para testar exclusão.',
          image: 'http://imagem.com/temp.jpg',
          type: 'Tinto',
          grape: 'Cabernet',
          country: 'Chile',
          harvest: 2022,
          alcohol: 13.0,
        }),
      });
      const resCreate = await catalogHandlers.create(reqCreate);
      const dataCreate = await resCreate.json();
      const tempId = dataCreate.product.id;

      const req = new Request(`http://localhost/api/catalog/${tempId}`, {
        method: 'DELETE',
        headers: { 'Cookie': adminTokenCookie },
      });
      const res = await catalogHandlers.delete(req, tempId);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.message).toContain('excluído logicamente');
    });
  });

  // =========================================================================
  // 3. TESTES DO DOMÍNIO CART (CARRINHO DE COMPRAS & INTEGRAÇÃO SOFT DELETE)
  // =========================================================================
  describe('Cart Domain & Integration', () => {
    
    test('Deve proibir consulta ao carrinho para usuário deslogado', async () => {
      const req = new Request('http://localhost/api/cart', { method: 'GET' });
      const res = await cartHandlers.getCart(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Não autorizado. Faça login para acessar o carrinho.');
    });

    test('Deve adicionar vinho ao carrinho de usuário autenticado', async () => {
      const req = new Request('http://localhost/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': customerTokenCookie,
        },
        body: JSON.stringify({
          productId: wineId,
          quantity: 2,
        }),
      });

      const res = await cartHandlers.addItem(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toBe('Vinho adicionado ao carrinho com sucesso.');
      expect(data.item.quantity).toBe(2);
    });

    test('Deve incrementar a quantidade se o produto for adicionado novamente', async () => {
      const req = new Request('http://localhost/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': customerTokenCookie,
        },
        body: JSON.stringify({
          productId: wineId,
          quantity: 3,
        }),
      });

      const res = await cartHandlers.addItem(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.item.quantity).toBe(5); // 2 anteriores + 3 atuais
    });

    test('Deve retornar a lista do carrinho com subtotais e valor total corretos', async () => {
      // Adiciona o segundo vinho (1 unidade de R$ 350.00)
      const reqAddSec = new Request('http://localhost/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': customerTokenCookie,
        },
        body: JSON.stringify({
          productId: secondWineId,
          quantity: 1,
        }),
      });
      await cartHandlers.addItem(reqAddSec);

      // Consulta carrinho
      const req = new Request('http://localhost/api/cart', {
        method: 'GET',
        headers: { 'Cookie': customerTokenCookie },
      });
      const res = await cartHandlers.getCart(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.items.length).toBe(2);
      
      // Total esperado: 5 garrafas do vinho 1 (R$ 120.00 cada = R$ 600.00) + 1 garrafa do vinho 2 (R$ 350.00) = R$ 950.00
      expect(data.total).toBe('950.00');
    });

    // -----------------------------------------------------------------------
    // Regra Integrada Crucial: Soft Delete do Catálogo refletindo no Carrinho
    // -----------------------------------------------------------------------
    test('Integração: Exclusão lógica do vinho deve retirá-lo automaticamente do carrinho', async () => {
      // 1. O administrador realiza o soft delete do segundo vinho (Champagne)
      const reqDelete = new Request(`http://localhost/api/catalog/${secondWineId}`, {
        method: 'DELETE',
        headers: { 'Cookie': adminTokenCookie },
      });
      const resDelete = await catalogHandlers.delete(reqDelete, secondWineId);
      expect(resDelete.status).toBe(200);

      // 2. O cliente consulta o seu carrinho de compras
      const reqGetCart = new Request('http://localhost/api/cart', {
        method: 'GET',
        headers: { 'Cookie': customerTokenCookie },
      });
      const resGetCart = await cartHandlers.getCart(reqGetCart);
      const dataCart = await resGetCart.json();

      expect(resGetCart.status).toBe(200);
      
      // O item do Champagne deve ter sido expulso do banco e da resposta
      expect(dataCart.items.length).toBe(1);
      expect(dataCart.items[0].product.id).toBe(wineId);
      
      // Total recalculado esperado: Apenas o primeiro vinho (5 garrafas de R$ 120.00 = R$ 600.00)
      expect(dataCart.total).toBe('600.00');

      // 3. Valida no banco se o item inativo foi de fato limpo/deletado fisicamente da tabela cart_items
      const rows = await db.select().from(cartItems);
      expect(rows.length).toBe(1); // Sobrou apenas a linha do vinho ativo
    });
  });

  // =========================================================================
  // 4. TESTES DO DOMÍNIO ADDRESS (HTTP ENDPOINTS)
  // =========================================================================
  describe('Address Domain HTTP Endpoints', () => {
    let createdAddressId: string;

    test('Deve rejeitar requisição de endereços para usuário deslogado', async () => {
      const req = new Request('http://localhost/api/addresses', { method: 'GET' });
      const res = await addressHandlers.list(req);
      expect(res.status).toBe(401);
    });

    test('Deve cadastrar novo endereço via HTTP para usuário logado', async () => {
      const req = new Request('http://localhost/api/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': customerTokenCookie,
        },
        body: JSON.stringify({
          zipCode: '01001000',
          street: 'Praça da Sé',
          number: '10',
          neighborhood: 'Sé',
          city: 'São Paulo',
          state: 'SP',
          label: 'Casa',
        }),
      });

      const res = await addressHandlers.create(req);
      const data = await res.json();
      expect(res.status).toBe(201);
      expect(data.address.id).toBeDefined();
      expect(data.address.isDefault).toBe(true); // Primeiro endereço!
      createdAddressId = data.address.id;
    });

    test('Deve listar endereços do usuário logado', async () => {
      const req = new Request('http://localhost/api/addresses', {
        method: 'GET',
        headers: { 'Cookie': customerTokenCookie },
      });

      const res = await addressHandlers.list(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.addresses.length).toBe(1);
      expect(data.addresses[0].id).toBe(createdAddressId);
    });

    test('Deve atualizar endereço via HTTP', async () => {
      const req = new Request(`http://localhost/api/addresses/${createdAddressId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': customerTokenCookie,
        },
        body: JSON.stringify({
          number: '200',
          complement: 'Apto 12',
        }),
      });

      const res = await addressHandlers.update(req, createdAddressId);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.address.number).toBe('200');
      expect(data.address.complement).toBe('Apto 12');
    });

    test('Deve excluir endereço via HTTP', async () => {
      const req = new Request(`http://localhost/api/addresses/${createdAddressId}`, {
        method: 'DELETE',
        headers: { 'Cookie': customerTokenCookie },
      });

      const res = await addressHandlers.delete(req, createdAddressId);
      expect(res.status).toBe(200);

      const reqList = new Request('http://localhost/api/addresses', {
        method: 'GET',
        headers: { 'Cookie': customerTokenCookie },
      });
      const resList = await addressHandlers.list(reqList);
      const dataList = await resList.json();
      expect(dataList.addresses.length).toBe(0);
    });
  });
});
