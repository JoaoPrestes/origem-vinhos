import { db } from '../../../infra/db';
import { paymentAttempts, paymentHistory, paymentOutbox } from '../../../infra/schema';
import { eq, desc, and } from 'drizzle-orm';
import { PaymentAttempt, type PaymentAttemptStatus } from '../domain/payment-attempt.entity';
import type { PaymentRepositoryPort, PaymentOutboxRecord } from '../ports/payment-repository.port';

export class DrizzlePaymentRepository implements PaymentRepositoryPort {
  async saveAttempt(attempt: PaymentAttempt, historyReason: string): Promise<PaymentAttempt> {
    return await db.transaction(async (tx) => {
      await tx.insert(paymentAttempts).values({
        id: attempt.id,
        orderId: attempt.orderId,
        userId: attempt.userId,
        attemptNumber: attempt.attemptNumber,
        method: attempt.method,
        installments: attempt.installments,
        amountCents: attempt.amountCents,
        status: attempt.status,
        providerName: attempt.providerName,
        providerPaymentId: attempt.providerPaymentId,
        providerIdempotencyKey: attempt.providerIdempotencyKey,
        qrCodePix: attempt.qrCodePix,
        qrCodePixUrl: attempt.qrCodePixUrl,
        boletoBarcode: attempt.boletoBarcode,
        boletoUrl: attempt.boletoUrl,
        expiresAt: attempt.expiresAt,
        createdAt: attempt.createdAt,
        updatedAt: attempt.updatedAt,
      });

      await tx.insert(paymentHistory).values({
        paymentAttemptId: attempt.id,
        fromStatus: null,
        toStatus: attempt.status,
        reason: historyReason,
        createdAt: new Date(),
      });

      return attempt;
    });
  }

  async findAttemptById(id: string): Promise<PaymentAttempt | null> {
    const res = await db.select().from(paymentAttempts).where(eq(paymentAttempts.id, id)).limit(1);
    if (!res[0]) return null;
    return this.mapToDomain(res[0]);
  }

  async findAttemptByProviderPaymentId(providerPaymentId: string): Promise<PaymentAttempt | null> {
    const res = await db.select().from(paymentAttempts).where(eq(paymentAttempts.providerPaymentId, providerPaymentId)).limit(1);
    if (!res[0]) return null;
    return this.mapToDomain(res[0]);
  }

  async findLatestAttemptByOrderId(orderId: string): Promise<PaymentAttempt | null> {
    const res = await db.select().from(paymentAttempts).where(eq(paymentAttempts.orderId, orderId)).orderBy(desc(paymentAttempts.attemptNumber)).limit(1);
    if (!res[0]) return null;
    return this.mapToDomain(res[0]);
  }

  async updateAttemptStatus(id: string, status: PaymentAttemptStatus, reason: string, providerPaymentId?: string): Promise<void> {
    await db.transaction(async (tx) => {
      const current = await tx.select().from(paymentAttempts).where(eq(paymentAttempts.id, id)).limit(1);
      const fromStatus = current[0]?.status ?? null;

      await tx.update(paymentAttempts).set({
        status,
        providerPaymentId: providerPaymentId ?? current[0]?.providerPaymentId,
        updatedAt: new Date(),
      }).where(eq(paymentAttempts.id, id));

      await tx.insert(paymentHistory).values({
        paymentAttemptId: id,
        fromStatus,
        toStatus: status,
        reason,
        createdAt: new Date(),
      });
    });
  }

  async confirmPaymentWithOutbox(params: {
    attemptId: string;
    providerPaymentId: string;
    outboxEvent: PaymentOutboxRecord;
    historyReason: string;
  }): Promise<void> {
    const { attemptId, providerPaymentId, outboxEvent, historyReason } = params;

    await db.transaction(async (tx) => {
      // 1. Atualiza a tentativa para CONFIRMED
      await tx.update(paymentAttempts).set({
        status: 'CONFIRMED',
        providerPaymentId,
        updatedAt: new Date(),
      }).where(eq(paymentAttempts.id, attemptId));

      // 2. Grava histórico
      await tx.insert(paymentHistory).values({
        paymentAttemptId: attemptId,
        fromStatus: 'PENDING',
        toStatus: 'CONFIRMED',
        reason: historyReason,
        createdAt: new Date(),
      });

      // 3. Grava na Outbox na MESMA transação
      await tx.insert(paymentOutbox).values({
        eventType: outboxEvent.eventType,
        payload: outboxEvent.payload,
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date(),
      });
    });
  }

  async listPendingOutboxEvents(limit = 20): Promise<PaymentOutboxRecord[]> {
    const res = await db.select().from(paymentOutbox).where(eq(paymentOutbox.status, 'PENDING')).limit(limit);
    return res.map(row => ({
      id: row.id,
      eventType: row.eventType,
      payload: row.payload,
      status: row.status,
      retryCount: row.retryCount,
      createdAt: row.createdAt,
      processedAt: row.processedAt,
    }));
  }

  async markOutboxProcessed(id: string): Promise<void> {
    await db.update(paymentOutbox).set({
      status: 'PROCESSED',
      processedAt: new Date(),
    }).where(eq(paymentOutbox.id, id));
  }

  private mapToDomain(row: typeof paymentAttempts.$inferSelect): PaymentAttempt {
    return new PaymentAttempt({
      id: row.id,
      orderId: row.orderId,
      userId: row.userId,
      attemptNumber: row.attemptNumber,
      method: row.method,
      installments: row.installments,
      amountCents: row.amountCents,
      status: row.status,
      providerName: row.providerName,
      providerPaymentId: row.providerPaymentId,
      providerIdempotencyKey: row.providerIdempotencyKey,
      qrCodePix: row.qrCodePix,
      qrCodePixUrl: row.qrCodePixUrl,
      boletoBarcode: row.boletoBarcode,
      boletoUrl: row.boletoUrl,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
