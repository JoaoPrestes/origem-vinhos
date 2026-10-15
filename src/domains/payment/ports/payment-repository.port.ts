import type { PaymentAttempt, PaymentAttemptStatus } from '../domain/payment-attempt.entity';

export interface PaymentOutboxRecord {
  id?: string;
  eventType: string;
  payload: string;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  retryCount?: number;
  createdAt?: Date;
  processedAt?: Date | null;
}

export interface PaymentRepositoryPort {
  saveAttempt(attempt: PaymentAttempt, historyReason: string): Promise<PaymentAttempt>;
  findAttemptById(id: string): Promise<PaymentAttempt | null>;
  findAttemptByProviderPaymentId(providerPaymentId: string): Promise<PaymentAttempt | null>;
  findLatestAttemptByOrderId(orderId: string): Promise<PaymentAttempt | null>;
  updateAttemptStatus(id: string, status: PaymentAttemptStatus, reason: string, providerPaymentId?: string): Promise<void>;
  
  // Transactional Outbox
  confirmPaymentWithOutbox(params: {
    attemptId: string;
    providerPaymentId: string;
    outboxEvent: PaymentOutboxRecord;
    historyReason: string;
  }): Promise<void>;

  listPendingOutboxEvents(limit?: number): Promise<PaymentOutboxRecord[]>;
  markOutboxProcessed(id: string): Promise<void>;
}
