import React, { useState } from 'react';
import { useFavorites } from '../contexts/FavoritesContext';
import { WineCard } from '../components/WineCard';
import { Button } from '../components/ui/Button';

interface FavoritesPageProps {
  currentUser: any;
  onNavigateToCatalog: () => void;
  onNavigateToAuth: () => void;
  onItemAddedToCart: () => void;
}

export const Favorites: React.FC<FavoritesPageProps> = ({
  currentUser,
  onNavigateToCatalog,
  onNavigateToAuth,
  onItemAddedToCart,
}) => {
  const { favoritesList, loadingList } = useFavorites();
  const [addingId, setAddingId] = useState<string | null>(null);

  const handleAddToCart = async (productId: string) => {
    if (!currentUser) {
      alert('Por favor, faça login para adicionar itens ao carrinho.');
      onNavigateToAuth();
      return;
    }
    setAddingId(productId);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
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
    <section className="catalog-section animate-fade" aria-label="Meus favoritos">
      {/* Cabeçalho */}
      <div className="catalog-header" style={{ marginBottom: 'var(--space-8)' }}>
        <div>
          <p className="section-subtitle">Sua Adega Pessoal</p>
          <h1 className="section-title" style={{ marginTop: '0.35rem' }}>Meus Favoritos</h1>
        </div>
      </div>

      {/* Conteúdo */}
      {loadingList ? (
        <div className="loading-spinner">
          <div className="spinner" />
          Carregando seus favoritos…
        </div>
      ) : favoritesList.length === 0 ? (
        <div className="catalog-empty" style={{ padding: '4rem 2rem' }}>
          <div className="catalog-empty-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤍</div>
          <h2 style={{ fontFamily: 'var(--font-family-serif)', fontSize: '1.8rem', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
            Sua adega de favoritos está vazia
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', maxWidth: '420px', margin: '0 auto 1.75rem auto' }}>
            Explore nossa seleção exclusiva de rótulos e toque no ícone de coração para salvar os vinhos que deseja apreciar mais tarde.
          </p>
          <Button variant="accent" size="lg" onClick={onNavigateToCatalog}>
            Explorar Catálogo
          </Button>
        </div>
      ) : (
        <div className="grid-catalog">
          {favoritesList.map(product => (
            <WineCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
              isAdding={addingId === product.id}
              isAdmin={currentUser?.profile === 'Admin'}
              onNavigateToAuth={onNavigateToAuth}
            />
          ))}
        </div>
      )}
    </section>
  );
};
