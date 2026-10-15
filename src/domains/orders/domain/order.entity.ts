export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PREPARING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderProps {
  id: string;
  displayCode: string;
  userId: string;
  status: OrderStatus;
  totalCents: number;
  itemsCount: number;
  currency: string;
  shippingRecipientName: string;
  shippingZipCode: string;
  shippingStreet: string;
  shippingNumber: string;
  shippingComplement: string | null;
  shippingNeighborhood: string;
  shippingCity: string;
  shippingState: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Order {
  private props: OrderProps;

  constructor(props: OrderProps) {
    if (props.totalCents <= 0) {
      throw new Error('O valor total do pedido deve ser maior que zero.');
    }
    if (props.itemsCount <= 0) {
      throw new Error('A quantidade total de itens deve ser maior que zero.');
    }
    this.props = { ...props };
  }

  get id(): string {
    return this.props.id;
  }

  get displayCode(): string {
    return this.props.displayCode;
  }

  get userId(): string {
    return this.props.userId;
  }

  get status(): OrderStatus {
    return this.props.status;
  }

  get totalCents(): number {
    return this.props.totalCents;
  }

  get currency(): string {
    return this.props.currency;
  }

  get itemsCount(): number {
    return this.props.itemsCount;
  }

  get shippingRecipientName(): string {
    return this.props.shippingRecipientName;
  }

  get shippingZipCode(): string {
    return this.props.shippingZipCode;
  }

  get shippingStreet(): string {
    return this.props.shippingStreet;
  }

  get shippingNumber(): string {
    return this.props.shippingNumber;
  }

  get shippingComplement(): string | null {
    return this.props.shippingComplement;
  }

  get shippingNeighborhood(): string {
    return this.props.shippingNeighborhood;
  }

  get shippingCity(): string {
    return this.props.shippingCity;
  }

  get shippingState(): string {
    return this.props.shippingState;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Transições da Máquina de Estados (spec08)

  markAsPaid(): void {
    if (this.props.status !== 'PENDING_PAYMENT') {
      throw new Error(
        `Transição inválida: Não é possível marcar como PAID um pedido com status ${this.props.status}.`
      );
    }
    this.props.status = 'PAID';
    this.props.updatedAt = new Date();
  }

  cancel(reason: string): void {
    if (this.props.status === 'DELIVERED' || this.props.status === 'SHIPPED') {
      throw new Error(
        `Transição inválida: Pedido com status ${this.props.status} não pode ser cancelado.`
      );
    }
    if (this.props.status === 'CANCELLED') {
      return; // Idempotente
    }
    this.props.status = 'CANCELLED';
    this.props.updatedAt = new Date();
  }

  startPreparation(): void {
    if (this.props.status !== 'PAID') {
      throw new Error(
        `Transição inválida: Apenas pedidos PAID podem entrar em PREPARING.`
      );
    }
    this.props.status = 'PREPARING';
    this.props.updatedAt = new Date();
  }

  dispatch(): void {
    if (this.props.status !== 'PREPARING') {
      throw new Error(
        `Transição inválida: Apenas pedidos PREPARING podem ser despachados (SHIPPED).`
      );
    }
    this.props.status = 'SHIPPED';
    this.props.updatedAt = new Date();
  }

  confirmDelivery(): void {
    if (this.props.status !== 'SHIPPED') {
      throw new Error(
        `Transição inválida: Apenas pedidos SHIPPED podem ser marcados como DELIVERED.`
      );
    }
    this.props.status = 'DELIVERED';
    this.props.updatedAt = new Date();
  }

  toJSON(): OrderProps {
    return { ...this.props };
  }
}
