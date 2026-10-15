import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

interface MyOrdersProps {
  onNavigateToCatalog: () => void;
  onSelectOrder: (orderId: string) => void;
}

export const MyOrders: React.FC<MyOrdersProps> = ({
  onNavigateToCatalog,
  onSelectOrder,
}) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) {
        throw new Error('Falha ao carregar lista de pedidos.');
      }
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao consultar pedidos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const [orderToCancel, setOrderToCancel] = useState<any | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${orderToCancel.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelado pelo cliente via painel.' }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao cancelar pedido.');
        return;
      }
      setOrderToCancel(null);
      await fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar pedido.');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="admin" style={{ backgroundColor: 'rgba(46, 125, 50, 0.2)', color: '#4caf50' }}>PAGO</Badge>;
      case 'PENDING_PAYMENT':
        return <Badge variant="secondary" style={{ backgroundColor: 'rgba(212, 175, 55, 0.2)', color: 'var(--color-text-gold)' }}>AGUARDANDO PAGAMENTO</Badge>;
      case 'SHIPPED':
        return <Badge variant="secondary" style={{ backgroundColor: 'rgba(33, 150, 243, 0.2)', color: '#2196f3' }}>ENVIADO</Badge>;
      case 'DELIVERED':
        return <Badge variant="admin" style={{ backgroundColor: 'rgba(76, 175, 80, 0.2)', color: '#81c784' }}>ENTREGUE</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger" style={{ backgroundColor: 'rgba(229, 57, 53, 0.2)', color: '#e53935' }}>CANCELADO</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <section className="checkout-section" style={{ padding: 'var(--space-10) 0', textAlign: 'center' }}>
        <div className="loading-spinner"><div className="spinner" /> Carregando seus pedidos…</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="checkout-section" style={{ padding: 'var(--space-10) 0', textAlign: 'center' }}>
        <div className="auth-error">{error}</div>
        <Button variant="accent" onClick={onNavigateToCatalog} style={{ marginTop: 'var(--space-4)' }}>
          Voltar à Vitrine
        </Button>
      </section>
    );
  }

  return (
    <section className="animate-fade" style={{ maxWidth: '900px', margin: '0 auto', padding: 'var(--space-8) var(--space-4)' }}>
      <div style={{ marginBottom: 'var(--space-8)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <p className="section-subtitle">Histórico de Compras</p>
          <h1 className="section-title" style={{ marginTop: 'var(--space-1)' }}>Meus Pedidos</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={onNavigateToCatalog}>
          ← Explorar Adega
        </Button>
      </div>

      {orders.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: 'var(--space-10) var(--space-6)',
            textAlign: 'center',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-surface-elevated)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>📦</div>
          <h2 style={{ fontFamily: 'var(--font-family-serif)', fontSize: 'var(--font-size-lg)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>
            Nenhum pedido realizado ainda
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', maxWidth: '400px', margin: '0 auto var(--space-6)' }}>
            Visite nosso catálogo e selecione rótulos refinados para compor sua adega pessoal.
          </p>
          <Button variant="accent" size="lg" onClick={onNavigateToCatalog}>
            Explorar Catálogo
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {orders.map((order) => (
            <div
              key={order.id}
              className="glass-panel"
              style={{
                padding: 'var(--space-5)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--color-surface-elevated)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 'var(--space-4)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-1)' }}>
                  <strong style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-text-gold)', letterSpacing: '0.04em' }}>
                    {order.displayCode}
                  </strong>
                  {getStatusBadge(order.status)}
                </div>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  Realizado em {new Date(order.createdAt).toLocaleDateString('pt-BR')} às {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  {' • '}{order.itemsCount} garrafa(s)
                </p>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                  Destino: {order.shippingCity}/{order.shippingState}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'block' }}>Total</span>
                  <strong style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-gold)' }}>
                    R$ {(order.totalCents / 100).toFixed(2).replace('.', ',')}
                  </strong>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button variant="accent" size="sm" onClick={() => onSelectOrder(order.id)}>
                    Detalhes
                  </Button>
                  {order.status === 'PENDING_PAYMENT' && (
                    <Button variant="ghost" size="sm" onClick={() => setOrderToCancel(order)} style={{ color: 'var(--color-status-error)' }}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal In-App de Confirmação de Cancelamento de Pedido */}
      {orderToCancel && (
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
              Cancelar Pedido {orderToCancel.displayCode}?
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 1.5, marginBottom: 'var(--space-6)' }}>
              Tem certeza que deseja cancelar este pedido pendente de <strong>R$ {(orderToCancel.totalCents / 100).toFixed(2).replace('.', ',')}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <Button
                variant="ghost"
                onClick={() => setOrderToCancel(null)}
                disabled={cancelling}
              >
                Voltar
              </Button>
              <Button
                variant="accent"
                onClick={handleConfirmCancel}
                disabled={cancelling}
                style={{ backgroundColor: 'var(--color-status-error)', borderColor: 'var(--color-status-error)' }}
              >
                {cancelling ? 'Cancelando…' : 'Sim, Cancelar Pedido'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
