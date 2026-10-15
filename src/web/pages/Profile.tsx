import React, { useState, useEffect } from 'react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { AddressList } from '../components/AddressList';
import type { AddressData } from '../components/AddressList';
import { AddressFormModal } from '../components/AddressFormModal';

interface ProfileProps {
  currentUser: any;
  onLogout: () => void;
  onNavigateToCatalog: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ currentUser, onLogout, onNavigateToCatalog }) => {
  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [success,   setSuccess]   = useState<string | null>(null);

  // Estados de Gerenciamento de Endereços
  const [addresses, setAddresses] = useState<AddressData[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressData | null>(null);

  const fetchAddresses = async () => {
    if (!currentUser) return;
    setLoadingAddresses(true);
    try {
      const res = await fetch('/api/addresses');
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses || []);
      }
    } catch {
      // erro silencioso
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      if (currentUser.birthDate) {
        const d    = new Date(currentUser.birthDate);
        const yyyy = d.getFullYear();
        const mm   = String(d.getMonth() + 1).padStart(2, '0');
        const dd   = String(d.getDate()).padStart(2, '0');
        setBirthDate(`${yyyy}-${mm}-${dd}`);
      }
      fetchAddresses();
    }
  }, [currentUser]);

  const initials = name
    ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'OV';

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const payload: any = { name, email, birthDate };
    if (password) payload.password = password;

    try {
      const res  = await fetch('/api/identity/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (data.details ? data.details.join(', ') : 'Erro ao atualizar.'));
      setSuccess('Perfil atualizado com sucesso.');
      setPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('ATENÇÃO: Deseja excluir sua conta permanentemente? Esta ação não pode ser desfeita.')) return;
    try {
      const res  = await fetch('/api/identity/me', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir conta.');
      onLogout();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleLogout = async () => {
    try { await fetch('/api/identity/logout', { method: 'POST' }); }
    catch {}
    onLogout();
  };

  // Handlers para Endereços
  const handleOpenCreateModal = () => {
    setEditingAddress(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (address: AddressData) => {
    setEditingAddress(address);
    setIsModalOpen(true);
  };

  const handleSaveAddress = async (addressData: any) => {
    const url = editingAddress ? `/api/addresses/${editingAddress.id}` : '/api/addresses';
    const method = editingAddress ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addressData),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao salvar o endereço.');
    }

    await fetchAddresses();
  };

  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm('Deseja excluir este endereço de entrega?')) return;
    try {
      const res = await fetch(`/api/addresses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchAddresses();
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir endereço.');
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      const res = await fetch(`/api/addresses/${id}/default`, { method: 'PUT' });
      if (res.ok) {
        await fetchAddresses();
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao definir endereço padrão.');
    }
  };

  return (
    <div className="profile-section animate-fade">
      <div className="profile-card glass-panel" style={{ padding: 'var(--space-10)' }}>

        {/* Cabeçalho com Avatar de Iniciais */}
        <div className="profile-card-header" style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div className="profile-avatar">
            {initials}
          </div>
          <h1 className="profile-card-title">{name || 'Minha Conta'}</h1>
          <p className="profile-card-sub" style={{ marginTop: 'var(--space-1)' }}>
            {email} {currentUser?.profile === 'Admin' && <Badge variant="admin" style={{ marginLeft: 'var(--space-2)' }}>Admin</Badge>}
          </p>
        </div>

        {/* Feedback */}
        {error   && <div className="auth-error"   role="alert">{error}</div>}
        {success && <div className="profile-success" role="status">✓ {success}</div>}

        <form onSubmit={handleUpdate} noValidate>
          <Input
            label="Nome Completo"
            id="profile-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoComplete="name"
          />

          <Input
            label="E-mail"
            id="profile-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Input
            label="Data de Nascimento"
            id="profile-birth"
            type="date"
            value={birthDate}
            onChange={e => setBirthDate(e.target.value)}
            required
          />

          <Input
            label="Nova Senha"
            id="profile-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
            helperText="Deixe em branco para manter a senha atual."
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            style={{ marginTop: 'var(--space-6)' }}
            isLoading={loading}
          >
            Salvar Alterações
          </Button>
        </form>

        {/* ── SEÇÃO DE ENDEREÇOS DE ENTREGA ── */}
        <AddressList
          addresses={addresses}
          isLoading={loadingAddresses}
          onAddNew={handleOpenCreateModal}
          onEdit={handleOpenEditModal}
          onDelete={handleDeleteAddress}
          onSetDefault={handleSetDefaultAddress}
        />

        {/* Modal Formulário de Endereço */}
        <AddressFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveAddress}
          initialData={editingAddress}
        />

        {/* Zona de perigo */}
        <div className="profile-danger-zone" style={{ marginTop: 'var(--space-8)', display: 'flex', gap: 'var(--space-4)', justifyContent: 'center' }}>
          <Button variant="outline" onClick={handleLogout}>
            Sair da conta
          </Button>
          <Button variant="danger" onClick={handleDeleteAccount}>
            Excluir conta
          </Button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
          <Button variant="ghost" onClick={onNavigateToCatalog}>
            ← Voltar para a adega
          </Button>
        </div>

      </div>
    </div>
  );
};
