import type { PaymentGatewayPort, CreatePaymentParams, PaymentGatewayResult } from '../ports/payment-gateway.port';

export class MockPaymentAdapter implements PaymentGatewayPort {
  async createPayment(params: CreatePaymentParams): Promise<PaymentGatewayResult> {
    const providerPaymentId = `mock_pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    if (params.method === 'PIX') {
      return {
        providerPaymentId,
        status: 'PENDING',
        qrCodePix: '00020126580014BR.GOV.BCB.PIX0136test-mock-pix-origem-vinhos520400005303986540510.005802BR5913ORIGEM VINHOS6009SAO PAULO62070503***6304E2CA',
        qrCodePixUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" fill="white"/><path fill="%231a1a1a" d="M20 20h50v50H20zM30 30v30h30V30zM40 40h10v10H40zM130 20h50v50h-50zM140 30v30h30V30zM150 40h10v10h-10zM20 130h50v50H20zM30 140v30h30v-30zM40 150h10v10H40zM80 20h10v30H80zM100 20h20v10h-20zM80 60h30v10H80zM20 80h10v20H20zM40 80h20v10H40zM70 80h30v20H70zM120 70h20v20h-20zM150 80h30v10h-30zM90 100h20v30H90zM120 100h20v20h-20zM150 100h10v20h-10zM170 100h10v40h-10zM20 110h30v10H20zM60 110h20v20H60zM110 120h30v10h-30zM80 140h20v10H80zM110 140h10v20h-10zM130 130h20v20h-20zM80 160h30v20H80zM120 160h20v20h-20zM150 150h30v10h-30zM160 170h20v10h-20z"/></svg>',
        rawResponse: { mock: true },
      };
    }

    if (params.method === 'BOLETO') {
      return {
        providerPaymentId,
        status: 'PENDING',
        boletoBarcode: '34191790010104351004791020150008491230000015000',
        boletoUrl: 'https://sandbox.mockpayment.com/boleto/test.pdf',
        rawResponse: { mock: true },
      };
    }

    if (params.method === 'CREDIT_CARD') {
      if (params.cardToken === 'tok_test_declined') {
        return {
          providerPaymentId,
          status: 'FAILED',
          rawResponse: { mock: true, reason: 'insufficient_funds' },
        };
      }

      return {
        providerPaymentId,
        status: 'CONFIRMED',
        rawResponse: { mock: true, status: 'approved' },
      };
    }

    throw new Error(`Método de pagamento não suportado: ${params.method}`);
  }

  async getPaymentStatus(providerPaymentId: string): Promise<{
    providerPaymentId: string;
    status: 'PENDING' | 'CONFIRMED' | 'FAILED';
    amountCents: number;
    currency: string;
  }> {
    return {
      providerPaymentId,
      status: 'CONFIRMED',
      amountCents: 15000,
      currency: 'BRL',
    };
  }

  verifyWebhookSignature(_headers: Record<string, string>, _rawBody: string): boolean {
    return true; // Mock sempre aprova assinaturas válidas em testes
  }
}
