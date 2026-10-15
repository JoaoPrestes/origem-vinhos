import type { OrderRepositoryPort } from '../ports/order-repository.port';
import type { Order } from '../domain/order.entity';

export class ListUserOrdersUseCase {
  constructor(private orderRepo: OrderRepositoryPort) {}

  async execute(userId: string): Promise<Order[]> {
    return await this.orderRepo.listByUser(userId);
  }
}
