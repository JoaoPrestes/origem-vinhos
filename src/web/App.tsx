import React, { useState, useEffect } from 'react';
import { AgeGate } from './components/AgeGate';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Catalog } from './pages/Catalog';
import { Auth } from './pages/Auth';
import { Cart } from './pages/Cart';
import { Profile } from './pages/Profile';
import { Checkout } from './pages/Checkout';
import { Favorites } from './pages/Favorites';
import { OrderConfirmation } from './pages/OrderConfirmation';
import { MyOrders } from './pages/MyOrders';
import { useFavorites } from './contexts/FavoritesContext';

type Page = 'catalog' | 'auth' | 'cart' | 'profile' | 'checkout' | 'favorites' | 'order-confirmation' | 'my-orders';

export const App: React.FC = () => {
  const [isAgeVerified, setIsAgeVerified] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<Page>('catalog');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const { refreshFavorites, syncPendingFavorites, toastMessage, clearToast } = useFavorites();

  const checkSession = async () => {
    try {
      const res = await fetch('/api/identity/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchCartCount = async () => {
    if (!currentUser) { setCartCount(0); return; }
    try {
      const res = await fetch('/api/cart');
      if (res.ok) {
        const data = await res.json();
        const count = data.items
          ? data.items.reduce((s: number, i: any) => s + i.quantity, 0)
          : 0;
        setCartCount(count);
      }
    } catch { setCartCount(0); }
  };

  useEffect(() => { checkSession(); }, []);
  useEffect(() => { fetchCartCount(); }, [currentUser, currentPage]);

  useEffect(() => {
    if (currentUser) {
      syncPendingFavorites(currentUser).then(() => {
        refreshFavorites(currentUser);
      });
    } else {
      refreshFavorites(null);
    }
  }, [currentUser]);

  // Auto-dismiss toast após 4 segundos
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        clearToast();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    setCurrentPage('catalog');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCartCount(0);
    setCurrentPage('catalog');
  };

  if (loading) {
    return (
      <div className="loading-spinner" style={{ height: '100vh' }}>
        <div className="spinner" />
        Carregando adega…
      </div>
    );
  }

  const showAgeGate = !isAgeVerified && !currentUser;

  return (
    <>
      {showAgeGate ? (
        <AgeGate onConfirm={() => setIsAgeVerified(true)} />
      ) : (
        <div className="app-shell">
          {/* ── NAVBAR MODULAR ── */}
          <Navbar
            currentPage={currentPage}
            onNavigate={(page) => setCurrentPage(page)}
            currentUser={currentUser}
            cartCount={cartCount}
          />

          {/* ── CONTEÚDO ── */}
          <main className="page-content" role="main">
            {currentPage === 'catalog' && (
              <Catalog
                currentUser={currentUser}
                onNavigateToAuth={() => setCurrentPage('auth')}
                onItemAddedToCart={fetchCartCount}
              />
            )}
            {currentPage === 'auth' && (
              <Auth
                onLoginSuccess={handleLoginSuccess}
                onNavigateToCatalog={() => setCurrentPage('catalog')}
              />
            )}
            {currentPage === 'cart' && (
              <Cart
                onNavigateToCatalog={() => setCurrentPage('catalog')}
                onNavigateToCheckout={() => setCurrentPage('checkout')}
              />
            )}
            {currentPage === 'checkout' && (
              <Checkout
                onNavigateToCatalog={() => setCurrentPage('catalog')}
                onNavigateToCart={() => setCurrentPage('cart')}
                onNavigateToProfile={() => setCurrentPage('profile')}
                onNavigateToOrderConfirmation={(orderId) => {
                  setSelectedOrderId(orderId);
                  setCurrentPage('order-confirmation');
                  fetchCartCount();
                }}
              />
            )}
            {currentPage === 'order-confirmation' && selectedOrderId && (
              <OrderConfirmation
                orderId={selectedOrderId}
                onNavigateToCatalog={() => setCurrentPage('catalog')}
                onNavigateToMyOrders={() => setCurrentPage('my-orders')}
              />
            )}
            {currentPage === 'my-orders' && (
              <MyOrders
                onNavigateToCatalog={() => setCurrentPage('catalog')}
                onSelectOrder={(orderId) => {
                  setSelectedOrderId(orderId);
                  setCurrentPage('order-confirmation');
                }}
              />
            )}
            {currentPage === 'profile' && (
              <Profile
                currentUser={currentUser}
                onLogout={handleLogout}
                onNavigateToCatalog={() => setCurrentPage('catalog')}
              />
            )}
            {currentPage === 'favorites' && (
              <Favorites
                currentUser={currentUser}
                onNavigateToCatalog={() => setCurrentPage('catalog')}
                onNavigateToAuth={() => setCurrentPage('auth')}
                onItemAddedToCart={fetchCartCount}
              />
            )}
          </main>

          {/* ── TOAST NOTIFICATIONS GLOBAL ── */}
          {toastMessage && (
            <div className="toast-container" role="status" aria-live="polite">
              <div className="toast-notification">
                <span>{toastMessage}</span>
                <button
                  onClick={clearToast}
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-gold)', cursor: 'pointer', fontSize: '1rem', marginLeft: 'auto' }}
                  aria-label="Fechar notificação"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* ── FOOTER MODULAR ── */}
          <Footer onNavigate={(page) => setCurrentPage(page)} />
        </div>
      )}
    </>
  );
};

export default App;

