import type { OrderRepositoryPort } from '../ports/order-repository.port';
import type { Order } from '../domain/order.entity';

export interface GetOrderDetailsInput {
  orderId: string;
  requestingUserId: string;
  userRole?: string;
}

export class GetOrderDetailsUseCase {
  constructor(private orderRepo: OrderRepositoryPort) {}

  async execute(input: GetOrderDetailsInput): Promise<Order> {
    const { orderId, requestingUserId, userRole } = input;

    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new Error('Pedido não encontrado.');
    }

    // Regra Anti-IDOR: Usuário comum só visualiza os próprios pedidos
    if (order.userId !== requestingUserId && userRole !== 'Admin') {
      throw new Error('Acesso não autorizado aos dados deste pedido.');
    }

    return order;
  }
}
