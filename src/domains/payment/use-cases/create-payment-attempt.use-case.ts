import { PaymentAttempt, type PaymentMethod } from '../domain/payment-attempt.entity';
import type { PaymentRepositoryPort } from '../ports/payment-repository.port';
import type { PaymentGatewayPort } from '../ports/payment-gateway.port';

export interface CreatePaymentAttemptInput {
  orderId: string;
  userId: string;
  method: PaymentMethod;
  installments?: number;
  cardToken?: string;
}

export class CreatePaymentAttemptUseCase {
  private paymentRepo: PaymentRepositoryPort;
  private paymentGateway: PaymentGatewayPort;
  private orderPort: any;

  constructor(deps: {
    paymentRepository: PaymentRepositoryPort;
    paymentGateway: PaymentGatewayPort;
    orderPort: any;
  }) {
    this.paymentRepo = deps.paymentRepository;
    this.paymentGateway = deps.paymentGateway;
    this.orderPort = deps.orderPort;
  }

  async execute(input: CreatePaymentAttemptInput): Promise<{ attempt: PaymentAttempt }> {
    const { orderId, userId, method, installments = 1, cardToken } = input;

    // 1. Obtém snapshot soberano do pedido
    const orderSnapshot = await this.orderPort.getOrderSnapshot(orderId);
    if (!orderSnapshot) {
      throw new Error('Pedido não encontrado para cobrança.');
    }
    if (orderSnapshot.userId !== userId) {
      throw new Error('Acesso não autorizado: Pedido pertence a outro usuário.');
    }

    // 2. Calcula número da tentativa
    const previousAttempt = await this.paymentRepo.findLatestAttemptByOrderId(orderId);
    let attemptNumber = 1;
    if (previousAttempt) {
      if (previousAttempt.status === 'CONFIRMED') {
        throw new Error('Este pedido já possui pagamento aprovado.');
      }
      attemptNumber = previousAttempt.attemptNumber + 1;
    }

    // 3. Define expiração UTC conforme a regra de negócio
    const now = Date.now();
    let expiresAt: Date;
    if (method === 'PIX') {
      expiresAt = new Date(now + 30 * 60 * 1000); // Exatamente 30 minutos
    } else if (method === 'BOLETO') {
      expiresAt = new Date(now + 3 * 24 * 60 * 60 * 1000); // 3 dias úteis
    } else {
      expiresAt = new Date(now + 24 * 60 * 60 * 1000); // 24h para cartão
    }

    const attemptId = crypto.randomUUID();
    const providerIdempotencyKey = `pay_idemp_${orderId}_${attemptNumber}_${Date.now()}`;

    // 4. Persistência Prévia com status PENDING (fora do disparo HTTP)
    const initialAttempt = new PaymentAttempt({
      id: attemptId,
      orderId,
      userId,
      attemptNumber,
      method,
      installments,
      amountCents: orderSnapshot.totalCents,
      status: 'PENDING',
      providerName: 'mercadopago',
      providerPaymentId: null,
      providerIdempotencyKey,
      qrCodePix: null,
      qrCodePixUrl: null,
      boletoBarcode: null,
      boletoUrl: null,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.paymentRepo.saveAttempt(initialAttempt, `Iniciação de tentativa de pagamento #${attemptNumber}`);

    // 5. Disparo HTTP ao Provedor Externo (FORA da transação SQL)
    try {
      const gatewayResult = await this.paymentGateway.createPayment({
        attemptId,
        orderId,
        userId,
        amountCents: orderSnapshot.totalCents,
        currency: orderSnapshot.currency ?? 'BRL',
        method,
        installments,
        cardToken,
        providerIdempotencyKey,
      });

      if (gatewayResult.status === 'CONFIRMED') {
        initialAttempt.confirm(gatewayResult.providerPaymentId);

        const outboxEventId = crypto.randomUUID();
        const outboxPayload = JSON.stringify({
          eventId: outboxEventId,
          orderId: initialAttempt.orderId,
          paymentAttemptId: initialAttempt.id,
          userId: initialAttempt.userId,
          paidAmountCents: initialAttempt.amountCents,
          amountCents: initialAttempt.amountCents,
          currency: 'BRL',
          cartItemIds: orderSnapshot.cartItemIds || [],
          occurredAt: new Date().toISOString(),
        });

        await this.paymentRepo.confirmPaymentWithOutbox({
          attemptId,
          providerPaymentId: gatewayResult.providerPaymentId || `provider_${attemptId}`,
          historyReason: `Pagamento aprovado síncronamente via ${method}.`,
          outboxEvent: {
            id: outboxEventId,
            eventType: 'PAYMENT_CONFIRMED',
            payload: outboxPayload,
            status: 'PENDING',
          },
        });
      } else {
        if (gatewayResult.status === 'FAILED') {
          initialAttempt.fail('Recusa informada pelo provedor externo');
        }

        await this.paymentRepo.updateAttemptStatus(
          attemptId,
          gatewayResult.status,
          `Resposta do gateway: ${gatewayResult.status}`,
          gatewayResult.providerPaymentId
        );
      }

      const updatedAttempt = new PaymentAttempt({
        ...initialAttempt.toJSON(),
        providerPaymentId: gatewayResult.providerPaymentId,
        qrCodePix: gatewayResult.qrCodePix ?? null,
        qrCodePixUrl: gatewayResult.qrCodePixUrl ?? null,
        boletoBarcode: gatewayResult.boletoBarcode ?? null,
        boletoUrl: gatewayResult.boletoUrl ?? null,
        status: gatewayResult.status,
      });

      return { attempt: updatedAttempt };
    } catch (err: any) {
      initialAttempt.fail(err.message ?? 'Falha de comunicação com gateway');
      await this.paymentRepo.updateAttemptStatus(attemptId, 'FAILED', `Erro de comunicação: ${err.message}`);
      throw err;
    }
  }
}
