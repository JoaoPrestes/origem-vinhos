import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Product } from '../components/WineCard';

const PENDING_FAVORITES_KEY = 'origem_vinhos_pending_favorites';

export interface FavoritesContextType {
  favoriteIds: string[];
  favoritesList: Product[];
  favoritesCount: number;
  loadingProductIds: Record<string, boolean>;
  loadingList: boolean;
  toastMessage: string | null;
  clearToast: () => void;
  toggleFavorite: (productId: string, currentUser: any, onNavigateToAuth?: () => void) => Promise<void>;
  addFavorite: (productId: string, currentUser: any) => Promise<void>;
  removeFavorite: (productId: string, currentUser: any) => Promise<void>;
  refreshFavorites: (currentUser: any) => Promise<void>;
  syncPendingFavorites: (currentUser: any) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoritesList, setFavoritesList] = useState<Product[]>([]);
  const [loadingProductIds, setLoadingProductIds] = useState<Record<string, boolean>>({});
  const [loadingList, setLoadingList] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const clearToast = () => {
    setToastMessage(null);
  };

  // Carrega IDs dos favoritos do usuário autenticado
  const refreshFavoriteIds = async () => {
    try {
      const res = await fetch('/api/favorites/ids');
      if (res.ok) {
        const data = await res.json();
        setFavoriteIds(data.ids || []);
      }
    } catch {
      // Ignora erro em caso de falha de rede ocasional
    }
  };

  // Carrega a lista completa de produtos favoritos do usuário autenticado
  const refreshFavoritesList = async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/favorites');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setFavoritesList(data);
          setFavoriteIds(data.map((p: Product) => p.id));
        }
      }
    } catch {
      // Ignora erro silenciosamente ou preserva estado anterior
    } finally {
      setLoadingList(false);
    }
  };

  const refreshFavorites = useCallback(async (currentUser: any) => {
    if (!currentUser || currentUser.profile === 'Admin') {
      setFavoriteIds([]);
      setFavoritesList([]);
      return;
    }
    await Promise.all([refreshFavoriteIds(), refreshFavoritesList()]);
  }, []);

  // Sincroniza a lista de favoritos pendentes salvos em localStorage após o login
  const syncPendingFavorites = useCallback(async (currentUser: any) => {
    if (!currentUser || currentUser.profile === 'Admin') return;

    try {
      const raw = localStorage.getItem(PENDING_FAVORITES_KEY);
      if (!raw) return;

      const pendingIds: string[] = JSON.parse(raw);
      if (!Array.isArray(pendingIds) || pendingIds.length === 0) return;

      // Executa requisições de adição para cada ID pendente
      for (const productId of pendingIds) {
        await fetch('/api/favorites/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        });
      }

      // Limpa a fila no localStorage
      localStorage.removeItem(PENDING_FAVORITES_KEY);
      showToast(`${pendingIds.length} vinho(s) favorito(s) pendente(s) foram sincronizados com sua conta!`);

      // Recarrega lista atualizada
      await refreshFavorites(currentUser);
    } catch (err) {
      console.error('Erro ao sincronizar favoritos pendentes:', err);
    }
  }, [refreshFavorites]);

  // Alternar favorito (Toggle) com Optimistic UI + Rollback e Suporte a Anônimos
  const toggleFavorite = async (
    productId: string,
    currentUser: any,
    onNavigateToAuth?: () => void
  ) => {
    // 1. Visitante Anônimo: Salvar no localStorage e Redirecionar para Login
    if (!currentUser) {
      try {
        const raw = localStorage.getItem(PENDING_FAVORITES_KEY);
        let pendingIds: string[] = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(pendingIds)) pendingIds = [];

        if (!pendingIds.includes(productId)) {
          pendingIds.push(productId);
          localStorage.setItem(PENDING_FAVORITES_KEY, JSON.stringify(pendingIds));
        }

        showToast('Vinho adicionado aos seus favoritos pendentes. Faça login para salvar em sua conta!');
        if (onNavigateToAuth) onNavigateToAuth();
      } catch (e) {
        console.error('Erro ao salvar favorito pendente:', e);
      }
      return;
    }

    // Administradores não possuem lista de favoritos
    if (currentUser.profile === 'Admin') {
      showToast('Administradores não possuem lista de favoritos.');
      return;
    }

    // Prevenção de múltiplos cliques concorrentes no mesmo produto
    if (loadingProductIds[productId]) return;

    const isCurrentlyFavorited = favoriteIds.includes(productId);

    // 2. Atualização Otimista (Optimistic UI)
    const previousFavoriteIds = [...favoriteIds];
    const previousFavoritesList = [...favoritesList];

    setFavoriteIds(prev =>
      isCurrentlyFavorited ? prev.filter(id => id !== productId) : [...prev, productId]
    );

    if (isCurrentlyFavorited) {
      setFavoritesList(prev => prev.filter(p => p.id !== productId));
    }

    setLoadingProductIds(prev => ({ ...prev, [productId]: true }));

    try {
      const res = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao atualizar favorito.');
      }

      showToast(
        data.isFavorited
          ? 'Vinho adicionado aos seus favoritos! 🍷'
          : 'Vinho removido dos seus favoritos.'
      );

      // Recarrega listagem completa para garantir sincronia do objeto de produto
      await refreshFavoritesList();
    } catch (err: any) {
      // 3. Rollback Automático em caso de erro
      setFavoriteIds(previousFavoriteIds);
      setFavoritesList(previousFavoritesList);
      showToast(err.message || 'Erro ao conectar ao servidor. Alteração revertida.');
    } finally {
      setLoadingProductIds(prev => ({ ...prev, [productId]: false }));
    }
  };

  const addFavorite = async (productId: string, currentUser: any) => {
    if (!favoriteIds.includes(productId)) {
      await toggleFavorite(productId, currentUser);
    }
  };

  const removeFavorite = async (productId: string, currentUser: any) => {
    if (favoriteIds.includes(productId)) {
      await toggleFavorite(productId, currentUser);
    }
  };

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        favoritesList,
        favoritesCount: favoriteIds.length,
        loadingProductIds,
        loadingList,
        toastMessage,
        clearToast,
        toggleFavorite,
        addFavorite,
        removeFavorite,
        refreshFavorites,
        syncPendingFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = (): FavoritesContextType => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites deve ser utilizado dentro de um FavoritesProvider');
  }
  return context;
};
