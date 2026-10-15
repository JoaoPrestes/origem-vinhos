import type { PaymentRepositoryPort } from '../ports/payment-repository.port';
import type { PaymentGatewayPort } from '../ports/payment-gateway.port';

export interface ProcessWebhookInput {
  headers: Record<string, string>;
  body: any;
  rawBody: string;
}

export class ProcessPaymentWebhookUseCase {
  constructor(
    private paymentRepo: PaymentRepositoryPort,
    private paymentGateway: PaymentGatewayPort
  ) {}

  async execute(input: ProcessWebhookInput): Promise<{ status: string }> {
    const { headers, body, rawBody } = input;

    // 1. Validação de Assinatura Criptográfica HMAC
    const isValid = this.paymentGateway.verifyWebhookSignature(headers, rawBody);
    if (!isValid) {
      throw new Error('Assinatura de webhook inválida.');
    }

    // 2. Extrai ID do pagamento do payload do Mercado Pago
    const providerPaymentId = body?.data?.id || body?.id;
    if (!providerPaymentId) {
      return { status: 'IGNORED_NO_PAYMENT_ID' };
    }

    // 3. Consulta status consolidado oficial no gateway
    const officialStatus = await this.paymentGateway.getPaymentStatus(providerPaymentId);

    // 4. Localiza a tentativa no banco local (por providerPaymentId ou por id da tentativa)
    let attempt = await this.paymentRepo.findAttemptByProviderPaymentId(providerPaymentId);
    if (!attempt) {
      attempt = await this.paymentRepo.findAttemptById(providerPaymentId);
    }
    if (!attempt) {
      return { status: 'IGNORED_ATTEMPT_NOT_FOUND' };
    }

    // 5. Tratamento de Idempotência: Se já CONFIRMED ou FAILED, ignora
    if (attempt.status === 'CONFIRMED' || attempt.status === 'FAILED') {
      return { status: 'ALREADY_PROCESSED' };
    }

    // 6. Tratamento de Pagamento Tardio: Se expirou localmente
    if (attempt.status === 'EXPIRED') {
      if (officialStatus.status === 'CONFIRMED') {
        attempt.markPaidAfterExpiration(providerPaymentId);
        await this.paymentRepo.updateAttemptStatus(
          attempt.id,
          'PAID_AFTER_EXPIRATION',
          'Webhook confirmou pagamento após expiração local do Pix/Boleto.',
          providerPaymentId
        );
        return { status: 'PAID_AFTER_EXPIRATION_RECORDED' };
      }
      return { status: 'EXPIRED_IGNORED' };
    }

    // 7. Confirmação Normal com Gravação Atômica na Outbox (spec07 §8.3)
    if (officialStatus.status === 'CONFIRMED') {
      const outboxEventId = crypto.randomUUID();
      const outboxPayload = JSON.stringify({
        eventId: outboxEventId,
        orderId: attempt.orderId,
        paymentAttemptId: attempt.id,
        userId: attempt.userId,
        paidAmountCents: attempt.amountCents,
        amountCents: attempt.amountCents,
        currency: 'BRL',
        cartItemIds: [],
        occurredAt: new Date().toISOString(),
      });

      await this.paymentRepo.confirmPaymentWithOutbox({
        attemptId: attempt.id,
        providerPaymentId,
        historyReason: 'Pagamento confirmado oficialmente via Webhook Mercado Pago.',
        outboxEvent: {
          id: outboxEventId,
          eventType: 'PAYMENT_CONFIRMED',
          payload: outboxPayload,
          status: 'PENDING',
        },
      });

      return { status: 'PROCESSED' };
    }

    if (officialStatus.status === 'FAILED') {
      await this.paymentRepo.updateAttemptStatus(
        attempt.id,
        'FAILED',
        'Pagamento recusado notificado via Webhook.'
      );
      return { status: 'FAILED_RECORDED' };
    }

    return { status: 'UNHANDLED_STATUS' };
  }
}
