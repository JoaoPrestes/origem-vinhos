import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { FavoritesProvider } from './contexts/FavoritesContext';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Elemento com id "root" não encontrado na DOM.');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <FavoritesProvider>
      <App />
    </FavoritesProvider>
  </React.StrictMode>
);

