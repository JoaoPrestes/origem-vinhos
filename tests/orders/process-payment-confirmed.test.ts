import { describe, it, expect, beforeEach } from 'bun:test';
import { ProcessPaymentConfirmedUseCase } from '../../src/domains/orders/use-cases/process-payment-confirmed.use-case';
import { Order } from '../../src/domains/orders/domain/order.entity';
import type { OrderRepositoryPort } from '../../src/domains/orders/ports/order-repository.port';
import type { OrderCartCleanerPort } from '../../src/domains/orders/ports/order-cart-cleaner.port';

describe('ProcessPaymentConfirmedUseCase (spec08 §7.3 & §7.5)', () => {
  let mockOrderRepo: OrderRepositoryPort;
  let mockCartCleaner: OrderCartCleanerPort;
  let inboxRecords: string[];
  let removedCartItemIds: string[];
  let fakeOrder: Order;

  beforeEach(() => {
    inboxRecords = [];
    removedCartItemIds = [];

    fakeOrder = new Order({
      id: 'ord-123',
      displayCode: '#OV-123456',
      userId: 'usr-1',
      status: 'PENDING_PAYMENT',
      totalCents: 24100,
      itemsCount: 2,
      currency: 'BRL',
      shippingRecipientName: 'Cliente',
      shippingZipCode: '01001-000',
      shippingStreet: 'Rua Teste',
      shippingNumber: '10',
      shippingComplement: null,
      shippingNeighborhood: 'Bairro',
      shippingCity: 'Cidade',
      shippingState: 'SP',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockOrderRepo = {
      saveWithSnapshot: async ({ order }) => order,
      findById: async (id) => (id === 'ord-123' ? fakeOrder : null),
      findByDisplayCode: async () => null,
      listByUser: async () => [],
      updateStatus: async (id, from, to) => {
        if (id === 'ord-123' && fakeOrder.status === from) {
          return true;
        }
        return false;
      },
      findIdempotency: async () => null,
      saveIdempotency: async () => {},
      updateIdempotencyStatus: async () => {},
    };

    mockCartCleaner = {
      removePaidItemsByCartItemIds: async (userId, ids) => {
        removedCartItemIds.push(...ids);
      },
    };
  });

  it('should mark order as PAID and trigger selective cart cleaning when event is valid', async () => {
    const useCase = new ProcessPaymentConfirmedUseCase({
      orderRepository: mockOrderRepo,
      cartCleaner: mockCartCleaner,
      inboxRepo: {
        hasEvent: async (id: string) => inboxRecords.includes(id),
        recordEvent: async (id: string) => { inboxRecords.push(id); },
      },
    });

    const result = await useCase.execute({
      eventId: 'evt-1',
      orderId: 'ord-123',
      paymentAttemptId: 'att-1',
      paidAmountCents: 24100,
      currency: 'BRL',
      cartItemIds: ['cart-item-1', 'cart-item-2'],
      occurredAt: new Date(),
    });

    expect(result.status).toBe('PROCESSED');
    expect(fakeOrder.status).toBe('PAID');
    expect(removedCartItemIds).toEqual(['cart-item-1', 'cart-item-2']);
    expect(inboxRecords.includes('evt-1')).toBe(true);
  });

  it('should block transition and record discrepancy if paid amount diverges from order total', async () => {
    const useCase = new ProcessPaymentConfirmedUseCase({
      orderRepository: mockOrderRepo,
      cartCleaner: mockCartCleaner,
      inboxRepo: {
        hasEvent: async () => false,
        recordEvent: async () => {},
      },
    });

    expect(
      useCase.execute({
        eventId: 'evt-2',
        orderId: 'ord-123',
        paymentAttemptId: 'att-2',
        paidAmountCents: 10000, // Menor que 24100
        currency: 'BRL',
        cartItemIds: ['c1'],
        occurredAt: new Date(),
      })
    ).rejects.toThrow('Divergência financeira');

    expect(fakeOrder.status).toBe('PENDING_PAYMENT');
  });

  it('should be idempotent and not re-process if event was already received in inbox', async () => {
    inboxRecords.push('evt-already-processed');

    const useCase = new ProcessPaymentConfirmedUseCase({
      orderRepository: mockOrderRepo,
      cartCleaner: mockCartCleaner,
      inboxRepo: {
        hasEvent: async (id: string) => inboxRecords.includes(id),
        recordEvent: async () => {},
      },
    });

    const result = await useCase.execute({
      eventId: 'evt-already-processed',
      orderId: 'ord-123',
      paymentAttemptId: 'att-3',
      paidAmountCents: 24100,
      currency: 'BRL',
      cartItemIds: ['c1'],
      occurredAt: new Date(),
    });

    expect(result.status).toBe('ALREADY_PROCESSED');
  });
});
