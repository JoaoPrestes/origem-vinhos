import { CartRepository } from '../cart.repository';
import { updateCartItemSchema } from '../schema';
import { z } from 'zod';

export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export class UpdateCartItemQuantityUseCase {
  constructor(private cartRepository = new CartRepository()) {}

  async execute(userId: string, itemId: string, input: UpdateCartItemInput) {
    const parsedData = updateCartItemSchema.parse(input);

    const userItems = await this.cartRepository.listByUser(userId);
    const targetItem = userItems.find(item => item.id === itemId);

    if (!targetItem) {
      throw new Error('Item não encontrado no carrinho do usuário.');
    }

    if (parsedData.quantity <= 0) {
      await this.cartRepository.removeItem(itemId);
      return { message: 'Item removido do carrinho.' };
    }

    const updatedItem = await this.cartRepository.updateQuantity(itemId, parsedData.quantity);
    return { message: 'Quantidade atualizada.', item: updatedItem };
  }
}
