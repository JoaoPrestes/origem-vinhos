import { describe, it, expect, beforeEach } from 'bun:test';
import { PaymentOutboxWorker } from '../../src/domains/payment/workers/payment-outbox.worker';
import type { OrderPaymentConsumerPort, OrderPaymentEvent } from '../../src/domains/orders/ports/order-payment-consumer.port';

describe('PaymentOutboxWorker (spec07 §6 & spec08 §7.3)', () => {
  let processedEvents: string[];
  let outboxStore: Array<{
    id: string;
    eventType: string;
    payload: string;
    status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
    retryCount: number;
    processedAt?: Date | null;
  }>;
  let mockConsumer: OrderPaymentConsumerPort;

  beforeEach(() => {
    processedEvents = [];
    outboxStore = [
      {
        id: 'outbox-1',
        eventType: 'PAYMENT_CONFIRMED',
        payload: JSON.stringify({
          eventId: 'evt-100',
          orderId: 'ord-100',
          paymentAttemptId: 'att-100',
          paidAmountCents: 15000,
          currency: 'BRL',
          cartItemIds: ['item-1', 'item-2'],
          occurredAt: new Date().toISOString(),
        }),
        status: 'PENDING',
        retryCount: 0,
      },
    ];

    mockConsumer = {
      consumePaymentConfirmed: async (event: OrderPaymentEvent) => {
        processedEvents.push(event.eventId);
        return { status: 'PROCESSED' };
      },
    };
  });

  it('should process pending outbox events and mark them as PROCESSED', async () => {
    const worker = new PaymentOutboxWorker({
      outboxRepo: {
        findPending: async (limit: number) => outboxStore.filter((e) => e.status === 'PENDING').slice(0, limit),
        markProcessed: async (id: string) => {
          const item = outboxStore.find((e) => e.id === id);
          if (item) {
            item.status = 'PROCESSED';
            item.processedAt = new Date();
          }
        },
        incrementRetry: async (id: string, error: string) => {
          const item = outboxStore.find((e) => e.id === id);
          if (item) {
            item.retryCount += 1;
            if (item.retryCount >= 3) item.status = 'FAILED';
          }
        },
      },
      consumer: mockConsumer,
    });

    const result = await worker.processBatch(10);

    expect(result.processedCount).toBe(1);
    expect(result.failedCount).toBe(0);
    expect(processedEvents).toContain('evt-100');
    expect(outboxStore[0]!.status).toBe('PROCESSED');
    expect(outboxStore[0]!.processedAt).toBeDefined();
  });

  it('should increment retryCount when consumer throws an error', async () => {
    const failingConsumer: OrderPaymentConsumerPort = {
      consumePaymentConfirmed: async () => {
        throw new Error('Database temporary connection failure');
      },
    };

    const worker = new PaymentOutboxWorker({
      outboxRepo: {
        findPending: async (limit: number) => outboxStore.filter((e) => e.status === 'PENDING').slice(0, limit),
        markProcessed: async (id: string) => {
          const item = outboxStore.find((e) => e.id === id);
          if (item) item.status = 'PROCESSED';
        },
        incrementRetry: async (id: string, _err: string) => {
          const item = outboxStore.find((e) => e.id === id);
          if (item) {
            item.retryCount += 1;
            if (item.retryCount >= 3) item.status = 'FAILED';
          }
        },
      },
      consumer: failingConsumer,
    });

    const result = await worker.processBatch(10);

    expect(result.processedCount).toBe(0);
    expect(result.failedCount).toBe(1);
    expect(outboxStore[0]!.status).toBe('PENDING');
    expect(outboxStore[0]!.retryCount).toBe(1);
  });
});
