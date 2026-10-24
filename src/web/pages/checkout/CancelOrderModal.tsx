import React from 'react';
import { Button } from '../../components/ui/Button';

interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cancelling: boolean;
  displayCode?: string;
}

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  cancelling,
  displayCode,
}) => {
  if (!isOpen) return null;

  return (
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
        <h3
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontSize: 'var(--font-size-lg)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-3)',
          }}
        >
          Cancelar compra atual?
        </h3>
        <p
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)',
            lineHeight: 1.5,
            marginBottom: 'var(--space-6)',
          }}
        >
          Tem certeza que deseja cancelar este pedido ({' '}
          <strong>{displayCode || 'atual'}</strong>)? Seus itens continuarão no carrinho
          para que você possa concluir quando preferir.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
          <Button variant="ghost" onClick={onClose} disabled={cancelling}>
            Continuar Pagamento
          </Button>
          <Button
            variant="accent"
            onClick={onConfirm}
            disabled={cancelling}
            style={{
              backgroundColor: 'var(--color-status-error)',
              borderColor: 'var(--color-status-error)',
            }}
          >
            {cancelling ? 'Cancelando…' : 'Sim, Cancelar Compra'}
          </Button>
        </div>
      </div>
    </div>
  );
};
