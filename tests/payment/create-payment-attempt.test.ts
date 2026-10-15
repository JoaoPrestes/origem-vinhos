import { describe, it, expect, beforeEach } from 'bun:test';
import { CreatePaymentAttemptUseCase } from '../../src/domains/payment/use-cases/create-payment-attempt.use-case';
import { PaymentAttempt } from '../../src/domains/payment/domain/payment-attempt.entity';
import type { PaymentRepositoryPort } from '../../src/domains/payment/ports/payment-repository.port';
import type { PaymentGatewayPort } from '../../src/domains/payment/ports/payment-gateway.port';

describe('CreatePaymentAttemptUseCase', () => {
  let mockPaymentRepo: PaymentRepositoryPort;
  let mockGateway: PaymentGatewayPort;
  let mockOrderPort: any;

  beforeEach(() => {
    mockPaymentRepo = {
      saveAttempt: async (attempt) => attempt,
      findAttemptById: async () => null,
      findAttemptByProviderPaymentId: async () => null,
      findLatestAttemptByOrderId: async () => null,
      updateAttemptStatus: async () => {},
      confirmPaymentWithOutbox: async () => {},
      listPendingOutboxEvents: async () => [],
      markOutboxProcessed: async () => {},
    };

    mockGateway = {
      createPayment: async (params) => ({
        providerPaymentId: 'pay_mock_123',
        status: params.method === 'CREDIT_CARD' ? 'CONFIRMED' : 'PENDING',
        qrCodePix: params.method === 'PIX' ? 'pix-copia-cola' : undefined,
        rawResponse: {},
      }),
      getPaymentStatus: async () => ({ providerPaymentId: '1', status: 'CONFIRMED', amountCents: 15000, currency: 'BRL' }),
      verifyWebhookSignature: () => true,
    };

    mockOrderPort = {
      getOrderSnapshot: async (orderId: string) => ({
        orderId,
        userId: 'usr-1',
        totalCents: 24100,
        currency: 'BRL',
        items: [{ productId: 'p1', cartItemId: 'c1', productName: 'Vinho', unitPriceCents: 24100, quantity: 1 }],
      }),
    };
  });

  it('should create a Pix payment attempt with 30 min expiration', async () => {
    const useCase = new CreatePaymentAttemptUseCase({
      paymentRepository: mockPaymentRepo,
      paymentGateway: mockGateway,
      orderPort: mockOrderPort,
    });

    const result = await useCase.execute({
      orderId: 'ord-1',
      userId: 'usr-1',
      method: 'PIX',
    });

    expect(result.attempt).toBeDefined();
    expect(result.attempt.amountCents).toBe(24100);
    expect(result.attempt.status).toBe('PENDING');
    expect(result.attempt.qrCodePix).toBe('pix-copia-cola');
    expect(result.attempt.expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * 60 * 1000);
  });

  it('should increment attempt_number if previous attempt failed', async () => {
    mockPaymentRepo.findLatestAttemptByOrderId = async () => new PaymentAttempt({
      id: 'att-old',
      orderId: 'ord-1',
      userId: 'usr-1',
      attemptNumber: 1,
      method: 'CREDIT_CARD',
      installments: 1,
      amountCents: 24100,
      status: 'FAILED',
      providerName: 'mock',
      providerPaymentId: 'pay-fail',
      providerIdempotencyKey: 'idemp-old',
      qrCodePix: null,
      qrCodePixUrl: null,
      boletoBarcode: null,
      boletoUrl: null,
      expiresAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const useCase = new CreatePaymentAttemptUseCase({
      paymentRepository: mockPaymentRepo,
      paymentGateway: mockGateway,
      orderPort: mockOrderPort,
    });

    const result = await useCase.execute({
      orderId: 'ord-1',
      userId: 'usr-1',
      method: 'CREDIT_CARD',
      cardToken: 'tok_test_approved',
    });

    expect(result.attempt.attemptNumber).toBe(2);
  });
});
