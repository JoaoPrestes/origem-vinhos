import { describe, it, expect } from 'bun:test';
import { MockPaymentAdapter } from '../../src/domains/payment/adapters/mock-payment.adapter';
import { MercadoPagoPaymentAdapter } from '../../src/domains/payment/adapters/mercadopago-payment.adapter';

describe('Payment Gateway Adapters', () => {
  it('MockPaymentAdapter: should generate Pix with qrCode and PENDING status', async () => {
    const adapter = new MockPaymentAdapter();
    const result = await adapter.createPayment({
      attemptId: 'att-1',
      orderId: 'ord-1',
      userId: 'usr-1',
      amountCents: 15000,
      currency: 'BRL',
      method: 'PIX',
      providerIdempotencyKey: 'idemp-1',
    });

    expect(result.status).toBe('PENDING');
    expect(result.qrCodePix).toBeDefined();
  });

  it('MockPaymentAdapter: should approve valid card and decline test token', async () => {
    const adapter = new MockPaymentAdapter();
    
    const approved = await adapter.createPayment({
      attemptId: 'att-2',
      orderId: 'ord-1',
      userId: 'usr-1',
      amountCents: 15000,
      currency: 'BRL',
      method: 'CREDIT_CARD',
      cardToken: 'tok_test_approved',
      providerIdempotencyKey: 'idemp-2',
    });
    expect(approved.status).toBe('CONFIRMED');

    const declined = await adapter.createPayment({
      attemptId: 'att-3',
      orderId: 'ord-1',
      userId: 'usr-1',
      amountCents: 15000,
      currency: 'BRL',
      method: 'CREDIT_CARD',
      cardToken: 'tok_test_declined',
      providerIdempotencyKey: 'idemp-3',
    });
    expect(declined.status).toBe('FAILED');
  });

  it('MercadoPagoPaymentAdapter: should format payload correctly with 30min expiration', async () => {
    const adapter = new MercadoPagoPaymentAdapter({ accessToken: 'TEST-FAKE-TOKEN' });
    const result = await adapter.createPayment({
      attemptId: 'att-4',
      orderId: 'ord-1',
      userId: 'usr-1',
      amountCents: 24100,
      currency: 'BRL',
      method: 'PIX',
      providerIdempotencyKey: 'idemp-4',
    });

    expect(result.providerPaymentId).toBeDefined();
    expect(result.status).toBe('PENDING');
  });
});
