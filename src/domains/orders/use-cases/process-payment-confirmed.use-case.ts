import type { OrderRepositoryPort } from '../ports/order-repository.port';
import type { OrderCartCleanerPort } from '../ports/order-cart-cleaner.port';
import type { OrderPaymentEvent } from '../ports/order-payment-consumer.port';
import type { OrderStockDeductorPort } from '../ports/order-stock-deductor.port';

export class ProcessPaymentConfirmedUseCase {
  private orderRepo: OrderRepositoryPort;
  private cartCleaner: OrderCartCleanerPort;
  private inboxRepo: {
    hasEvent: (id: string) => Promise<boolean>;
    recordEvent: (id: string, orderId: string, status: string, error?: string) => Promise<void>;
  };
  private itemsRepo?: {
    findCartItemIdsByOrderId: (orderId: string) => Promise<string[]>;
  };
  private stockDeductor?: OrderStockDeductorPort;

  constructor(deps: {
    orderRepository: OrderRepositoryPort;
    cartCleaner: OrderCartCleanerPort;
    inboxRepo: {
      hasEvent: (id: string) => Promise<boolean>;
      recordEvent: (id: string, orderId: string, status: string, error?: string) => Promise<void>;
    };
    itemsRepo?: {
      findCartItemIdsByOrderId: (orderId: string) => Promise<string[]>;
    };
    stockDeductor?: OrderStockDeductorPort;
  }) {
    this.orderRepo = deps.orderRepository;
    this.cartCleaner = deps.cartCleaner;
    this.inboxRepo = deps.inboxRepo;
    this.itemsRepo = deps.itemsRepo;
    this.stockDeductor = deps.stockDeductor;
  }

  async execute(event: OrderPaymentEvent): Promise<{ status: string }> {
    const { eventId, orderId, paidAmountCents, currency, cartItemIds } = event;

    // 1. Deduplicação via Inbox Pattern
    const alreadyProcessed = await this.inboxRepo.hasEvent(eventId);
    if (alreadyProcessed) {
      return { status: 'ALREADY_PROCESSED' };
    }

    // 2. Busca o pedido no banco
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new Error(`Pedido ${orderId} não encontrado.`);
    }

    // 3. Validação Soberana de Moeda e Valor Efetivamente Pago
    if (currency !== 'BRL' || paidAmountCents !== order.totalCents) {
      const errorMsg = `Divergência financeira: Pedido exige ${order.totalCents} centavos (BRL), mas recebeu ${paidAmountCents} (${currency}).`;
      await this.inboxRepo.recordEvent(eventId, orderId, 'FAILED', errorMsg);
      throw new Error(errorMsg);
    }

    // 4. Se o pedido já estiver CANCELLED (Pagamento Tardio / spec08 §7.4)
    if (order.status === 'CANCELLED') {
      await this.inboxRepo.recordEvent(
        eventId,
        orderId,
        'PROCESSED_WITH_ALERT',
        'Pagamento tardio recebido para pedido cancelado.'
      );
      return { status: 'PAID_AFTER_CANCELLED_ALERT' };
    }

    // 5. Se já estiver PAID, apenas registra na inbox (idempotente)
    if (order.status === 'PAID') {
      await this.inboxRepo.recordEvent(eventId, orderId, 'PROCESSED');
      return { status: 'ALREADY_PAID' };
    }

    // 6. Atualização Atômica Condicional do Pedido de PENDING_PAYMENT -> PAID
    const updated = await this.orderRepo.updateStatus(
      orderId,
      'PENDING_PAYMENT',
      'PAID',
      'Pagamento confirmado oficialmente via Transactional Outbox.'
    );

    if (!updated) {
      throw new Error('Falha concorrente ao atualizar status do pedido para PAID.');
    }

    order.markAsPaid();
    await this.inboxRepo.recordEvent(eventId, orderId, 'PROCESSED');

    // 7. Baixa Realista de Estoque (spec09 §6.1)
    if (this.stockDeductor) {
      try {
        await this.stockDeductor.deductStockForOrder(orderId);
      } catch (stockErr) {
        // Falha no estoque não reverte pedido pago; emite aviso sem abortar
        console.error('Aviso: Falha ao decrementar estoque do pedido pago:', stockErr);
      }
    }

    // 7. Limpeza Seletiva Precisa do Carrinho (baseada em cartItemIds)
    let effectiveCartItemIds = cartItemIds || [];
    if (effectiveCartItemIds.length === 0 && this.itemsRepo) {
      try {
        effectiveCartItemIds = await this.itemsRepo.findCartItemIdsByOrderId(orderId);
      } catch {
        effectiveCartItemIds = [];
      }
    }

    if (effectiveCartItemIds && effectiveCartItemIds.length > 0) {
      try {
        await this.cartCleaner.removePaidItemsByCartItemIds(order.userId, effectiveCartItemIds);
      } catch (cleanerErr) {
        // Falha no carrinho não reverte pedido pago; é tolerante a falhas
        console.error('Aviso: Falha temporária ao limpar itens do carrinho:', cleanerErr);
      }
    }

    return { status: 'PROCESSED' };
  }
}
