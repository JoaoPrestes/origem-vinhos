import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { AddressFormModal } from '../components/AddressFormModal';
import type { AddressData } from '../components/AddressList';

interface CheckoutProps {
  onNavigateToCatalog: () => void;
  onNavigateToCart: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToOrderConfirmation: (orderId: string) => void;
}

export const Checkout: React.FC<CheckoutProps> = ({
  onNavigateToCatalog,
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
  const [cardData, setCardData] = useState({
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
      // 1. Busca itens do carrinho
      const cartRes = await fetch('/api/cart');
      if (!cartRes.ok) {
        throw new Error('Falha ao carregar dados do carrinho.');
      }
      const cartData = await cartRes.json();
      setCartItems(cartData.items || []);
      setTotal(cartData.total || '0.00');

      // 2. Busca endereços do usuário
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

  // Cria o pedido e avança para a etapa de pagamento
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

      // Inicia pagamento Pix por padrão
      await initiatePayment(data.id, 'PIX');
    } catch (err: any) {
      setError(err.message || 'Erro ao finalizar pedido.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Inicia tentativa de cobrança no gateway
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

  // Polling automático para Pix (a cada 3s verifica se foi confirmado)
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
        // Ignora erros transitórios de rede no polling
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

  // Simulador de aprovação de webhook para demonstração
  const handleSimulateWebhookApproval = async () => {
    if (!paymentData?.attemptId) return;
    try {
      // Dispara confirmação simulada
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

  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];

  return (
    <section className="checkout-section animate-fade" style={{ maxWidth: '1000px', margin: '0 auto', padding: 'var(--space-8) var(--space-4)' }}>
      {/* Cabeçalho do Checkout */}
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-8)' }}>
          {/* Coluna Principal: Endereço & Resumo dos Itens */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Seção do Endereço de Entrega Selecionado */}
            <div className="glass-panel" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface-elevated)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                <h2 style={{ fontFamily: 'var(--font-family-serif)', fontSize: 'var(--font-size-lg)', color: 'var(--color-text-primary)' }}>
                  📍 Endereço de Entrega
                </h2>
                {onNavigateToProfile && (
                  <Button variant="ghost" size="sm" onClick={onNavigateToProfile}>
                    Gerenciar Endereços
                  </Button>
                )}
              </div>

              {defaultAddress ? (
                <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border-accent)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <strong style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-md)' }}>
                      {defaultAddress.label}
                    </strong>
                    <Badge variant="admin" style={{ backgroundColor: 'rgba(212, 175, 55, 0.2)', color: 'var(--color-text-gold)' }}>
                      Endereço Selecionado
                    </Badge>
                  </div>
                  <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    {defaultAddress.street}, {defaultAddress.number} {defaultAddress.complement ? `- ${defaultAddress.complement}` : ''}
                  </p>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    {defaultAddress.neighborhood} — {defaultAddress.city}/{defaultAddress.state}
                  </p>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-gold)', marginTop: 'var(--space-1)' }}>
                    CEP: {defaultAddress.zipCode.replace(/^(\d{5})(\d{3})$/, '$1-$2')}
                  </p>
                </div>
              ) : (
                <div style={{ padding: 'var(--space-5)', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(229, 57, 53, 0.08)', border: '1px dashed var(--color-status-error)', textAlign: 'center' }}>
                  <p style={{ color: 'var(--color-status-error)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>
                    ⚠️ Você precisa cadastrar pelo menos um endereço de entrega para finalizar a compra.
                  </p>
                  <Button variant="accent" size="sm" onClick={() => setIsAddressModalOpen(true)}>
                    Cadastrar Endereço Agora
                  </Button>
                </div>
              )}
            </div>

            {/* Lista de Vinhos no Pedido */}
            <div className="glass-panel" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface-elevated)' }}>
              <h2 style={{ fontFamily: 'var(--font-family-serif)', fontSize: 'var(--font-size-lg)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)' }}>
                🍷 Vinhos Selecionados ({cartItems.length})
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {cartItems.map((item) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <img src={item.product.image} alt={item.product.name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>{item.product.name}</p>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                          Qtd: {item.quantity} garrafa(s) × R$ {item.product.price}
                        </p>
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--color-text-gold)' }}>R$ {item.subtotal}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna Lateral: Resumo Financeiro */}
          <div>
            <div className="glass-panel" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface-elevated)', position: 'sticky', top: '100px' }}>
              <h3 style={{ fontFamily: 'var(--font-family-serif)', fontSize: 'var(--font-size-lg)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)' }}>
                Resumo do Pedido
              </h3>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                <span>Subtotal Vinhos:</span>
                <span>R$ {total}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                <span>Frete Especial:</span>
                <span style={{ color: '#4caf50', fontWeight: 600 }}>Grátis</span>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border-medium)', paddingTop: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-6)' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Total:</span>
                <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text-gold)' }}>R$ {total}</span>
              </div>

              <Button
                variant="accent"
                size="lg"
                className="w-full"
                disabled={!defaultAddress || cartItems.length === 0 || paymentLoading}
                onClick={handleProceedToPayment}
              >
                {paymentLoading ? 'Processando…' : 'Finalizar Pedido →'}
              </Button>

              <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
                <Button variant="ghost" size="sm" onClick={onNavigateToCart}>
                  ← Voltar ao Carrinho
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ETAPA 2: Formas de Pagamento Estilo Mercado Pago */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-8)' }}>
          <div>
            <div className="glass-panel" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface-elevated)', marginBottom: 'var(--space-6)' }}>
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <h2 style={{ fontFamily: 'var(--font-family-serif)', fontSize: '1.4rem', color: 'var(--color-text-primary)', marginBottom: 'var(--space-1)' }}>
                  Como você prefere pagar?
                </h2>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                  Selecione o meio de pagamento para concluir sua compra com total segurança.
                </p>
              </div>

              {/* LISTA VERTICAL DE OPÇÕES - ESTILO MERCADO PAGO */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {/* 1. OPÇÃO PIX */}
                <div
                  style={{
                    borderRadius: 'var(--radius-md)',
                    border: selectedMethod === 'PIX' ? '2px solid #32BCAD' : '1px solid var(--color-border-subtle)',
                    backgroundColor: selectedMethod === 'PIX' ? 'rgba(50, 188, 173, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                    transition: 'all 0.2s ease',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    onClick={() => {
                      setSelectedMethod('PIX');
                      if (createdOrder) initiatePayment(createdOrder.id, 'PIX');
                    }}
                    style={{
                      padding: 'var(--space-4) var(--space-5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                      {/* Ícone Pix Estilizado */}
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(50, 188, 173, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M6.5 12l5.5-5.5 5.5 5.5-5.5 5.5L6.5 12z"
                            stroke="#32BCAD"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M3 12l9-9 9 9-9 9-9-9z"
                            stroke="#32BCAD"
                            strokeWidth="1.2"
                            strokeDasharray="2 2"
                          />
                        </svg>
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-md)' }}>
                            Pix
                          </span>
                          <span
                            style={{
                              backgroundColor: '#009ee3',
                              color: '#fff',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            NOVO
                          </span>
                        </div>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', marginTop: '2px' }}>
                          Aprovação imediata
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: selectedMethod === 'PIX' ? '6px solid #32BCAD' : '2px solid var(--color-border-medium)',
                          backgroundColor: '#fff',
                          transition: 'all 0.2s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Detalhes Expansíveis do Pix */}
                  {selectedMethod === 'PIX' && (
                    <div
                      style={{
                        padding: 'var(--space-5)',
                        borderTop: '1px solid rgba(50, 188, 173, 0.2)',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        textAlign: 'center',
                      }}
                    >
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
                        Abra o app do seu banco, escolha <strong>Pagar via Pix</strong> e escaneie o código ou cole a chave abaixo:
                      </p>

                      {/* QR Code Container */}
                      <div
                        style={{
                          display: 'inline-block',
                          padding: 'var(--space-4)',
                          backgroundColor: '#ffffff',
                          borderRadius: 'var(--radius-md)',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                          marginBottom: 'var(--space-4)',
                        }}
                      >
                        {paymentData?.pixQrCodeBase64 ? (
                          <img
                            src={paymentData.pixQrCodeBase64}
                            alt="QR Code Pix"
                            style={{ width: '180px', height: '180px', display: 'block' }}
                          />
                        ) : (
                          <div style={{ width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div className="spinner" />
                          </div>
                        )}
                      </div>

                      {/* Pix Copia e Cola */}
                      {paymentData?.pixQrCode && (
                        <div style={{ maxWidth: '440px', margin: '0 auto var(--space-4)' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-2)',
                              backgroundColor: 'rgba(0,0,0,0.4)',
                              border: '1px solid var(--color-border-subtle)',
                              borderRadius: 'var(--radius-md)',
                              padding: 'var(--space-2) var(--space-3)',
                            }}
                          >
                            <input
                              type="text"
                              readOnly
                              value={paymentData.pixQrCode}
                              style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-text-primary)',
                                fontSize: 'var(--font-size-xs)',
                                outline: 'none',
                                fontFamily: 'monospace',
                              }}
                            />
                            <Button
                              variant="accent"
                              size="sm"
                              onClick={handleCopyPix}
                              style={{ flexShrink: 0, padding: '4px 12px', fontSize: 'var(--font-size-xs)' }}
                            >
                              {copiedPix ? '✓ Copiado!' : 'Copiar'}
                            </Button>
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', color: 'var(--color-text-gold)', fontSize: 'var(--font-size-xs)' }}>
                        <div className="spinner" style={{ width: '13px', height: '13px' }} />
                        <span>Aguardando identificação do pagamento em tempo real…</span>
                      </div>

                      <div style={{ marginTop: 'var(--space-5)', borderTop: '1px dashed var(--color-border-subtle)', paddingTop: 'var(--space-4)' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSimulateWebhookApproval}
                          style={{ color: '#32BCAD', borderColor: '#32BCAD' }}
                        >
                          ⚡ Simular Pagamento Aprovado (Demonstração)
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. OPÇÃO CARTÃO DE CRÉDITO */}
                <div
                  style={{
                    borderRadius: 'var(--radius-md)',
                    border: selectedMethod === 'CREDIT_CARD' ? '2px solid var(--color-accent)' : '1px solid var(--color-border-subtle)',
                    backgroundColor: selectedMethod === 'CREDIT_CARD' ? 'rgba(212, 175, 55, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                    transition: 'all 0.2s ease',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    onClick={() => setSelectedMethod('CREDIT_CARD')}
                    style={{
                      padding: 'var(--space-4) var(--space-5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                      {/* Ícone Cartão Estilizado */}
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(33, 150, 243, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2196f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="5" width="20" height="14" rx="2" />
                          <line x1="2" y1="10" x2="22" y2="10" />
                          <circle cx="6" cy="15" r="1" fill="#2196f3" />
                        </svg>
                      </div>

                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-md)' }}>
                          Cartão de Crédito
                        </span>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', marginTop: '2px' }}>
                          Em até 6x sem juros no cartão
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: selectedMethod === 'CREDIT_CARD' ? '6px solid var(--color-accent)' : '2px solid var(--color-border-medium)',
                          backgroundColor: '#fff',
                          transition: 'all 0.2s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Detalhes Expansíveis do Cartão */}
                  {selectedMethod === 'CREDIT_CARD' && (
                    <div
                      style={{
                        padding: 'var(--space-5)',
                        borderTop: '1px solid rgba(212, 175, 55, 0.2)',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '440px', margin: '0 auto' }}>
                        <div>
                          <label className="auth-label">Número do Cartão</label>
                          <input
                            type="text"
                            className="auth-input"
                            placeholder="0000 0000 0000 0000"
                            maxLength={19}
                            value={cardData.number}
                            onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="auth-label">Nome Completo do Titular</label>
                          <input
                            type="text"
                            className="auth-input"
                            placeholder="NOME COMO IMPRESSO NO CARTÃO"
                            value={cardData.name}
                            onChange={(e) => setCardData({ ...cardData, name: e.target.value.toUpperCase() })}
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                          <div>
                            <label className="auth-label">Validade (MM/AA)</label>
                            <input
                              type="text"
                              className="auth-input"
                              placeholder="12/28"
                              maxLength={5}
                              value={cardData.expiry}
                              onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="auth-label">CVV</label>
                            <input
                              type="password"
                              className="auth-input"
                              placeholder="123"
                              maxLength={4}
                              value={cardData.cvv}
                              onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="auth-label">Parcelamento</label>
                          <select
                            className="auth-input"
                            value={cardData.installments}
                            onChange={(e) => setCardData({ ...cardData, installments: Number(e.target.value) })}
                          >
                            <option value={1}>1x de R$ {total} sem juros</option>
                            <option value={2}>2x de R$ {(Number(total) / 2).toFixed(2)} sem juros</option>
                            <option value={3}>3x de R$ {(Number(total) / 3).toFixed(2)} sem juros</option>
                            <option value={6}>6x de R$ {(Number(total) / 6).toFixed(2)} sem juros</option>
                          </select>
                        </div>

                        <Button
                          variant="accent"
                          size="lg"
                          className="w-full"
                          disabled={paymentLoading}
                          onClick={() => initiatePayment(createdOrder.id, 'CREDIT_CARD')}
                        >
                          {paymentLoading ? 'Processando Cartão…' : `Pagar R$ ${total}`}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. OPÇÃO BOLETO */}
                <div
                  style={{
                    borderRadius: 'var(--radius-md)',
                    border: selectedMethod === 'BOLETO' ? '2px solid var(--color-accent)' : '1px solid var(--color-border-subtle)',
                    backgroundColor: selectedMethod === 'BOLETO' ? 'rgba(212, 175, 55, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                    transition: 'all 0.2s ease',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    onClick={() => {
                      setSelectedMethod('BOLETO');
                      if (createdOrder) initiatePayment(createdOrder.id, 'BOLETO');
                    }}
                    style={{
                      padding: 'var(--space-4) var(--space-5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                      {/* Ícone Código de Barras Estilizado */}
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(158, 158, 158, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2">
                          <line x1="3" y1="4" x2="3" y2="20" />
                          <line x1="6" y1="4" x2="6" y2="20" />
                          <line x1="10" y1="4" x2="10" y2="20" strokeWidth="3" />
                          <line x1="14" y1="4" x2="14" y2="20" />
                          <line x1="18" y1="4" x2="18" y2="20" strokeWidth="2.5" />
                          <line x1="21" y1="4" x2="21" y2="20" />
                        </svg>
                      </div>

                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-md)' }}>
                          Boleto Bancário
                        </span>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', marginTop: '2px' }}>
                          Será aprovado em 1 a 2 dias úteis
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: selectedMethod === 'BOLETO' ? '6px solid var(--color-accent)' : '2px solid var(--color-border-medium)',
                          backgroundColor: '#fff',
                          transition: 'all 0.2s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Detalhes Expansíveis do Boleto */}
                  {selectedMethod === 'BOLETO' && (
                    <div
                      style={{
                        padding: 'var(--space-5)',
                        borderTop: '1px solid rgba(212, 175, 55, 0.2)',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        textAlign: 'center',
                      }}
                    >
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
                        O boleto tem vencimento em 3 dias úteis. A confirmação do pedido ocorrerá após compensação bancária.
                      </p>
                      {paymentData?.boletoBarcode && (
                        <div
                          style={{
                            padding: 'var(--space-3)',
                            backgroundColor: 'rgba(0,0,0,0.4)',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: 'var(--space-4)',
                            fontFamily: 'monospace',
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--color-text-gold)',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {paymentData.boletoBarcode}
                        </div>
                      )}
                      <Button variant="accent" onClick={handleSimulateWebhookApproval}>
                        ⚡ Simular Compensação Bancária
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Lateral de Resumo & Botão de Cancelamento da Compra */}
          <div>
            <div className="glass-panel" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface-elevated)', position: 'sticky', top: '100px' }}>
              <h3 style={{ fontFamily: 'var(--font-family-serif)', fontSize: 'var(--font-size-md)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-3)' }}>
                Pedido: {createdOrder.displayCode}
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                <span>Itens:</span>
                <span>{createdOrder.itemsCount} garrafa(s)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                <span>Status:</span>
                <Badge variant="secondary">AGUARDANDO PAGAMENTO</Badge>
              </div>
              <div style={{ borderTop: '1px solid var(--color-border-medium)', paddingTop: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-6)' }}>
                <span style={{ fontWeight: 600 }}>Total:</span>
                <strong style={{ fontSize: 'var(--font-size-xl)', color: 'var(--color-text-gold)' }}>
                  R$ {(createdOrder.totalCents / 100).toFixed(2).replace('.', ',')}
                </strong>
              </div>

              {/* BOTÃO PARA CANCELAR A COMPRA */}
              <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--space-4)', textAlign: 'center' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCancelModalOpen(true)}
                  style={{ color: 'var(--color-status-error)', width: '100%', borderColor: 'rgba(229, 57, 53, 0.3)' }}
                >
                  ✕ Cancelar Compra
                </Button>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
                  Os itens permanecerão no seu carrinho.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cancelamento de Compra (Sem window.confirm) */}
      {isCancelModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-4)',
          }}
        >
          <div
            className="glass-panel animate-scale-up"
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              maxWidth: '460px',
              width: '100%',
              padding: 'var(--space-6)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border-medium)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <h3 style={{ fontFamily: 'var(--font-family-serif)', fontSize: 'var(--font-size-lg)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-3)' }}>
              Cancelar compra atual?
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 1.5, marginBottom: 'var(--space-6)' }}>
              Tem certeza que deseja cancelar este pedido (<strong>{createdOrder?.displayCode}</strong>)? Seus itens continuarão no carrinho para que você possa concluir quando preferir.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <Button
                variant="ghost"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={cancelling}
              >
                Continuar Pagamento
              </Button>
              <Button
                variant="accent"
                onClick={handleCancelCurrentOrder}
                disabled={cancelling}
                style={{ backgroundColor: 'var(--color-status-error)', borderColor: 'var(--color-status-error)' }}
              >
                {cancelling ? 'Cancelando…' : 'Sim, Cancelar Compra'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Interceptador de Endereço */}
      <AddressFormModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSave={handleSaveAddress}
      />
    </section>
  );
};
