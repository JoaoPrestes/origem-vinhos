import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

interface OrderConfirmationProps {
  orderId: string;
  onNavigateToCatalog: () => void;
  onNavigateToMyOrders: () => void;
}

export const OrderConfirmation: React.FC<OrderConfirmationProps> = ({
  orderId,
  onNavigateToCatalog,
  onNavigateToMyOrders,
}) => {
  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) {
          throw new Error('Falha ao carregar detalhes do pedido.');
        }
        const data = await res.json();
        setOrderData(data);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar pedido.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handleCopyCode = () => {
    if (orderData?.order?.displayCode) {
      navigator.clipboard.writeText(orderData.order.displayCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (loading) {
    return (
      <section className="checkout-section" style={{ padding: 'var(--space-10) 0', textAlign: 'center' }}>
        <div className="loading-spinner"><div className="spinner" /> Carregando confirmação…</div>
      </section>
    );
  }

  if (error || !orderData) {
    return (
      <section className="checkout-section" style={{ padding: 'var(--space-10) 0', textAlign: 'center' }}>
        <div className="auth-error">{error || 'Pedido não encontrado.'}</div>
        <Button variant="accent" onClick={onNavigateToCatalog} style={{ marginTop: 'var(--space-4)' }}>
          Voltar à Adega
        </Button>
      </section>
    );
  }

  const { order, items } = orderData;
  const isPaid = order.status === 'PAID';

  return (
    <section className="animate-fade" style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--space-8) var(--space-4)' }}>
      {/* Banner de Sucesso */}
      <div
        className="glass-panel"
        style={{
          textAlign: 'center',
          padding: 'var(--space-8) var(--space-6)',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--color-surface-elevated)',
          borderTop: '4px solid var(--color-status-success)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-2)' }}>
          {isPaid ? '🎉' : '⏳'}
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontSize: 'var(--font-size-2xl)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-2)',
          }}
        >
          {isPaid ? 'Pagamento Confirmado com Sucesso!' : 'Pedido Criado com Sucesso!'}
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-md)', maxWidth: '550px', margin: '0 auto' }}>
          {isPaid
            ? 'Seu pedido já foi aprovado e encaminhado para nossa equipe de sommeliers para embalagem e envio seguro.'
            : 'Seu pedido foi registrado e estamos aguardando a confirmação do pagamento.'}
        </p>

        {/* Código de Rastreio Amigável */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            marginTop: 'var(--space-5)',
            padding: 'var(--space-3) var(--space-5)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(212, 175, 55, 0.1)',
            border: '1px solid var(--color-border-accent)',
          }}
        >
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Código do Pedido:
          </span>
          <strong style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-gold)', letterSpacing: '0.05em' }}>
            {order.displayCode}
          </strong>
          <Button variant="ghost" size="sm" onClick={handleCopyCode} style={{ padding: '0.2rem 0.6rem' }}>
            {copied ? '✓ Copiado' : 'Copiar'}
          </Button>
        </div>
      </div>

      {/* Detalhes do Pedido e Endereço */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
        {/* Endereço de Entrega */}
        <div
          className="glass-panel"
          style={{
            padding: 'var(--space-5)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-surface-elevated)',
          }}
        >
          <h2 style={{ fontFamily: 'var(--font-family-serif)', fontSize: 'var(--font-size-md)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-3)' }}>
            📍 Endereço de Entrega
          </h2>
          <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
            {order.shippingRecipientName}
          </p>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
            {order.shippingStreet}, {order.shippingNumber} {order.shippingComplement ? `(${order.shippingComplement})` : ''}
          </p>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            {order.shippingNeighborhood} — {order.shippingCity}/{order.shippingState}
          </p>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-gold)', marginTop: 'var(--space-1)' }}>
            CEP: {order.shippingZipCode}
          </p>
        </div>

        {/* Resumo Financeiro */}
        <div
          className="glass-panel"
          style={{
            padding: 'var(--space-5)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-surface-elevated)',
          }}
        >
          <h2 style={{ fontFamily: 'var(--font-family-serif)', fontSize: 'var(--font-size-md)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-3)' }}>
            💳 Status Financeiro
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Status:</span>
            <Badge variant={isPaid ? 'admin' : 'secondary'} style={{ backgroundColor: isPaid ? 'rgba(46, 125, 50, 0.2)' : 'rgba(212, 175, 55, 0.2)' }}>
              {isPaid ? 'PAGO' : 'AGUARDANDO PAGAMENTO'}
            </Badge>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Total Pago:</span>
            <strong style={{ color: 'var(--color-text-gold)', fontSize: 'var(--font-size-md)' }}>
              R$ {(order.totalCents / 100).toFixed(2).replace('.', ',')}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            <span>Data da Compra:</span>
            <span>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      </div>

      {/* Itens Comprados */}
      <div
        className="glass-panel"
        style={{
          padding: 'var(--space-5)',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--color-surface-elevated)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <h2 style={{ fontFamily: 'var(--font-family-serif)', fontSize: 'var(--font-size-md)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)' }}>
          🍷 Itens Inclusos ({order.itemsCount} garrafa(s))
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {items.map((item: any) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-3) 0',
                borderBottom: '1px solid var(--color-border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                {item.productImage && (
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                  />
                )}
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
                    {item.productName}
                  </p>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                    {item.quantity} × R$ {(item.unitPriceCents / 100).toFixed(2).replace('.', ',')}
                    {item.productType ? ` (${item.productType} / ${item.productHarvest || ''})` : ''}
                  </p>
                </div>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--color-text-gold)' }}>
                R$ {(item.subtotalCents / 100).toFixed(2).replace('.', ',')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Ações Finais */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center' }}>
        <Button variant="accent" size="lg" onClick={onNavigateToMyOrders}>
          Ver Meus Pedidos
        </Button>
        <Button variant="ghost" size="lg" onClick={onNavigateToCatalog}>
          Continuar Comprando
        </Button>
      </div>
    </section>
  );
};
