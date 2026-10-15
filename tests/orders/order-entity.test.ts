import { describe, it, expect } from 'bun:test';
import { Order, type OrderStatus } from '../../src/domains/orders/domain/order.entity';

describe('Order Domain Entity & State Machine', () => {
  it('should instantiate an order in PENDING_PAYMENT status', () => {
    const order = new Order({
      id: 'ord-1',
      displayCode: '#OV-123456',
      userId: 'usr-1',
      status: 'PENDING_PAYMENT',
      totalCents: 24000,
      itemsCount: 2,
      currency: 'BRL',
      shippingRecipientName: 'Cliente Teste',
      shippingZipCode: '01001-000',
      shippingStreet: 'Praça da Sé',
      shippingNumber: '100',
      shippingComplement: 'Apto 1',
      shippingNeighborhood: 'Sé',
      shippingCity: 'São Paulo',
      shippingState: 'SP',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(order.status).toBe('PENDING_PAYMENT');
  });

  it('should allow valid transition from PENDING_PAYMENT to PAID', () => {
    const order = new Order({
      id: 'ord-1',
      displayCode: '#OV-123456',
      userId: 'usr-1',
      status: 'PENDING_PAYMENT',
      totalCents: 24000,
      itemsCount: 2,
      currency: 'BRL',
      shippingRecipientName: 'Cliente Teste',
      shippingZipCode: '01001-000',
      shippingStreet: 'Praça da Sé',
      shippingNumber: '100',
      shippingComplement: 'Apto 1',
      shippingNeighborhood: 'Sé',
      shippingCity: 'São Paulo',
      shippingState: 'SP',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    order.markAsPaid();
    expect(order.status).toBe('PAID');
  });

  it('should allow cancellation from PENDING_PAYMENT', () => {
    const order = new Order({
      id: 'ord-1',
      displayCode: '#OV-123456',
      userId: 'usr-1',
      status: 'PENDING_PAYMENT',
      totalCents: 24000,
      itemsCount: 2,
      currency: 'BRL',
      shippingRecipientName: 'Cliente Teste',
      shippingZipCode: '01001-000',
      shippingStreet: 'Praça da Sé',
      shippingNumber: '100',
      shippingComplement: null,
      shippingNeighborhood: 'Sé',
      shippingCity: 'São Paulo',
      shippingState: 'SP',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    order.cancel('Cancelado pelo cliente');
    expect(order.status).toBe('CANCELLED');
  });

  it('should NOT allow re-activating a CANCELLED order to PAID', () => {
    const order = new Order({
      id: 'ord-1',
      displayCode: '#OV-123456',
      userId: 'usr-1',
      status: 'CANCELLED',
      totalCents: 24000,
      itemsCount: 2,
      currency: 'BRL',
      shippingRecipientName: 'Cliente Teste',
      shippingZipCode: '01001-000',
      shippingStreet: 'Praça da Sé',
      shippingNumber: '100',
      shippingComplement: null,
      shippingNeighborhood: 'Sé',
      shippingCity: 'São Paulo',
      shippingState: 'SP',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(() => order.markAsPaid()).toThrow();
  });
});
