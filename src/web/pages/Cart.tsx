import React, { useState, useEffect } from 'react';
import { QuantityStepper } from '../components/ui/QuantityStepper';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

interface CartItem {
  id: string;
  quantity: number;
  subtotal: string;
  product: {
    id: string;
    name: string;
    price: string;
    image: string;
    type: string;
    grape: string;
    country: string;
    harvest: number;
    alcohol: string;
  };
}

interface CartProps {
  onNavigateToCatalog: () => void;
  onNavigateToCheckout?: () => void;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=500';

export const Cart: React.FC<CartProps> = ({ onNavigateToCatalog, onNavigateToCheckout }) => {
  const [items, setItems]   = useState<CartItem[]>([]);
  const [total, setTotal]   = useState('0.00');
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cart');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao buscar carrinho.');
      }
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || '0.00');
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCart(); }, []);

  const handleStepperChange = async (itemId: string, newQty: number) => {
    setBusyId(itemId);
    try {
      const res  = await fetch(`/api/cart/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar.');
      fetchCart();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const removeItem = async (itemId: string) => {
    // Atualização otimista da interface (sem popups bloqueantes do navegador)
    const previousItems = [...items];
    const previousTotal = total;
    setItems(prev => prev.filter(i => i.id !== itemId));
    setBusyId(itemId);

    try {
      const res  = await fetch(`/api/cart/${itemId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao remover.');
      fetchCart();
    } catch (err: any) {
      setItems(previousItems);
      setTotal(previousTotal);
      setError(err.message || 'Erro ao remover item.');
    } finally {
      setBusyId(null);
    }
  };

  const clearCart = async () => {
    if (!window.confirm('Esvaziar o carrinho?')) return;
    try {
      const res  = await fetch('/api/cart', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao esvaziar.');
      fetchCart();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <section className="cart-section">
        <div className="loading-spinner"><div className="spinner" /> Carregando carrinho…</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="cart-section">
        <div style={{ textAlign: 'center', padding: '3rem', color: '#fca5a5', background: 'rgba(127,29,29,0.08)', borderRadius: '12px' }}>
          {error}
        </div>
      </section>
    );
  }

  return (
    <section className="cart-section animate-fade" aria-label="Carrinho de compras">

      {/* Cabeçalho */}
      <div className="cart-header">
        <p className="section-subtitle">Minha Seleção</p>
        <h1 className="section-title" style={{ marginTop: '0.35rem' }}>Carrinho</h1>
      </div>

      {items.length === 0 ? (
        <div className="cart-empty">
          <div className="cart-empty-icon">🍷</div>
          <h2 className="cart-empty-title">Seu carrinho está vazio</h2>
          <p className="cart-empty-sub">Que tal descobrir alguns vinhos incríveis na nossa adega?</p>
          <Button variant="accent" size="lg" onClick={onNavigateToCatalog}>
            Explorar Adega
          </Button>
        </div>
      ) : (
        <>
          {/* Lista de itens */}
          <div className="cart-items">
            {items.map(item => (
              <div key={item.id} className="cart-item animate-fade">
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="cart-item-thumb"
                  onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
                />

                <div className="cart-item-info">
                  <Badge variant="wine" style={{ marginBottom: '0.35rem' }}>{item.product.type}</Badge>
                  <p className="cart-item-name">{item.product.name}</p>
                  <p className="cart-item-meta">
                    {item.product.grape} · {item.product.country} · Safra {item.product.harvest}
                  </p>
                </div>

                <div className="cart-item-unit">
                  R$ {item.product.price} / un.
                </div>

                {/* Controle de quantidade */}
                <QuantityStepper
                  value={item.quantity}
                  onChange={newQty => handleStepperChange(item.id, newQty)}
                  disabled={busyId === item.id}
                />

                {/* Subtotal do item */}
                <div className="cart-item-subtotal">
                  <p className="cart-item-subtotal-label">Subtotal</p>
                  <p className="price-display">R$ {item.subtotal}</p>
                </div>

                <button
                  className="cart-item-remove"
                  onClick={() => removeItem(item.id)}
                  disabled={busyId === item.id}
                  aria-label={`Remover ${item.product.name} do carrinho`}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>

          {/* Resumo / Rodapé */}
          <div className="cart-summary">
            <Button variant="ghost" onClick={clearCart} style={{ color: 'var(--color-text-secondary)' }}>
              Esvaziar carrinho
            </Button>

            <div className="flex" style={{ alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'right', marginRight: 'var(--space-4)' }}>
                <p className="cart-total-label">Total</p>
                <p className="cart-total-value">R$ {total}</p>
              </div>

              <Button variant="outline" size="lg" onClick={onNavigateToCatalog}>
                Continuar escolhendo
              </Button>

              {onNavigateToCheckout && (
                <Button variant="accent" size="lg" onClick={onNavigateToCheckout}>
                  Finalizar Compra →
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
};
