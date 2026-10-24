import { describe, it, expect, beforeEach } from 'bun:test';
import { CreateOrderUseCase } from '../../src/domains/orders/use-cases/create-order.use-case';
import type { OrderRepositoryPort } from '../../src/domains/orders/ports/order-repository.port';
import type {
  CartRepositoryPort,
  CatalogRepositoryPort,
  AddressRepositoryPort,
} from '../../src/domains/orders/ports/order-external-dependencies.port';
import { Order } from '../../src/domains/orders/domain/order.entity';

describe('CreateOrderUseCase', () => {
  let mockOrderRepo: OrderRepositoryPort;
  let mockCartRepo: CartRepositoryPort;
  let mockCatalogRepo: CatalogRepositoryPort;
  let mockAddressRepo: AddressRepositoryPort;

  beforeEach(() => {
    mockOrderRepo = {
      saveWithSnapshot: async ({ order }) => order,
      findById: async () => null,
      findByDisplayCode: async () => null,
      listByUser: async () => [],
      updateStatus: async () => true,
      findIdempotency: async () => null,
      saveIdempotency: async () => {},
      updateIdempotencyStatus: async () => {},
    };

    mockCartRepo = {
      listByUser: async () => [
        {
          id: 'cart-1',
          quantity: 2,
          product: {
            id: 'prod-1',
            name: 'Vinho Tinto Reserva',
            price: '120.50',
            image: 'vinho.png',
            type: 'Tinto',
            grape: 'Cabernet',
            country: 'Brasil',
            harvest: 2021,
            deletedAt: null,
          },
        },
      ],
    };

    mockCatalogRepo = {
      findById: async () => ({
        id: 'prod-1',
        name: 'Vinho Tinto Reserva',
        price: '120.50',
        image: 'vinho.png',
        type: 'Tinto',
        grape: 'Cabernet',
        country: 'Brasil',
        harvest: 2021,
        deletedAt: null,
      }),
    };

    mockAddressRepo = {
      findById: async () => ({
        id: 'addr-1',
        userId: 'usr-1',
        zipCode: '01001-000',
        street: 'Praça da Sé',
        number: '100',
        complement: 'Apto 1',
        neighborhood: 'Sé',
        city: 'São Paulo',
        state: 'SP',
      }),
    };
  });

  it('should create an order successfully with sober server-calculated cents', async () => {
    const useCase = new CreateOrderUseCase({
      orderRepository: mockOrderRepo,
      cartRepository: mockCartRepo,
      catalogRepository: mockCatalogRepo,
      addressRepository: mockAddressRepo,
    });

    const result = await useCase.execute({
      userId: 'usr-1',
      addressId: 'addr-1',
      recipientName: 'Comprador Teste',
    });

    expect(result.order).toBeDefined();
    expect(result.order.status).toBe('PENDING_PAYMENT');
    expect(result.order.totalCents).toBe(24100); // 12050 * 2
    expect(result.order.itemsCount).toBe(2);
    expect(result.order.displayCode).toMatch(/^#OV-/);
  });

  it('should reject when cart is empty', async () => {
    mockCartRepo.listByUser = async () => [];

    const useCase = new CreateOrderUseCase({
      orderRepository: mockOrderRepo,
      cartRepository: mockCartRepo,
      catalogRepository: mockCatalogRepo,
      addressRepository: mockAddressRepo,
    });

    expect(
      useCase.execute({
        userId: 'usr-1',
        addressId: 'addr-1',
        recipientName: 'Comprador Teste',
      })
    ).rejects.toThrow('carrinho está vazio');
  });

  it('should reject when product was soft-deleted in catalog', async () => {
    mockCatalogRepo.findById = async () => ({
      id: 'prod-1',
      name: 'Vinho Tinto Reserva',
      price: '120.50',
      image: 'vinho.png',
      type: 'Tinto',
      grape: 'Cabernet',
      harvest: 2021,
      deletedAt: new Date(),
    });

    const useCase = new CreateOrderUseCase({
      orderRepository: mockOrderRepo,
      cartRepository: mockCartRepo,
      catalogRepository: mockCatalogRepo,
      addressRepository: mockAddressRepo,
    });

    expect(
      useCase.execute({
        userId: 'usr-1',
        addressId: 'addr-1',
        recipientName: 'Comprador Teste',
      })
    ).rejects.toThrow('não está mais disponível');
  });
});
