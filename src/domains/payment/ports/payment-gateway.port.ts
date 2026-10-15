import type { PaymentAttempt } from '../domain/payment-attempt.entity';

export interface CreatePaymentParams {
  attemptId: string;
  orderId: string;
  userId: string;
  amountCents: number;
  currency: string;
  method: 'CREDIT_CARD' | 'PIX' | 'BOLETO';
  installments?: number;
  cardToken?: string;
  providerIdempotencyKey: string;
}

export interface PaymentGatewayResult {
  providerPaymentId: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  qrCodePix?: string;
  qrCodePixUrl?: string;
  boletoBarcode?: string;
  boletoUrl?: string;
  rawResponse: unknown;
}

export interface PaymentGatewayPort {
  createPayment(params: CreatePaymentParams): Promise<PaymentGatewayResult>;
  getPaymentStatus(providerPaymentId: string): Promise<{
    providerPaymentId: string;
    status: 'PENDING' | 'CONFIRMED' | 'FAILED';
    amountCents: number;
    currency: string;
  }>;
  verifyWebhookSignature(headers: Record<string, string>, rawBody: string): boolean;
}
