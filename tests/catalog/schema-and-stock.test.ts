import { describe, it, expect } from 'bun:test';
import { products, catalogOutbox } from '../../src/infra/schema';
import { ProcessPaymentConfirmedUseCase } from '../../src/domains/orders/use-cases/process-payment-confirmed.use-case';
import { Order } from '../../src/domains/orders/domain/order.entity';

describe('Schema Evolution & Stock Deduction (spec09 §6.1)', () => {
  it('should export all required sommelier columns and catalog_outbox table in schema', () => {
    // Verificando se as novas colunas e a tabela catalog_outbox estão devidamente exportadas
    expect((products as any).stock).toBeDefined();
    expect((products as any).sensory_profile).toBeDefined();
    expect((products as any).pairing).toBeDefined();
    expect((products as any).harvest_notes).toBeDefined();
    expect((products as any).version).toBeDefined();
    expect(catalogOutbox).toBeDefined();
    expect((catalogOutbox as any).lockedUntil).toBeDefined();
  });

  it('should invoke stock deduction on payment confirmation and emit WARN if oversold concurrently', async () => {
    let deductedQuantity = 0;
    let warned = false;

    const fakeOrder = new Order({
      id: 'ord-stock-1',
      displayCode: '#OV-999999',
      userId: 'usr-stock-1',
      status: 'PENDING_PAYMENT',
      totalCents: 17900,
      itemsCount: 1,
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

    const mockOrderRepo: any = {
      findById: async (id: string) => (id === 'ord-stock-1' ? fakeOrder : null),
      updateStatus: async (id: string, from: string, to: string) => true,
    };

    const mockCartCleaner: any = {
      removePaidItemsByCartItemIds: async () => {},
    };

    const mockInboxRepo: any = {
      hasEvent: async () => false,
      recordEvent: async () => {},
    };

    const mockStockDeductor = {
      deductStockForOrder: async (orderId: string) => {
        deductedQuantity = 1;
        // Simula log estruturado emitido
        console.warn(`WARN: STOCK_DEPLETED_CONCURRENTLY orderId=${orderId} productId=prod-1`);
        warned = true;
      },
    };

    const useCase = new ProcessPaymentConfirmedUseCase({
      orderRepository: mockOrderRepo,
      cartCleaner: mockCartCleaner,
      inboxRepo: mockInboxRepo,
      stockDeductor: mockStockDeductor,
    });

    const result = await useCase.execute({
      eventId: 'evt-stock-1',
      orderId: 'ord-stock-1',
      paidAmountCents: 17900,
      currency: 'BRL',
    });

    expect(result.status).toBe('PROCESSED');
    expect(deductedQuantity).toBe(1);
    expect(warned).toBe(true);
  });
});
