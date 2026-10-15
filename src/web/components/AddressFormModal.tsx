import React, { useState, useEffect } from 'react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import type { AddressData } from './AddressList';

interface AddressFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (addressData: any) => Promise<void>;
  initialData?: AddressData | null;
}

export const AddressFormModal: React.FC<AddressFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [zipCode, setZipCode] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [label, setLabel] = useState('');

  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepMessage, setCepMessage] = useState<{ type: 'info' | 'error' | 'success'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastSearchedCep, setLastSearchedCep] = useState('');

  useEffect(() => {
    if (initialData) {
      setZipCode(initialData.zipCode || '');
      setStreet(initialData.street || '');
      setNumber(initialData.number || '');
      setComplement(initialData.complement || '');
      setNeighborhood(initialData.neighborhood || '');
      setCity(initialData.city || '');
      setState(initialData.state || '');
      setLabel(initialData.label || '');
      setLastSearchedCep(initialData.zipCode?.replace(/\D/g, '') || '');
    } else {
      resetForm();
    }
  }, [initialData, isOpen]);

  const resetForm = () => {
    setZipCode('');
    setStreet('');
    setNumber('');
    setComplement('');
    setNeighborhood('');
    setCity('');
    setState('');
    setLabel('');
    setCepMessage(null);
    setFormError(null);
    setLastSearchedCep('');
  };

  const handleZipCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setZipCode(rawVal);
    const sanitized = rawVal.replace(/\D/g, '');

    if (sanitized.length === 8 && sanitized !== lastSearchedCep) {
      setLastSearchedCep(sanitized);
      setIsSearchingCep(true);
      setCepMessage(null);

      try {
        const res = await fetch(`/api/addresses/lookup-cep/${sanitized}`);
        const data = await res.json();

        if (res.ok && data.found) {
          // Preenche automaticamente apenas os campos trazidos do CEP
          if (data.street) setStreet(data.street);
          if (data.neighborhood) setNeighborhood(data.neighborhood);
          if (data.city) setCity(data.city);
          if (data.state) setState(data.state);
          if (data.complement && !complement) setComplement(data.complement);

          setCepMessage({ type: 'success', text: 'Endereço localizado via CEP!' });
        } else {
          // Fallback manual — preserva os dados que o usuário já digitou!
          setCepMessage({
            type: 'error',
            text: data.error || 'CEP não encontrado. Por favor, preencha o endereço manualmente.',
          });
        }
      } catch {
        setCepMessage({
          type: 'error',
          text: 'Não foi possível consultar o CEP no momento. Você pode preencher o endereço manualmente.',
        });
      } finally {
        setIsSearchingCep(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const sanitizedZip = zipCode.replace(/\D/g, '');
    if (sanitizedZip.length !== 8) {
      setFormError('O CEP deve conter exatamente 8 dígitos.');
      return;
    }

    if (!street || !number || !neighborhood || !city || !state || !label) {
      setFormError('Por favor, preencha todos os campos obrigatórios (incluindo a Identificação do Endereço).');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        zipCode: sanitizedZip,
        street,
        number,
        complement: complement || undefined,
        neighborhood,
        city,
        state: state.toUpperCase(),
        label,
      });
      onClose();
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar o endereço.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(11, 10, 13, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 'var(--space-4)'
    }}>
      <div className="modal-container glass-panel" style={{
        width: '100%',
        maxWidth: '540px',
        backgroundColor: 'var(--color-surface-elevated)',
        border: '1px solid var(--color-border-accent)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-8)',
        boxShadow: 'var(--shadow-dropdown)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontFamily: 'var(--font-family-serif)', fontSize: 'var(--font-size-xl)', color: 'var(--color-text-primary)' }}>
            {initialData ? 'Editar Endereço' : 'Cadastrar Novo Endereço'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-secondary)',
              fontSize: '1.5rem',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        {formError && <div className="auth-error" role="alert">{formError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ position: 'relative' }}>
            <Input
              label="CEP *"
              id="addr-zipcode"
              type="text"
              placeholder="00000-000"
              value={zipCode}
              onChange={handleZipCodeChange}
              maxLength={9}
              required
            />
            {isSearchingCep && (
              <span style={{ position: 'absolute', right: '12px', top: '38px', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-gold)' }}>
                Buscando CEP…
              </span>
            )}
          </div>

          {cepMessage && (
            <div style={{
              fontSize: 'var(--font-size-xs)',
              marginBottom: 'var(--space-4)',
              color: cepMessage.type === 'success' ? 'var(--color-status-success)' : 'var(--color-status-error)'
            }}>
              {cepMessage.text}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 'var(--space-3)' }}>
            <Input
              label="Logradouro / Rua *"
              id="addr-street"
              type="text"
              value={street}
              onChange={e => setStreet(e.target.value)}
              required
            />
            <Input
              label="Número *"
              id="addr-number"
              type="text"
              value={number}
              onChange={e => setNumber(e.target.value)}
              required
            />
          </div>

          <Input
            label="Complemento"
            id="addr-complement"
            type="text"
            placeholder="Apto, Bloco, Sala (opcional)"
            value={complement}
            onChange={e => setComplement(e.target.value)}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: 'var(--space-3)' }}>
            <Input
              label="Bairro *"
              id="addr-neighborhood"
              type="text"
              value={neighborhood}
              onChange={e => setNeighborhood(e.target.value)}
              required
            />
            <Input
              label="Cidade *"
              id="addr-city"
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              required
            />
            <Input
              label="UF *"
              id="addr-state"
              type="text"
              placeholder="SP"
              maxLength={2}
              value={state}
              onChange={e => setState(e.target.value.toUpperCase())}
              required
            />
          </div>

          <Input
            label="Identificação do Endereço * (ex: Casa, Trabalho, Mãe)"
            id="addr-label"
            type="text"
            placeholder="Ex: Minha Casa"
            value={label}
            onChange={e => setLabel(e.target.value)}
            required
          />

          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
            <Button type="button" variant="outline" className="w-full" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="accent" className="w-full" isLoading={saving}>
              Salvar Endereço
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
