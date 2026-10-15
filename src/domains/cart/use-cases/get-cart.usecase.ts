import { CartRepository } from '../cart.repository';

export class GetCartUseCase {
  constructor(private cartRepository = new CartRepository()) {}

  async execute(userId: string) {
    const rawItems = await this.cartRepository.listByUser(userId);

    // Filtrar e remover itens cujos produtos sofreram soft delete (deletedAt != null)
    const softDeletedIds = rawItems
      .filter(item => item.product.deletedAt !== null)
      .map(item => item.id);

    if (softDeletedIds.length > 0) {
      await this.cartRepository.removeMultipleItems(softDeletedIds);
    }

    const activeItems = rawItems.filter(item => item.product.deletedAt === null);

    const items = activeItems.map(item => {
      const unitPrice = parseFloat(item.product.price);
      const subtotal = unitPrice * item.quantity;
      return {
        id: item.id,
        quantity: item.quantity,
        unitPrice: unitPrice.toFixed(2),
        subtotal: subtotal.toFixed(2),
        product: {
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          image: item.product.image,
          description: item.product.description,
          type: item.product.type,
          grape: item.product.grape,
          country: item.product.country,
          harvest: item.product.harvest,
          alcohol: item.product.alcohol,
        },
      };
    });

    const totalAmountNumber = items.reduce((acc, item) => acc + parseFloat(item.subtotal), 0);

    return {
      items,
      totalAmount: totalAmountNumber.toFixed(2),
      itemCount: items.reduce((acc, item) => acc + item.quantity, 0),
    };
  }
}
