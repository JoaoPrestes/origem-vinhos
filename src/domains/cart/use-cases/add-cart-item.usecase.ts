import { CartRepository } from '../cart.repository';
import { CatalogRepository } from '../../catalog/catalog.repository';
import { addToCartSchema } from '../schema';
import { z } from 'zod';

export type AddToCartInput = z.infer<typeof addToCartSchema>;

export class AddCartItemUseCase {
  constructor(
    private cartRepository = new CartRepository(),
    private catalogRepository = new CatalogRepository()
  ) {}

  async execute(userId: string, input: AddToCartInput) {
    const parsedData = addToCartSchema.parse(input);

    const product = await this.catalogRepository.findActiveById(parsedData.productId);
    if (!product) {
      throw new Error('Produto não encontrado ou indisponível.');
    }

    const existingItem = await this.cartRepository.findByUserAndProduct(userId, parsedData.productId);

    if (existingItem) {
      const newQuantity = existingItem.quantity + parsedData.quantity;
      return await this.cartRepository.updateQuantity(existingItem.id, newQuantity);
    } else {
      return await this.cartRepository.addItem({
        userId,
        productId: parsedData.productId,
        quantity: parsedData.quantity,
      });
    }
  }
}
