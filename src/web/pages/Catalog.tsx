import React, { useState, useEffect } from 'react';
import { HeroSection } from '../components/HeroSection';
import { WineCard } from '../components/WineCard';
import type { Product } from '../components/WineCard';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface CatalogProps {
  currentUser: any;
  onNavigateToAuth: () => void;
  onItemAddedToCart: () => void;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=500';

export const Catalog: React.FC<CatalogProps> = ({ currentUser, onNavigateToAuth, onItemAddedToCart }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Filtros
  const [filterType, setFilterType] = useState('');
  const [filterGrape, setFilterGrape] = useState('');
  const [filterCountry, setFilterCountry] = useState('');

  // Modal de Admin
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formType, setFormType] = useState<Product['type']>('Tinto');
  const [formGrape, setFormGrape] = useState('');
  const [formCountry, setFormCountry] = useState('');
  const [formHarvest, setFormHarvest] = useState('');
  const [formAlcohol, setFormAlcohol] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isAdmin = currentUser?.profile === 'Admin';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setFormError(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no upload da imagem.');
      setFormImage(data.url);
    } catch (err: any) {
      setFormError(err.message || 'Falha ao enviar foto do produto.');
    } finally {
      setUploading(false);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      if (filterGrape) params.append('grape', filterGrape);
      if (filterCountry) params.append('country', filterCountry);
      const res = await fetch(`/api/catalog?${params.toString()}`);
      if (!res.ok) throw new Error('Falha ao buscar vinhos.');
      setProducts(await res.json());
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar catálogo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, [filterType, filterGrape, filterCountry]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormName(''); setFormPrice(''); setFormDescription('');
    setFormImage(''); setFormType('Tinto'); setFormGrape('');
    setFormCountry(''); setFormHarvest(''); setFormAlcohol('');
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name); setFormPrice(p.price); setFormDescription(p.description);
    setFormImage(p.image); setFormType(p.type); setFormGrape(p.grape);
    setFormCountry(p.country); setFormHarvest(p.harvest.toString()); setFormAlcohol(p.alcohol);
    setFormError(null);
    setShowModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    const priceNum = parseFloat(formPrice);
    const harvestNum = parseInt(formHarvest);
    const alcoholNum = parseFloat(formAlcohol);

    if (isNaN(priceNum) || priceNum <= 0) { setFormError('O preço deve ser um número maior que zero.'); setFormLoading(false); return; }
    if (isNaN(harvestNum) || harvestNum < 1800) { setFormError('A safra deve ser um ano válido.'); setFormLoading(false); return; }
    if (isNaN(alcoholNum) || alcoholNum <= 0) { setFormError('O teor alcoólico deve ser maior que zero.'); setFormLoading(false); return; }

    const payload = {
      name: formName, price: priceNum, description: formDescription,
      image: formImage || FALLBACK_IMAGE,
      type: formType, grape: formGrape, country: formCountry,
      harvest: harvestNum, alcohol: alcoholNum,
    };

    const url = editingProduct ? `/api/catalog/${editingProduct.id}` : '/api/catalog';
    const method = editingProduct ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar produto.');
      setShowModal(false);
      fetchProducts();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    // UI Otimista: remove o produto imediatamente da interface (sem popups do navegador)
    const previousProducts = [...products];
    setProducts(prev => prev.filter(p => p.id !== id));

    try {
      const res = await fetch(`/api/catalog/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao remover vinho do catálogo.');
      // Re-sincroniza o catálogo para manter dados consistentes com a API
      fetchProducts();
    } catch (err: any) {
      // Reverte o estado em caso de erro
      setProducts(previousProducts);
      setError(err.message || 'Falha ao excluir o vinho.');
    }
  };

  const handleAddToCart = async (productId: string) => {
    if (!currentUser) {
      alert('Por favor, faça login para adicionar itens ao carrinho.');
      onNavigateToAuth();
      return;
    }
    setAddingId(productId);
    try {
      const res = await fetch('/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, quantity: 1 }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao adicionar item.');
      onItemAddedToCart();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <section className="catalog-section animate-fade" aria-label="Catálogo de vinhos">

      {/* Hero Editorial */}
      <HeroSection />

      {/* Cabeçalho & Filtros */}
      <div className="catalog-header" id="vitrine-vinhos">
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <p className="section-subtitle">Adega Premium</p>
            <h1 className="section-title" style={{ marginTop: '0.35rem' }}>Nossa Seleção</h1>
          </div>
          {isAdmin && (
            <div className="admin-toolbar" style={{ margin: 0 }}>
              <Button variant="accent" onClick={openCreateModal}>
                + Adicionar Vinho
              </Button>
            </div>
          )}
        </div>

        {/* Barra de Filtros */}
        <div className="catalog-filter-bar">
          <select
            className="filter-select"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            aria-label="Filtrar por tipo de vinho"
          >
            <option value="">Todos os tipos</option>
            {['Tinto', 'Branco', 'Rosé', 'Espumante', 'Sobremesa'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <input
            type="text"
            className="filter-select"
            style={{ paddingRight: '0.9rem', backgroundImage: 'none' }}
            placeholder="Uva..."
            value={filterGrape}
            onChange={e => setFilterGrape(e.target.value)}
            aria-label="Filtrar por uva"
          />

          <input
            type="text"
            className="filter-select"
            style={{ paddingRight: '0.9rem', backgroundImage: 'none' }}
            placeholder="País..."
            value={filterCountry}
            onChange={e => setFilterCountry(e.target.value)}
            aria-label="Filtrar por país"
          />
        </div>

        {/* Chips de Filtros Ativos */}
        {(filterType || filterGrape || filterCountry) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Filtros ativos:</span>
            {filterType && (
              <span className="filter-chip">
                Tipo: {filterType}
                <button className="filter-chip-remove" onClick={() => setFilterType('')}>×</button>
              </span>
            )}
            {filterGrape && (
              <span className="filter-chip">
                Uva: {filterGrape}
                <button className="filter-chip-remove" onClick={() => setFilterGrape('')}>×</button>
              </span>
            )}
            {filterCountry && (
              <span className="filter-chip">
                País: {filterCountry}
                <button className="filter-chip-remove" onClick={() => setFilterCountry('')}>×</button>
              </span>
            )}
            <button
              className="filter-clear"
              onClick={() => { setFilterType(''); setFilterGrape(''); setFilterCountry(''); }}
              style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-gold)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'var(--space-2)' }}
            >
              Limpar todos
            </button>
          </div>
        )}
      </div>

      {/* Estados do Grid */}
      {loading ? (
        <div className="loading-spinner">
          <div className="spinner" />
          Carregando adega…
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#fca5a5', background: 'rgba(127,29,29,0.08)', borderRadius: '12px' }}>
          {error}
        </div>
      ) : products.length === 0 ? (
        <div className="catalog-empty">
          <div className="catalog-empty-icon">🍷</div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Nenhum vinho encontrado com os filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="grid-catalog">
          {products.map(product => (
            <WineCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
              isAdding={addingId === product.id}
              isAdmin={isAdmin}
              currentUser={currentUser}
              onNavigateToAuth={onNavigateToAuth}
              onEdit={openEditModal}
              onDelete={handleDeleteProduct}
            />
          ))}
        </div>

      )}

      {/* Modal CRUD Admin */}
      {showModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Formulário de produto">
          <div className="modal-box glass-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingProduct ? 'Editar Vinho' : 'Novo Vinho'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)} aria-label="Fechar modal">×</button>
            </div>

            {formError && <div className="auth-error">{formError}</div>}

            <form onSubmit={handleSaveProduct}>
              <Input
                label="Nome do Vinho"
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                required
              />

              <div className="form-row">
                <Input
                  label="Preço (R$)"
                  type="number"
                  step="0.01"
                  value={formPrice}
                  onChange={e => setFormPrice(e.target.value)}
                  required
                />
                <div className="form-group">
                  <label className="form-label">Tipo de Vinho</label>
                  <select className="form-select" value={formType} onChange={e => setFormType(e.target.value as any)}>
                    {['Tinto', 'Branco', 'Rosé', 'Espumante', 'Sobremesa'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Campo Duplo de Imagem: Upload do Computador ou URL Externa */}
              <div className="form-group">
                <label className="form-label">Imagem do Vinho</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                      {uploading ? 'Enviando foto…' : '📁 Escolher do Computador'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={uploading}
                        style={{ display: 'none' }}
                      />
                    </label>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>ou insira a URL abaixo:</span>
                  </div>

                  <Input
                    placeholder="https://… ou /uploads/…"
                    type="text"
                    value={formImage}
                    onChange={e => setFormImage(e.target.value)}
                  />

                  {/* Pré-visualização da Imagem */}
                  {formImage && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem', padding: '0.5rem', background: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)' }}>
                      <img
                        src={formImage}
                        alt="Pré-visualização"
                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px' }}
                        onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Preview: {formImage}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Descrição</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  required
                  style={{ resize: 'none', height: 'auto', padding: 'var(--space-3)' }}
                />
              </div>

              <div className="form-row">
                <Input
                  label="Uva Principal"
                  type="text"
                  value={formGrape}
                  onChange={e => setFormGrape(e.target.value)}
                  required
                />
                <Input
                  label="País de Origem"
                  type="text"
                  value={formCountry}
                  onChange={e => setFormCountry(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <Input
                  label="Safra (Ano)"
                  type="number"
                  value={formHarvest}
                  onChange={e => setFormHarvest(e.target.value)}
                  required
                />
                <Input
                  label="Teor Alcoólico (%)"
                  type="number"
                  step="0.1"
                  value={formAlcohol}
                  onChange={e => setFormAlcohol(e.target.value)}
                  required
                />
              </div>

              <div className="flex-between" style={{ marginTop: 'var(--space-6)', gap: 'var(--space-3)' }}>
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" isLoading={formLoading}>
                  Salvar Vinho
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </section>
  );
};
