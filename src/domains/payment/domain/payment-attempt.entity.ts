export type PaymentMethod = 'CREDIT_CARD' | 'PIX' | 'BOLETO';
export type PaymentAttemptStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'EXPIRED' | 'PAID_AFTER_EXPIRATION';

export interface PaymentAttemptProps {
  id: string;
  orderId: string;
  userId: string;
  attemptNumber: number;
  method: PaymentMethod;
  installments: number;
  amountCents: number;
  status: PaymentAttemptStatus;
  providerName: string;
  providerPaymentId: string | null;
  providerIdempotencyKey: string;
  qrCodePix: string | null;
  qrCodePixUrl: string | null;
  boletoBarcode: string | null;
  boletoUrl: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class PaymentAttempt {
  private props: PaymentAttemptProps;

  constructor(props: PaymentAttemptProps) {
    if (props.amountCents <= 0) {
      throw new Error('O valor do pagamento deve ser estritamente maior que zero.');
    }
    this.props = { ...props };
  }

  get id(): string { return this.props.id; }
  get orderId(): string { return this.props.orderId; }
  get userId(): string { return this.props.userId; }
  get attemptNumber(): number { return this.props.attemptNumber; }
  get method(): PaymentMethod { return this.props.method; }
  get installments(): number { return this.props.installments; }
  get amountCents(): number { return this.props.amountCents; }
  get status(): PaymentAttemptStatus { return this.props.status; }
  get providerName(): string { return this.props.providerName; }
  get providerPaymentId(): string | null { return this.props.providerPaymentId; }
  get providerIdempotencyKey(): string { return this.props.providerIdempotencyKey; }
  get qrCodePix(): string | null { return this.props.qrCodePix; }
  get qrCodePixUrl(): string | null { return this.props.qrCodePixUrl; }
  get boletoBarcode(): string | null { return this.props.boletoBarcode; }
  get boletoUrl(): string | null { return this.props.boletoUrl; }
  get expiresAt(): Date { return this.props.expiresAt; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  confirm(providerPaymentId: string): void {
    if (this.props.status !== 'PENDING') {
      throw new Error(`Tentativa com status ${this.props.status} não pode ser confirmada.`);
    }
    this.props.status = 'CONFIRMED';
    this.props.providerPaymentId = providerPaymentId;
    this.props.updatedAt = new Date();
  }

  fail(reason: string): void {
    if (this.props.status !== 'PENDING') return; // idempotente
    this.props.status = 'FAILED';
    this.props.updatedAt = new Date();
  }

  expire(): void {
    if (this.props.status !== 'PENDING') return;
    this.props.status = 'EXPIRED';
    this.props.updatedAt = new Date();
  }

  markPaidAfterExpiration(providerPaymentId: string): void {
    this.props.status = 'PAID_AFTER_EXPIRATION';
    this.props.providerPaymentId = providerPaymentId;
    this.props.updatedAt = new Date();
  }

  toJSON(): PaymentAttemptProps {
    return { ...this.props };
  }
}
