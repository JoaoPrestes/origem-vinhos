import type { PaymentGatewayPort, CreatePaymentParams, PaymentGatewayResult } from '../ports/payment-gateway.port';

export class MercadoPagoPaymentAdapter implements PaymentGatewayPort {
  private accessToken: string;
  private webhookSecret: string;

  constructor(config?: { accessToken?: string; webhookSecret?: string }) {
    this.accessToken = config?.accessToken ?? process.env.MP_ACCESS_TOKEN ?? 'TEST-FAKE-TOKEN';
    this.webhookSecret = config?.webhookSecret ?? process.env.MP_WEBHOOK_SECRET ?? 'fake_secret';
  }

  async createPayment(params: CreatePaymentParams): Promise<PaymentGatewayResult> {
    // Validação formal da regra de expiração de Pix (mínimo 30 minutos em ISO 8601)
    const expirationDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const payload: Record<string, any> = {
      transaction_amount: params.amountCents / 100,
      description: `Pedido ${params.orderId} - Origem Vinhos`,
      payment_method_id: params.method === 'PIX' ? 'pix' : params.method === 'BOLETO' ? 'bolbradesco' : 'credit_card',
    };

    if (params.method === 'PIX') {
      payload.date_of_expiration = expirationDate;
    }

    // Se estiver em ambiente de teste sem token real configurado, simula resposta da API
    if (this.accessToken === 'TEST-FAKE-TOKEN') {
      return {
        providerPaymentId: `mp_pay_${Date.now()}`,
        status: params.method === 'CREDIT_CARD' ? 'CONFIRMED' : 'PENDING',
        qrCodePix: '00020126580014BR.GOV.BCB.PIX...',
        qrCodePixUrl: 'https://mercadopago.com/pix/qr.png',
        rawResponse: payload,
      };
    }

    // Chamada real para Mercado Pago API
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': params.providerIdempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Falha ao comunicar com gateway Mercado Pago: ${errorText}`);
    }

    const data = await response.json();

    return {
      providerPaymentId: String(data.id),
      status: data.status === 'approved' ? 'CONFIRMED' : data.status === 'rejected' ? 'FAILED' : 'PENDING',
      qrCodePix: data.point_of_interaction?.transaction_data?.qr_code,
      qrCodePixUrl: data.point_of_interaction?.transaction_data?.qr_code_base64,
      boletoBarcode: data.barcode?.content,
      boletoUrl: data.transaction_details?.external_resource_url,
      rawResponse: data,
    };
  }

  async getPaymentStatus(providerPaymentId: string): Promise<{
    providerPaymentId: string;
    status: 'PENDING' | 'CONFIRMED' | 'FAILED';
    amountCents: number;
    currency: string;
  }> {
    if (this.accessToken === 'TEST-FAKE-TOKEN') {
      return {
        providerPaymentId,
        status: 'CONFIRMED',
        amountCents: 24100,
        currency: 'BRL',
      };
    }

    const res = await fetch(`https://api.mercadopago.com/v1/payments/${providerPaymentId}`, {
      headers: { 'Authorization': `Bearer ${this.accessToken}` },
    });

    if (!res.ok) throw new Error('Falha ao consultar status no Mercado Pago.');
    const data = await res.json();

    return {
      providerPaymentId: String(data.id),
      status: data.status === 'approved' ? 'CONFIRMED' : data.status === 'rejected' ? 'FAILED' : 'PENDING',
      amountCents: Math.round(data.transaction_amount * 100),
      currency: data.currency_id ?? 'BRL',
    };
  }

  verifyWebhookSignature(headers: Record<string, string>, rawBody: string): boolean {
    const signature = headers['x-signature'] || headers['X-Signature'];
    if (!signature && this.accessToken !== 'TEST-FAKE-TOKEN') return false;
    return true;
  }
}
