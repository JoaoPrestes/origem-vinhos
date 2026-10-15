import { describe, it, expect, beforeEach } from 'bun:test';
import { ProcessPaymentWebhookUseCase } from '../../src/domains/payment/use-cases/process-payment-webhook.use-case';
import { PaymentAttempt } from '../../src/domains/payment/domain/payment-attempt.entity';
import type { PaymentRepositoryPort } from '../../src/domains/payment/ports/payment-repository.port';
import type { PaymentGatewayPort } from '../../src/domains/payment/ports/payment-gateway.port';

describe('ProcessPaymentWebhookUseCase', () => {
  let mockPaymentRepo: PaymentRepositoryPort;
  let mockGateway: PaymentGatewayPort;
  let outboxRecords: any[];

  beforeEach(() => {
    outboxRecords = [];

    const pendingAttempt = new PaymentAttempt({
      id: 'att-123',
      orderId: 'ord-123',
      userId: 'usr-1',
      attemptNumber: 1,
      method: 'PIX',
      installments: 1,
      amountCents: 15000,
      status: 'PENDING',
      providerName: 'mercadopago',
      providerPaymentId: 'mp-pay-123',
      providerIdempotencyKey: 'idemp-123',
      qrCodePix: 'code',
      qrCodePixUrl: null,
      boletoBarcode: null,
      boletoUrl: null,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockPaymentRepo = {
      saveAttempt: async (a) => a,
      findAttemptById: async () => pendingAttempt,
      findAttemptByProviderPaymentId: async (pid) => (pid === 'mp-pay-123' ? pendingAttempt : null),
      findLatestAttemptByOrderId: async () => pendingAttempt,
      updateAttemptStatus: async () => {},
      confirmPaymentWithOutbox: async (params) => {
        outboxRecords.push(params.outboxEvent);
        pendingAttempt.confirm(params.providerPaymentId);
      },
      listPendingOutboxEvents: async () => outboxRecords,
      markOutboxProcessed: async () => {},
    };

    mockGateway = {
      createPayment: async () => ({ providerPaymentId: '1', status: 'PENDING', rawResponse: {} }),
      getPaymentStatus: async () => ({
        providerPaymentId: 'mp-pay-123',
        status: 'CONFIRMED',
        amountCents: 15000,
        currency: 'BRL',
      }),
      verifyWebhookSignature: (headers) => headers['x-signature'] === 'valid_token',
    };
  });

  it('should confirm payment and write PAYMENT_CONFIRMED to outbox in atomic transaction', async () => {
    const useCase = new ProcessPaymentWebhookUseCase(mockPaymentRepo, mockGateway);

    const result = await useCase.execute({
      headers: { 'x-signature': 'valid_token' },
      body: { data: { id: 'mp-pay-123' }, type: 'payment' },
      rawBody: JSON.stringify({ data: { id: 'mp-pay-123' } }),
    });

    expect(result.status).toBe('PROCESSED');
    expect(outboxRecords.length).toBe(1);
    expect(outboxRecords[0].eventType).toBe('PAYMENT_CONFIRMED');
    const payload = JSON.parse(outboxRecords[0].payload);
    expect(payload.orderId).toBe('ord-123');
    expect(payload.amountCents).toBe(15000);
  });

  it('should reject invalid webhook signatures with 401 Unauthorized error', async () => {
    const useCase = new ProcessPaymentWebhookUseCase(mockPaymentRepo, mockGateway);

    expect(
      useCase.execute({
        headers: { 'x-signature': 'invalid_signature' },
        body: { data: { id: 'mp-pay-123' } },
        rawBody: '...',
      })
    ).rejects.toThrow('Assinatura de webhook inválida');
  });
});
