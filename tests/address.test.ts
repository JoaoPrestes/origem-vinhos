import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { db } from '../src/infra/db';
import { users, addresses } from '../src/infra/schema';
import { AddressService } from '../src/domains/address/address.service';
import { AddressRepository } from '../src/domains/address/address.repository';
import { ViaCepAdapter } from '../src/infra/cep/viacep.adapter';

describe('Address Domain & ViaCEP Adapter Unit and Integration Tests', () => {
  let testUserId: string;
  const addressService = new AddressService();
  const addressRepository = new AddressRepository();

  beforeAll(async () => {
    // Limpeza de tabelas para isolamento dos testes
    await db.delete(addresses);
    await db.delete(users);

    // Criar um usuário de teste
    const [newUser] = await db
      .insert(users)
      .values({
        name: 'Usuário Teste Endereço',
        email: 'endereco_teste@email.com',
        password: 'password123',
        birthDate: new Date('1990-01-01'),
        profile: 'Customer',
      })
      .returning();

    expect(newUser?.id).toBeDefined();
    testUserId = newUser!.id;
  });

  afterAll(async () => {
    await db.delete(addresses);
    await db.delete(users);
  });

  // =========================================================================
  // 1. TESTES DE UNITÁRIOS DO VIA CEP ADAPTER
  // =========================================================================
  describe('ViaCepAdapter Unit Tests', () => {
    test('Deve aceitar CEP com máscara e sanitizar para 8 dígitos na requisição', async () => {
      const mockFetch = (async (url: any) => {
        expect(url.toString()).toContain('/01001000/json/');
        return new Response(
          JSON.stringify({
            logradouro: 'Praça da Sé',
            bairro: 'Sé',
            localidade: 'São Paulo',
            uf: 'SP',
          }),
          { status: 200 }
        );
      }) as unknown as typeof fetch;

      const adapter = new ViaCepAdapter('https://viacep.com.br/ws', 5000, mockFetch);
      const result = await adapter.lookupCep('01001-000');

      expect(result.found).toBe(true);
      expect(result.street).toBe('Praça da Sé');
      expect(result.neighborhood).toBe('Sé');
      expect(result.city).toBe('São Paulo');
      expect(result.state).toBe('SP');
    });

    test('Deve retornar erro funcional quando CEP tiver formato inválido (<8 dígitos)', async () => {
      const adapter = new ViaCepAdapter();
      const result = await adapter.lookupCep('123');

      expect(result.found).toBe(false);
      expect(result.error).toContain('8 dígitos');
    });

    test('Deve tratar resposta de CEP inexistente (erro: true)', async () => {
      const mockFetch = (async () => {
        return new Response(JSON.stringify({ erro: true }), { status: 200 });
      }) as unknown as typeof fetch;

      const adapter = new ViaCepAdapter('https://viacep.com.br/ws', 5000, mockFetch);
      const result = await adapter.lookupCep('99999999');

      expect(result.found).toBe(false);
      expect(result.error).toBe('CEP não encontrado.');
    });

    test('Deve tratar timeout no adapter externo', async () => {
      const mockFetch = (async () => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        throw err;
      }) as unknown as typeof fetch;

      const adapter = new ViaCepAdapter('https://viacep.com.br/ws', 10, mockFetch);
      const result = await adapter.lookupCep('01001000');

      expect(result.found).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  // =========================================================================
  // 2. TESTES DE REGRAS DE NEGÓCIO DO DOMÍNIO DE ENDEREÇOS
  // =========================================================================
  describe('Address Domain Business Rules', () => {
    let address1Id: string;
    let address2Id: string;

    test('RN-END-06.1: O primeiro endereço cadastrado deve se tornar automaticamente o Padrão', async () => {
      const addr1 = await addressService.createAddress(testUserId, {
        zipCode: '01001000',
        street: 'Praça da Sé',
        number: '100',
        neighborhood: 'Sé',
        city: 'São Paulo',
        state: 'SP',
        label: 'Casa',
      });

      expect(addr1.id).toBeDefined();
      expect(addr1.isDefault).toBe(true);
      address1Id = addr1.id;
    });

    test('RN-END-06.2: O segundo endereço cadastrado deve nascer como Não-Padrão', async () => {
      const addr2 = await addressService.createAddress(testUserId, {
        zipCode: '04571010',
        street: 'Avenida Engenheiro Luís Carlos Berrini',
        number: '500',
        neighborhood: 'Cidade Monções',
        city: 'São Paulo',
        state: 'SP',
        label: 'Trabalho',
      });

      expect(addr2.id).toBeDefined();
      expect(addr2.isDefault).toBe(false);
      address2Id = addr2.id;
    });

    test('RN-END-06.2: Deve permitir alterar manualmente qual endereço é o Padrão', async () => {
      const updated2 = await addressService.setDefaultAddress(address2Id, testUserId);
      expect(updated2?.isDefault).toBe(true);

      const userAddrs = await addressService.getUserAddresses(testUserId);
      const addr1 = userAddrs.find((a) => a.id === address1Id);
      expect(addr1?.isDefault).toBe(false);
    });

    test('RN-END-06.3: Ao excluir o endereço padrão, o outro endereço restante deve ser promovido a Padrão automaticamente', async () => {
      // Deletar address2 (que é o atual padrão)
      const success = await addressService.deleteAddress(address2Id, testUserId);
      expect(success).toBe(true);

      const userAddrs = await addressService.getUserAddresses(testUserId);
      expect(userAddrs.length).toBe(1);
      expect(userAddrs[0]?.id).toBe(address1Id);
      expect(userAddrs[0]?.isDefault).toBe(true); // Promovido automaticamente!
    });

    test('Ao excluir o último endereço, a lista do usuário deve ficar com 0 registros', async () => {
      const success = await addressService.deleteAddress(address1Id, testUserId);
      expect(success).toBe(true);

      const userAddrs = await addressService.getUserAddresses(testUserId);
      expect(userAddrs.length).toBe(0);
    });
  });
});
