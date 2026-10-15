import { CartRepository } from '../cart.repository';

export class ClearCartUseCase {
  constructor(private cartRepository = new CartRepository()) {}

  async execute(userId: string) {
    await this.cartRepository.clearCart(userId);
    return true;
  }
}
