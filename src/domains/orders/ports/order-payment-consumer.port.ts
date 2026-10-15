export interface OrderPaymentEvent {
  eventId: string;
  orderId: string;
  paymentAttemptId: string;
  paidAmountCents: number;
  currency: string;
  cartItemIds: string[];
  occurredAt: Date;
}

export interface OrderPaymentConsumerPort {
  consumePaymentConfirmed(event: OrderPaymentEvent): Promise<{ status: string }>;
  notifyOrderPaid?(event: OrderPaymentEvent): Promise<void>;
  notifyOrderPaymentExpired?(event: { eventId: string; orderId: string; paymentAttemptId: string; occurredAt: Date }): Promise<void>;
  notifyOrderPaymentFailed?(event: { eventId: string; orderId: string; paymentAttemptId: string; reason: string; occurredAt: Date }): Promise<void>;
}
