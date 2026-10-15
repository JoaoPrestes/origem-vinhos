import type { OrderPaymentConsumerPort, OrderPaymentEvent } from '../../orders/ports/order-payment-consumer.port';

export interface OutboxRecord {
  id: string;
  eventType: string;
  payload: string;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  retryCount: number;
  processedAt?: Date | null;
}

export interface PaymentOutboxRepositoryPort {
  findPending(limit: number): Promise<OutboxRecord[]>;
  markProcessed(id: string): Promise<void>;
  incrementRetry(id: string, error: string): Promise<void>;
}

export class PaymentOutboxWorker {
  private outboxRepo: PaymentOutboxRepositoryPort;
  private consumer: OrderPaymentConsumerPort;

  constructor(deps: {
    outboxRepo: PaymentOutboxRepositoryPort;
    consumer: OrderPaymentConsumerPort;
  }) {
    this.outboxRepo = deps.outboxRepo;
    this.consumer = deps.consumer;
  }

  async processBatch(limit: number = 20): Promise<{ processedCount: number; failedCount: number }> {
    const pendingEvents = await this.outboxRepo.findPending(limit);
    let processedCount = 0;
    let failedCount = 0;

    for (const record of pendingEvents) {
      try {
        if (record.eventType === 'PAYMENT_CONFIRMED') {
          const parsedPayload = JSON.parse(record.payload) as OrderPaymentEvent;
          await this.consumer.consumePaymentConfirmed(parsedPayload);
        }

        await this.outboxRepo.markProcessed(record.id);
        processedCount++;
      } catch (err: any) {
        failedCount++;
        const errorMessage = err?.message || 'Erro desconhecido ao processar evento de outbox';
        console.error(`[PaymentOutboxWorker] Falha ao processar evento outbox ${record.id}:`, errorMessage);
        await this.outboxRepo.incrementRetry(record.id, errorMessage);
      }
    }

    return { processedCount, failedCount };
  }
}
