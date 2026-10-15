import { describe, it, expect, beforeEach } from 'bun:test';
import { GetOrderDetailsUseCase } from '../../src/domains/orders/use-cases/get-order-details.use-case';
import { ListUserOrdersUseCase } from '../../src/domains/orders/use-cases/list-user-orders.use-case';
import { CancelPendingOrderUseCase } from '../../src/domains/orders/use-cases/cancel-pending-order.use-case';
import { Order } from '../../src/domains/orders/domain/order.entity';
import type { OrderRepositoryPort } from '../../src/domains/orders/ports/order-repository.port';

describe('Order Queries & Cancellation Use Cases', () => {
  let mockOrderRepo: OrderRepositoryPort;

  beforeEach(() => {
    const fakeOrder = new Order({
      id: 'ord-123',
      displayCode: '#OV-123456',
      userId: 'usr-dono',
      status: 'PENDING_PAYMENT',
      totalCents: 15000,
      itemsCount: 1,
      currency: 'BRL',
      shippingRecipientName: 'Dono',
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
      findByDisplayCode: async (code) => (code === '#OV-123456' ? fakeOrder : null),
      listByUser: async (userId) => (userId === 'usr-dono' ? [fakeOrder] : []),
      updateStatus: async (id, from, to) => {
        if (id === 'ord-123' && fakeOrder.status === from) {
          fakeOrder.cancel('Cancelado');
          return true;
        }
        return false;
      },
      findIdempotency: async () => null,
      saveIdempotency: async () => {},
      updateIdempotencyStatus: async () => {},
    };
  });

  it('GetOrderDetailsUseCase: should allow owner or admin to view order', async () => {
    const useCase = new GetOrderDetailsUseCase(mockOrderRepo);

    const orderOwner = await useCase.execute({
      orderId: 'ord-123',
      requestingUserId: 'usr-dono',
      userRole: 'Customer',
    });
    expect(orderOwner.id).toBe('ord-123');

    const orderAdmin = await useCase.execute({
      orderId: 'ord-123',
      requestingUserId: 'usr-admin',
      userRole: 'Admin',
    });
    expect(orderAdmin.id).toBe('ord-123');
  });

  it('GetOrderDetailsUseCase: should block Anti-IDOR (other customer viewing order)', async () => {
    const useCase = new GetOrderDetailsUseCase(mockOrderRepo);

    expect(
      useCase.execute({
        orderId: 'ord-123',
        requestingUserId: 'usr-intruso',
        userRole: 'Customer',
      })
    ).rejects.toThrow('Acesso não autorizado');
  });

  it('ListUserOrdersUseCase: should list orders belonging to user', async () => {
    const useCase = new ListUserOrdersUseCase(mockOrderRepo);
    const orders = await useCase.execute('usr-dono');
    expect(orders.length).toBe(1);
    expect(orders[0].displayCode).toBe('#OV-123456');
  });

  it('CancelPendingOrderUseCase: should allow owner to cancel pending order', async () => {
    const useCase = new CancelPendingOrderUseCase(mockOrderRepo);
    const result = await useCase.execute({
      orderId: 'ord-123',
      userId: 'usr-dono',
      reason: 'Desisti da compra',
    });
    expect(result.success).toBe(true);
    expect(result.order.status).toBe('CANCELLED');
  });
});
