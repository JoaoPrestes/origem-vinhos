import React from 'react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { useFavorites } from '../contexts/FavoritesContext';

export interface Product {
  id: string;
  name: string;
  price: string;
  description: string;
  image: string;
  type: 'Tinto' | 'Branco' | 'Rosé' | 'Espumante' | 'Sobremesa';
  grape: string;
  country: string;
  harvest: number;
  alcohol: string;
  stock?: number;
}

interface WineCardProps {
  product: Product;
  onAddToCart: (id: string) => void;
  isAdding: boolean;
  isAdmin?: boolean;
  currentUser?: any;
  onNavigateToAuth?: () => void;
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=500';

export const WineCard: React.FC<WineCardProps> = ({
  product,
  onAddToCart,
  isAdding,
  isAdmin,
  currentUser,
  onNavigateToAuth,
  onEdit,
  onDelete,
}) => {
  const { favoriteIds, toggleFavorite, loadingProductIds } = useFavorites();
  const isFavorited = favoriteIds.includes(product.id);
  const isLoadingFavorite = !!loadingProductIds[product.id];

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(product.id, currentUser, onNavigateToAuth);
  };

  return (
    <article className="wine-card animate-fade">
      {/* Imagem com overlay de especificações (hover) */}
      <div className="wine-card-img-wrap">
        <img
          src={product.image}
          alt={product.name}
          className="wine-card-img"
          onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
          loading="lazy"
        />

        {/* Botão de Favorito (ocultado para Administradores) */}
        {!isAdmin && (
          <button
            type="button"
            className={`favorite-btn ${isFavorited ? 'active' : ''}`}
            onClick={handleFavoriteClick}
            disabled={isLoadingFavorite}
            title={isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            aria-label={isFavorited ? `Remover ${product.name} dos favoritos` : `Favoritar ${product.name}`}
          >
            {isLoadingFavorite ? '⏳' : isFavorited ? '❤️' : '🤍'}
          </button>
        )}

        {/* Overlay de especificações ao passar o mouse */}
        <div className="wine-card-overlay" aria-hidden="true">
          <div className="wine-card-details">
            <span className="wine-card-spec">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                <path d="M8 22h8" />
                <path d="M12 15v7" />
                <path d="M12 15a7 7 0 0 0 7-7c0-2-1-3.5-2.5-4.5A11 11 0 0 0 12 2a11 11 0 0 0-4.5 1.5C6 4.5 5 6 5 8a7 7 0 0 0 7 7Z" />
              </svg> {product.grape}</span>
            <span className="wine-card-spec">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg> {product.harvest}</span>
            <span className="wine-card-spec">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                <line x1="19" x2="5" y1="5" y2="19" />
                <circle cx="6.5" cy="6.5" r="2.5" />
                <circle cx="17.5" cy="17.5" r="2.5" />
              </svg> {product.alcohol}%</span>
          </div>
          <Button
            variant="accent"
            size="sm"
            className="wine-card-cta"
            onClick={() => onAddToCart(product.id)}
            isLoading={isAdding}
            aria-label={`Adicionar ${product.name} ao carrinho`}
          >
            {isAdding ? 'Adicionando…' : 'Adicionar ao Carrinho'}
          </Button>
        </div>

        {/* Ações de Administrador */}
        {isAdmin && (
          <div className="wine-card-admin-actions" role="group" aria-label="Ações de administrador">
            <button
              type="button"
              className="admin-action-btn admin-action-edit"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                onEdit?.(product);
              }}
              title="Editar vinho"
              aria-label={`Editar ${product.name}`}
            >
              ✎
            </button>
            <button
              type="button"
              className="admin-action-btn admin-action-delete"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                onDelete?.(product.id);
              }}
              title="Excluir vinho"
              aria-label={`Excluir ${product.name}`}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Corpo do Card */}
      <div className="wine-card-body">
        <div className="wine-card-type">
          <Badge variant="wine">{product.type}</Badge>
        </div>
        <h2 className="wine-card-name">{product.name}</h2>
        <p className="wine-card-country">{product.country}</p>
        <div className="wine-card-footer">
          <span className="wine-card-price">R$ {product.price}</span>
          {isAdmin && product.stock !== undefined && (
            <span
              className="wine-card-stock"
              style={{
                fontSize: '0.75rem',
                color: product.stock > 0 ? 'var(--color-text-secondary)' : '#ef4444',
                fontWeight: 500,
              }}
              title="Estoque disponível"
            >
              Estoque: {product.stock}
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

