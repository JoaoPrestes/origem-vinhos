import type { OrderPaymentConsumerPort, OrderPaymentEvent } from '../ports/order-payment-consumer.port';
import { ProcessPaymentConfirmedUseCase } from '../use-cases/process-payment-confirmed.use-case';

export class OrderPaymentConsumerAdapter implements OrderPaymentConsumerPort {
  constructor(private useCase: ProcessPaymentConfirmedUseCase) {}

  async consumePaymentConfirmed(event: OrderPaymentEvent): Promise<{ status: string }> {
    return this.useCase.execute(event);
  }
}
