export interface OrderStockDeductorPort {
  deductStockForOrder(orderId: string): Promise<void>;
}
