import type { OrderRepositoryPort } from '../ports/order-repository.port';
import type { Order } from '../domain/order.entity';

export interface CancelPendingOrderInput {
  orderId: string;
  userId: string;
  reason: string;
}

export class CancelPendingOrderUseCase {
  constructor(private orderRepo: OrderRepositoryPort) {}

  async execute(input: CancelPendingOrderInput): Promise<{ success: boolean; order: Order }> {
    const { orderId, userId, reason } = input;

    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new Error('Pedido não encontrado.');
    }

    if (order.userId !== userId) {
      throw new Error('Acesso não autorizado: Você só pode cancelar seus próprios pedidos.');
    }

    if (order.status !== 'PENDING_PAYMENT') {
      throw new Error(`O pedido não pode ser cancelado pois está no status ${order.status}.`);
    }

    const updated = await this.orderRepo.updateStatus(orderId, 'PENDING_PAYMENT', 'CANCELLED', reason);
    if (!updated) {
      throw new Error('Não foi possível cancelar o pedido. O status pode ter sido alterado concorrentemente.');
    }

    order.cancel(reason);

    return {
      success: true,
      order,
    };
  }
}
