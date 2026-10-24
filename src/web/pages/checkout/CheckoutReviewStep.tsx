import React from 'react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import type { AddressData } from '../../components/AddressList';

interface CheckoutReviewStepProps {
  addresses: AddressData[];
  cartItems: any[];
  total: string;
  paymentLoading: boolean;
  onProceedToPayment: () => void;
  onOpenAddressModal: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToCart: () => void;
}

export const CheckoutReviewStep: React.FC<CheckoutReviewStepProps> = ({
  addresses,
  cartItems,
  total,
  paymentLoading,
  onProceedToPayment,
  onOpenAddressModal,
  onNavigateToProfile,
  onNavigateToCart,
}) => {
  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-8)' }}>
      {/* Coluna Principal: Endereço & Resumo dos Itens */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* Seção do Endereço de Entrega Selecionado */}
        <div
          className="glass-panel"
          style={{
            padding: 'var(--space-6)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-surface-elevated)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--space-4)',
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-family-serif)',
                fontSize: 'var(--font-size-lg)',
                color: 'var(--color-text-primary)',
              }}
            >
              📍 Endereço de Entrega
            </h2>
            {onNavigateToProfile && (
              <Button variant="ghost" size="sm" onClick={onNavigateToProfile}>
                Gerenciar Endereços
              </Button>
            )}
          </div>

          {defaultAddress ? (
            <div
              style={{
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--color-border-accent)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <strong style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-md)' }}>
                  {defaultAddress.label}
                </strong>
                <Badge
                  variant="admin"
                  style={{
                    backgroundColor: 'rgba(212, 175, 55, 0.2)',
                    color: 'var(--color-text-gold)',
                  }}
                >
                  Endereço Selecionado
                </Badge>
              </div>
              <p
                style={{
                  marginTop: 'var(--space-2)',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {defaultAddress.street}, {defaultAddress.number}{' '}
                {defaultAddress.complement ? `- ${defaultAddress.complement}` : ''}
              </p>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                {defaultAddress.neighborhood} — {defaultAddress.city}/{defaultAddress.state}
              </p>
              <p
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-gold)',
                  marginTop: 'var(--space-1)',
                }}
              >
                CEP: {defaultAddress.zipCode.replace(/^(\d{5})(\d{3})$/, '$1-$2')}
              </p>
            </div>
          ) : (
            <div
              style={{
                padding: 'var(--space-5)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(229, 57, 53, 0.08)',
                border: '1px dashed var(--color-status-error)',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  color: 'var(--color-status-error)',
                  fontSize: 'var(--font-size-sm)',
                  marginBottom: 'var(--space-3)',
                }}
              >
                ⚠️ Você precisa cadastrar pelo menos um endereço de entrega para finalizar a compra.
              </p>
              <Button variant="accent" size="sm" onClick={onOpenAddressModal}>
                Cadastrar Endereço Agora
              </Button>
            </div>
          )}
        </div>

        {/* Lista de Vinhos no Pedido */}
        <div
          className="glass-panel"
          style={{
            padding: 'var(--space-6)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-surface-elevated)',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-family-serif)',
              fontSize: 'var(--font-size-lg)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-4)',
            }}
          >
            🍷 Vinhos Selecionados ({cartItems.length})
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {cartItems.map((item) => (
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
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    style={{
                      width: '48px',
                      height: '48px',
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  />
                  <div>
                    <p
                      style={{
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        fontSize: 'var(--font-size-sm)',
                      }}
                    >
                      {item.product.name}
                    </p>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                      Qtd: {item.quantity} garrafa(s) × R$ {item.product.price}
                    </p>
                  </div>
                </div>
                <span style={{ fontWeight: 700, color: 'var(--color-text-gold)' }}>
                  R$ {item.subtotal}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Coluna Lateral: Resumo Financeiro */}
      <div>
        <div
          className="glass-panel"
          style={{
            padding: 'var(--space-6)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-surface-elevated)',
            position: 'sticky',
            top: '100px',
          }}
        >
          <h3
            style={{
              fontFamily: 'var(--font-family-serif)',
              fontSize: 'var(--font-size-lg)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-4)',
            }}
          >
            Resumo do Pedido
          </h3>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-2)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <span>Subtotal Vinhos:</span>
            <span>R$ {total}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-4)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <span>Frete Especial:</span>
            <span style={{ color: '#4caf50', fontWeight: 600 }}>Grátis</span>
          </div>

          <div
            style={{
              borderTop: '1px solid var(--color-border-medium)',
              paddingTop: 'var(--space-4)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 'var(--space-6)',
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Total:</span>
            <span
              style={{
                fontSize: 'var(--font-size-xl)',
                fontWeight: 700,
                color: 'var(--color-text-gold)',
              }}
            >
              R$ {total}
            </span>
          </div>

          <Button
            variant="accent"
            size="lg"
            className="w-full"
            disabled={!defaultAddress || cartItems.length === 0 || paymentLoading}
            onClick={onProceedToPayment}
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
  );
};
