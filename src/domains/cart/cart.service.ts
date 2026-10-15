import { CartRepository } from './cart.repository';

export class CartService {
  private cartRepository: CartRepository;

  constructor() {
    this.cartRepository = new CartRepository();
  }

  // Retorna os itens ativos do carrinho do usuário, expurgando automaticamente do banco
  // e do retorno quaisquer itens cujos vinhos sofreram soft delete (deletedAt não nulo).
  async getActiveCart(userId: string) {
    const rawItems = await this.cartRepository.listByUser(userId);
    
    const activeItems: typeof rawItems = [];
    const inactiveItemIds: string[] = [];
    
    // Separa os itens ativos dos inativos (que sofreram soft delete)
    for (const item of rawItems) {
      if (item.product.deletedAt) {
        inactiveItemIds.push(item.id);
      } else {
        activeItems.push(item);
      }
    }
    
    // Expulsa os itens inativos/deletados logicamente do banco de dados de forma assíncrona
    if (inactiveItemIds.length > 0) {
      await this.cartRepository.removeMultipleItems(inactiveItemIds);
    }
    
    // Calcula o valor total e subtotal apenas para os itens que permaneceram ativos
    let totalAmount = 0;
    const formattedItems = activeItems.map(item => {
      const price = parseFloat(item.product.price);
      const subtotal = price * item.quantity;
      totalAmount += subtotal;
      
      return {
        id: item.id,
        quantity: item.quantity,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
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
        subtotal: subtotal.toFixed(2),
      };
    });

    return {
      items: formattedItems,
      total: totalAmount.toFixed(2),
    };
  }
}
