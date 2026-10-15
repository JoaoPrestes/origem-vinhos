import React from 'react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

export interface AddressData {
  id: string;
  zipCode: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  label: string;
  isDefault: boolean;
}

interface AddressListProps {
  addresses: AddressData[];
  onAddNew: () => void;
  onEdit: (address: AddressData) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  isLoading?: boolean;
}

export const AddressList: React.FC<AddressListProps> = ({
  addresses,
  onAddNew,
  onEdit,
  onDelete,
  onSetDefault,
  isLoading,
}) => {
  return (
    <div className="address-list-container" style={{ marginTop: 'var(--space-8)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontFamily: 'var(--font-family-serif)', fontSize: 'var(--font-size-xl)', color: 'var(--color-text-primary)' }}>
          Endereços de Entrega
        </h2>
        <Button variant="accent" size="sm" onClick={onAddNew}>
          + Novo Endereço
        </Button>
      </div>

      {isLoading ? (
        <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          Carregando endereços...
        </div>
      ) : addresses.length === 0 ? (
        <div className="empty-addresses-card" style={{
          padding: 'var(--space-6)',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--color-surface-elevated)',
          border: '1px dashed var(--color-border-medium)',
          textAlign: 'center',
          color: 'var(--color-text-secondary)'
        }}>
          <p>Nenhum endereço cadastrado no momento.</p>
          <Button variant="outline" size="sm" onClick={onAddNew} style={{ marginTop: 'var(--space-3)' }}>
            Cadastrar Primeiro Endereço
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`address-card ${addr.isDefault ? 'address-card-default' : ''}`}
              style={{
                padding: 'var(--space-5)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--color-surface-elevated)',
                border: addr.isDefault ? '1px solid var(--color-border-accent)' : '1px solid var(--color-border-subtle)',
                position: 'relative',
                transition: 'var(--transition-normal)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <strong style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-text-primary)' }}>
                      {addr.label}
                    </strong>
                    {addr.isDefault && (
                      <Badge variant="admin" style={{ backgroundColor: 'rgba(212, 175, 55, 0.2)', color: 'var(--color-text-gold)' }}>
                        Padrão
                      </Badge>
                    )}
                  </div>

                  <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    {addr.street}, {addr.number} {addr.complement ? `- ${addr.complement}` : ''}
                  </p>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    {addr.neighborhood} — {addr.city}/{addr.state}
                  </p>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-gold)', marginTop: 'var(--space-1)' }}>
                    CEP: {addr.zipCode.replace(/^(\d{5})(\d{3})$/, '$1-$2')}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {!addr.isDefault && (
                    <Button variant="ghost" size="sm" onClick={() => onSetDefault(addr.id)}>
                      Tornar Padrão
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => onEdit(addr)}>
                    Editar
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => onDelete(addr.id)}>
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
