import React, { useState, useEffect } from 'react';
import { AddressFormModal } from '../components/AddressFormModal';
import type { AddressData } from '../components/AddressList';
import { CheckoutReviewStep } from './checkout/CheckoutReviewStep';
import { CheckoutPaymentStep, type CardFormData } from './checkout/CheckoutPaymentStep';
import { CancelOrderModal } from './checkout/CancelOrderModal';

interface CheckoutProps {
  onNavigateToCatalog: () => void;
  onNavigateToCart: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToOrderConfirmation: (orderId: string) => void;
}

export const Checkout: React.FC<CheckoutProps> = ({
  onNavigateToCart,
  onNavigateToProfile,
  onNavigateToOrderConfirmation,
}) => {
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [total, setTotal] = useState('0.00');
  const [addresses, setAddresses] = useState<AddressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // Estados da Etapa de Pagamento
  const [currentStep, setCurrentStep] = useState<'REVIEW' | 'PAYMENT'>('REVIEW');
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<'PIX' | 'CREDIT_CARD' | 'BOLETO'>('PIX');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cardData, setCardData] = useState<CardFormData>({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
    installments: 1,
  });

  const handleCancelCurrentOrder = async () => {
    if (!createdOrder) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${createdOrder.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelado pelo cliente na etapa de pagamento.' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cancelar o pedido.');
      }
      setIsCancelModalOpen(false);
      onNavigateToCart();
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar pedido.');
    } finally {
      setCancelling(false);
    }
  };

  const fetchCheckoutData = async () => {
    setLoading(true);
    setError(null);
    try {
      const cartRes = await fetch('/api/cart');
      if (!cartRes.ok) {
        throw new Error('Falha ao carregar dados do carrinho.');
      }
      const cartData = await cartRes.json();
      setCartItems(cartData.items || []);
      setTotal(cartData.total || '0.00');

      const addrRes = await fetch('/api/addresses');
      if (addrRes.ok) {
        const addrData = await addrRes.json();
        const userAddresses: AddressData[] = addrData.addresses || [];
        setAddresses(userAddresses);

        if (userAddresses.length === 0) {
          setIsAddressModalOpen(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar checkout.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheckoutData();
  }, []);

  const handleSaveAddress = async (addressData: any) => {
    const res = await fetch('/api/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addressData),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao cadastrar endereço.');
    }

    await fetchCheckoutData();
  };

  const handleProceedToPayment = async () => {
    const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];
    if (!defaultAddress) {
      setIsAddressModalOpen(true);
      return;
    }

    setPaymentLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          shippingAddressId: defaultAddress.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao gerar pedido.');
      }

      setCreatedOrder(data);
      setCurrentStep('PAYMENT');
      await initiatePayment(data.id, 'PIX');
    } catch (err: any) {
      setError(err.message || 'Erro ao finalizar pedido.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const initiatePayment = async (orderId: string, method: 'PIX' | 'CREDIT_CARD' | 'BOLETO') => {
    setPaymentLoading(true);
    setError(null);
    try {
      const payload: any = {
        orderId,
        method,
      };

      if (method === 'CREDIT_CARD') {
        payload.cardToken = 'tok_test_card_approved';
        payload.installments = Number(cardData.installments);
      }

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar cobrança.');
      }

      setPaymentData(data);

      if (method === 'CREDIT_CARD' && data.status === 'CONFIRMED') {
        onNavigateToOrderConfirmation(orderId);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar pagamento.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Polling automático para Pix (a cada 3s)
  useEffect(() => {
    if (currentStep !== 'PAYMENT' || selectedMethod !== 'PIX' || !paymentData?.attemptId) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/${paymentData.attemptId}/status`);
        if (res.ok) {
          const statusData = await res.json();
          if (statusData.status === 'CONFIRMED') {
            clearInterval(interval);
            onNavigateToOrderConfirmation(createdOrder.id);
          }
        }
      } catch {
        // Ignora erros transitórios no polling
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentStep, selectedMethod, paymentData?.attemptId, createdOrder?.id]);

  const handleCopyPix = () => {
    if (paymentData?.pixQrCode) {
      navigator.clipboard.writeText(paymentData.pixQrCode);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2500);
    }
  };

  const handleSimulateWebhookApproval = async () => {
    if (!paymentData?.attemptId) return;
    try {
      await fetch('/api/payments/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'mock-dev-signature',
        },
        body: JSON.stringify({
          action: 'payment.updated',
          data: { id: paymentData.attemptId },
        }),
      });

      setTimeout(() => {
        onNavigateToOrderConfirmation(createdOrder.id);
      }, 500);
    } catch (err: any) {
      alert('Erro na simulação: ' + err.message);
    }
  };

  if (loading) {
    return (
      <section className="checkout-section" style={{ padding: 'var(--space-10) 0', textAlign: 'center' }}>
        <div className="loading-spinner"><div className="spinner" /> Carregando checkout…</div>
      </section>
    );
  }

  return (
    <section
      className="checkout-section animate-fade"
      style={{ maxWidth: '1000px', margin: '0 auto', padding: 'var(--space-8) var(--space-4)' }}
    >
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <p className="section-subtitle">
          {currentStep === 'REVIEW' ? 'Etapa 1 de 2: Revisão & Endereço' : 'Etapa 2 de 2: Pagamento Seguro'}
        </p>
        <h1 className="section-title" style={{ marginTop: 'var(--space-1)' }}>
          {currentStep === 'REVIEW' ? 'Finalizar Compra' : 'Pagamento do Pedido'}
        </h1>
        {createdOrder && (
          <p style={{ color: 'var(--color-text-gold)', marginTop: 'var(--space-2)' }}>
            Pedido <strong>{createdOrder.displayCode}</strong> registrado
          </p>
        )}
      </div>

      {error && (
        <div className="auth-error" style={{ marginBottom: 'var(--space-6)' }}>
          {error}
        </div>
      )}

      {currentStep === 'REVIEW' ? (
        <CheckoutReviewStep
          addresses={addresses}
          cartItems={cartItems}
          total={total}
          paymentLoading={paymentLoading}
          onProceedToPayment={handleProceedToPayment}
          onOpenAddressModal={() => setIsAddressModalOpen(true)}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToCart={onNavigateToCart}
        />
      ) : (
        <CheckoutPaymentStep
          createdOrder={createdOrder}
          total={total}
          selectedMethod={selectedMethod}
          setSelectedMethod={setSelectedMethod}
          paymentLoading={paymentLoading}
          paymentData={paymentData}
          copiedPix={copiedPix}
          onCopyPix={handleCopyPix}
          onSimulateWebhookApproval={handleSimulateWebhookApproval}
          cardData={cardData}
          setCardData={setCardData}
          onInitiatePayment={initiatePayment}
          onOpenCancelModal={() => setIsCancelModalOpen(true)}
        />
      )}

      <CancelOrderModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleCancelCurrentOrder}
        cancelling={cancelling}
        displayCode={createdOrder?.displayCode}
      />

      <AddressFormModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSave={handleSaveAddress}
      />
    </section>
  );
};
