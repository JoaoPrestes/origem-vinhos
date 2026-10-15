import { CartRepository } from '../cart.repository';

export class RemoveCartItemUseCase {
  constructor(private cartRepository = new CartRepository()) {}

  async execute(userId: string, itemId: string) {
    const userItems = await this.cartRepository.listByUser(userId);
    const targetItem = userItems.find(item => item.id === itemId);

    if (!targetItem) {
      throw new Error('Item não encontrado no carrinho do usuário.');
    }

    return await this.cartRepository.removeItem(itemId);
  }
}
