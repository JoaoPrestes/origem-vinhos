import type { Order, OrderStatus } from '../domain/order.entity';

export interface OrderItemSnapshot {
  id?: string;
  orderId?: string;
  productId: string;
  cartItemId: string;
  productName: string;
  productImage: string;
  productType: string;
  productGrape: string;
  productHarvest: number;
  unitPriceCents: number;
  quantity: number;
  subtotalCents: number;
  createdAt?: Date;
}

export interface OrderHistoryRecord {
  id?: string;
  orderId: string;
  recordType: 'STATE_TRANSITION' | 'OPERATIONAL_ALERT' | 'RECONCILIATION_LOG';
  fromStatus?: string | null;
  toStatus?: string | null;
  reason: string;
  createdByUserId?: string | null;
  createdAt?: Date;
}

export interface OrderIdempotencyRecord {
  idempotencyKey: string;
  userId: string;
  requestHash: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  orderId?: string | null;
  expiresAt: Date;
  createdAt?: Date;
}

export interface OrderRepositoryPort {
  saveWithSnapshot(params: {
    order: Order;
    items: OrderItemSnapshot[];
    historyReason: string;
    idempotency?: OrderIdempotencyRecord;
  }): Promise<Order>;

  findById(id: string): Promise<Order | null>;
  findByDisplayCode(displayCode: string): Promise<Order | null>;
  listByUser(userId: string): Promise<Order[]>;
  updateStatus(id: string, fromStatus: OrderStatus, toStatus: OrderStatus, reason: string): Promise<boolean>;
  findIdempotency(key: string, userId: string): Promise<OrderIdempotencyRecord | null>;
  saveIdempotency(record: OrderIdempotencyRecord): Promise<void>;
  updateIdempotencyStatus(key: string, userId: string, status: 'COMPLETED' | 'FAILED', orderId?: string): Promise<void>;
}
