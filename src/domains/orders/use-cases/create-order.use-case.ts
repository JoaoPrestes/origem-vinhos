import { Order } from '../domain/order.entity';
import type { OrderRepositoryPort, OrderItemSnapshot } from '../ports/order-repository.port';
import type {
  CartRepositoryPort,
  CatalogRepositoryPort,
  AddressRepositoryPort,
} from '../ports/order-external-dependencies.port';
import { parseNumericPriceToCents } from '../utils/money.utils';

export interface CreateOrderInput {
  userId: string;
  addressId: string;
  recipientName: string;
  idempotencyKey?: string;
}

export interface CreateOrderOutput {
  order: Order;
  items: OrderItemSnapshot[];
}

export interface CreateOrderDependencies {
  orderRepository: OrderRepositoryPort;
  cartRepository: CartRepositoryPort;
  catalogRepository: CatalogRepositoryPort;
  addressRepository: AddressRepositoryPort;
}

export class CreateOrderUseCase {
  private orderRepo: OrderRepositoryPort;
  private cartRepo: CartRepositoryPort;
  private catalogRepo: CatalogRepositoryPort;
  private addressRepo: AddressRepositoryPort;

  constructor(dependencies: CreateOrderDependencies) {
    this.orderRepo = dependencies.orderRepository;
    this.cartRepo = dependencies.cartRepository;
    this.catalogRepo = dependencies.catalogRepository;
    this.addressRepo = dependencies.addressRepository;
  }

  async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
    const { userId, addressId, recipientName, idempotencyKey } = input;

    // 1. Validação de Idempotência
    let requestHash = '';
    if (idempotencyKey) {
      requestHash = `${userId}:${addressId}`;
      const existing = await this.orderRepo.findIdempotency(idempotencyKey, userId);
      if (existing) {
        if (existing.status === 'PROCESSING') {
          throw new Error('CONFLITO_IDEMPOTENCIA: Requisição em processamento concorrente.');
        }
        if (existing.status === 'COMPLETED' && existing.orderId) {
          const cachedOrder = await this.orderRepo.findById(existing.orderId);
          if (cachedOrder) {
            return { order: cachedOrder, items: [] };
          }
        }
      }

      await this.orderRepo.saveIdempotency({
        idempotencyKey,
        userId,
        requestHash,
        status: 'PROCESSING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      });
    }

    try {
      // 2. Busca e valida itens no carrinho
      const cartItems = await this.cartRepo.listByUser(userId);
      if (!cartItems || cartItems.length === 0) {
        throw new Error('O carrinho está vazio.');
      }

      // 3. Valida endereço de entrega
      const address = await this.addressRepo.findById(addressId, userId);
      if (!address || address.userId !== userId) {
        throw new Error('Endereço de entrega inválido ou não pertence ao usuário.');
      }

      // 4. Valida produtos no catálogo e calcula totais em centavos no servidor
      let totalCents = 0;
      let itemsCount = 0;
      const orderItemsSnapshots: OrderItemSnapshot[] = [];

      for (const cartItem of cartItems) {
        const product = await this.catalogRepo.findById(cartItem.product.id);
        if (!product || product.deletedAt !== null) {
          throw new Error(`O vinho "${cartItem.product.name}" não está mais disponível no catálogo.`);
        }

        const unitPriceCents = parseNumericPriceToCents(product.price);
        const subtotalCents = unitPriceCents * cartItem.quantity;
        totalCents += subtotalCents;
        itemsCount += cartItem.quantity;

        orderItemsSnapshots.push({
          productId: product.id,
          cartItemId: cartItem.id,
          productName: product.name,
          productImage: product.image,
          productType: product.type,
          productGrape: product.grape,
          productHarvest: Number(product.harvest),
          unitPriceCents,
          quantity: cartItem.quantity,
          subtotalCents,
        });
      }

      // 5. Gera código de rastreio amigável único (#OV-XXXXXX)
      const randomCode = Math.floor(100000 + Math.random() * 900000);
      const displayCode = `#OV-${randomCode}`;
      const orderId = crypto.randomUUID();

      const order = new Order({
        id: orderId,
        displayCode,
        userId,
        status: 'PENDING_PAYMENT',
        totalCents,
        itemsCount,
        currency: 'BRL',
        shippingRecipientName: recipientName,
        shippingZipCode: address.zipCode,
        shippingStreet: address.street,
        shippingNumber: address.number,
        shippingComplement: address.complement ?? null,
        shippingNeighborhood: address.neighborhood,
        shippingCity: address.city,
        shippingState: address.state,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 6. Persiste pedido e snapshots atômicos
      const savedOrder = await this.orderRepo.saveWithSnapshot({
        order,
        items: orderItemsSnapshots,
        historyReason: 'Pedido criado com sucesso a partir do carrinho de compras.',
        idempotency: idempotencyKey
          ? {
              idempotencyKey,
              userId,
              requestHash,
              status: 'COMPLETED',
              orderId,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            }
          : undefined,
      });

      return {
        order: savedOrder,
        items: orderItemsSnapshots,
      };
    } catch (error) {
      if (idempotencyKey) {
        await this.orderRepo.updateIdempotencyStatus(idempotencyKey, userId, 'FAILED');
      }
      throw error;
    }
  }
}
