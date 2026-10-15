import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useFavorites } from '../contexts/FavoritesContext';

type Page = 'catalog' | 'auth' | 'cart' | 'profile' | 'checkout' | 'favorites' | 'order-confirmation' | 'my-orders';

interface NavbarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  currentUser: any;
  cartCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  currentUser,
  cartCount,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { favoritesCount } = useFavorites();

  const handleNav = (page: Page) => {
    setIsMobileMenuOpen(false);
    onNavigate(page);
  };

  const isCustomer = currentUser && currentUser.profile !== 'Admin';

  return (
    <header className="navbar" role="banner">
      <div className="navbar-inner">
        {/* Logo Marca */}
        <div className="navbar-brand-area">
          <button
            className="navbar-logo"
            onClick={() => handleNav('catalog')}
            aria-label="Ir para o início — Origem Vinhos"
          >
            <img
              src="/uploads/logo-v2.png"
              alt="Origem Vinhos"
              className="navbar-logo-img"
            />
          </button>
        </div>

        {/* Botão Hambúrguer Mobile */}
        <button
          className="navbar-mobile-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>

        {/* Links de Navegação (Desktop & Mobile Drawer) */}
        <nav className={`navbar-links ${isMobileMenuOpen ? 'mobile-open' : ''}`} role="navigation" aria-label="Navegação principal">
          <button
            className={`nav-link ${currentPage === 'catalog' ? 'active' : ''}`}
            onClick={() => handleNav('catalog')}
          >
            Adega
          </button>

          {isCustomer && (
            <button
              className={`nav-link cart-badge ${currentPage === 'favorites' ? 'active' : ''}`}
              onClick={() => handleNav('favorites')}
              aria-label={`Meus Favoritos${favoritesCount > 0 ? `, ${favoritesCount} itens` : ''}`}
            >
              Favoritos
              {favoritesCount > 0 && (
                <span className="cart-count" style={{ backgroundColor: 'var(--palette-wine-500)' }} aria-hidden="true">
                  {favoritesCount}
                </span>
              )}
            </button>
          )}

          {currentUser ? (
            <>
              <button
                className={`nav-link cart-badge ${currentPage === 'cart' ? 'active' : ''}`}
                onClick={() => handleNav('cart')}
                aria-label={`Carrinho${cartCount > 0 ? `, ${cartCount} itens` : ''}`}
              >
                Carrinho
                {cartCount > 0 && (
                  <span className="cart-count" aria-hidden="true">{cartCount}</span>
                )}
              </button>

              <button
                className={`nav-link ${currentPage === 'my-orders' ? 'active' : ''}`}
                onClick={() => handleNav('my-orders')}
              >
                Pedidos
              </button>

              <button
                className={`nav-link ${currentPage === 'profile' ? 'active' : ''}`}
                onClick={() => handleNav('profile')}
              >
                Conta
              </button>

              <span className="nav-greeting">
                Olá, <strong>{currentUser.name?.split(' ')[0]}</strong>
                {currentUser.profile === 'Admin' && (
                  <Badge variant="admin" style={{ marginLeft: '0.4rem' }}>
                    Admin
                  </Badge>
                )}
              </span>
            </>
          ) : (
            <Button
              variant="accent"
              size="sm"
              onClick={() => handleNav('auth')}
            >
              Entrar
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};

