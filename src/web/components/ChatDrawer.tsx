import React, { useState, useEffect, useRef } from 'react';

export interface RecommendedProduct {
  id: string;
  name: string;
  harvest: number;
  type: string;
  grape: string;
  price: number;
  image: string;
  stock: number;
}

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  recommendedProducts?: RecommendedProduct[];
}

export interface ChatDrawerProps {
  currentUser?: any;
  onAddToCartSuccess?: () => void;
  onNavigateToAuth?: () => void;
}

const SESSION_STORAGE_KEY = 'origem_vinhos_chat_history';

const SUGGESTION_CHIPS = [
  '🍷 Tinto encorpado para churrasco',
  '🐟 Harmonização com peixe ou frutos do mar',
  '🥂 Espumante para comemoração',
  '💰 Melhores opções até R$ 150',
];

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  currentUser,
  onAddToCartSuccess,
  onNavigateToAuth,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [addingCartId, setAddingCartId] = useState<string | null>(null);
  const [addedCartIds, setAddedCartIds] = useState<Set<string>>(new Set());

  const [messages, setMessages] = useState<ChatMessageItem[]>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // sessionStorage unavailable
    }
    return [
      {
        id: 'welcome-1',
        role: 'assistant',
        content:
          'Olá! Sou o seu Sommelier Virtual da Origem Vinhos 🍷. Como posso ajudá-lo a encontrar o rótulo ideal hoje?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // sessionStorage quota exceeded
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    const userMessage: ChatMessageItem = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setLoading(true);

    try {
      const historyPayload = newMessages
        .slice(-4)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
        }),
      });

      if (!res.ok) {
        throw new Error('Falha na resposta do sommelier');
      }

      const data = await res.json();

      const assistantMessage: ChatMessageItem = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.reply || 'Aqui estão algumas opções para você:',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendedProducts: data.recommendedProducts || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: ChatMessageItem = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content:
          'Desculpe, tive uma oscilação momentânea na conexão com a nossa adega. Pode repetir a sua pergunta?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (product: RecommendedProduct) => {
    if (!currentUser) {
      if (confirm('Para adicionar produtos ao carrinho, por favor faça login. Deseja ir para a página de login agora?')) {
        onNavigateToAuth?.();
      }
      return;
    }

    setAddingCartId(product.id);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
        }),
      });

      if (res.ok) {
        setAddedCartIds((prev) => new Set(prev).add(product.id));
        onAddToCartSuccess?.();
        setTimeout(() => {
          setAddedCartIds((prev) => {
            const next = new Set(prev);
            next.delete(product.id);
            return next;
          });
        }, 2500);
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Não foi possível adicionar o vinho ao carrinho.');
      }
    } catch {
      alert('Erro ao conectar ao carrinho.');
    } finally {
      setAddingCartId(null);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Deseja limpar o histórico da conversa com o sommelier?')) {
      const initial: ChatMessageItem[] = [
        {
          id: 'welcome-reset',
          role: 'assistant',
          content:
            'Histórico reiniciado! Em que posso ajudar você com nossos vinhos finos agora?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ];
      setMessages(initial);
      try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {}
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      {!isOpen && (
        <button
          id="chat-fab-button"
          className="chat-fab-button"
          onClick={() => setIsOpen(true)}
          aria-label="Falar com o Sommelier Virtual"
          title="Falar com o Sommelier Virtual"
        >
          <span className="chat-fab-icon">🍷</span>
          <span className="chat-fab-text">Sommelier IA</span>
          <span className="chat-fab-status-dot" />
        </button>
      )}

      {/* Flyout Drawer Panel */}
      {isOpen && (
        <div id="chat-drawer-container" className="chat-drawer-container">
          {/* Header */}
          <div className="chat-drawer-header">
            <div className="chat-drawer-header-info">
              <div className="chat-drawer-avatar">🍷</div>
              <div>
                <div className="chat-drawer-title">Sommelier Virtual</div>
                <div className="chat-drawer-subtitle">
                  <span className="chat-drawer-online-indicator" /> Online • RAG & IA Especializada
                </div>
              </div>
            </div>
            <div className="chat-drawer-actions">
              <button
                className="chat-drawer-clear-btn"
                onClick={handleClearHistory}
                title="Limpar conversa"
              >
                🗑️
              </button>
              <button
                id="chat-drawer-close-btn"
                className="chat-drawer-close-btn"
                onClick={() => setIsOpen(false)}
                title="Minimizar chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Conversation Body */}
          <div className="chat-drawer-body">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-message-row ${msg.role === 'user' ? 'user-row' : 'assistant-row'}`}
              >
                {msg.role === 'assistant' && <div className="chat-avatar-mini">🍷</div>}
                <div className="chat-bubble-container">
                  <div className={`chat-bubble ${msg.role === 'user' ? 'user-bubble' : 'assistant-bubble'}`}>
                    <div className="chat-bubble-text">{msg.content}</div>
                    <div className="chat-bubble-time">{msg.timestamp}</div>
                  </div>

                  {/* Wine Mini Cards (spec09 §8.6 & §9) */}
                  {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                    <div className="chat-mini-cards-container">
                      {msg.recommendedProducts.map((wine) => {
                        const isAdded = addedCartIds.has(wine.id);
                        const isAdding = addingCartId === wine.id;
                        return (
                          <div key={wine.id} className="chat-wine-mini-card">
                            <img
                              src={wine.image || '/images/default-wine.png'}
                              alt={wine.name}
                              className="chat-wine-mini-card-img"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&q=80';
                              }}
                            />
                            <div className="chat-wine-mini-card-details">
                              <div className="chat-wine-mini-card-name">
                                {wine.name} {wine.harvest ? `(${wine.harvest})` : ''}
                              </div>
                              <div className="chat-wine-mini-card-tags">
                                <span className="chat-wine-tag">{wine.type}</span>
                                {wine.grape && <span className="chat-wine-tag">{wine.grape}</span>}
                              </div>
                              <div className="chat-wine-mini-card-price">
                                R$ {Number(wine.price).toFixed(2).replace('.', ',')}
                              </div>
                              <div className="chat-wine-mini-card-stock">
                                {wine.stock > 0 ? (
                                  <span className="stock-in">Disponível ({wine.stock} un.)</span>
                                ) : (
                                  <span className="stock-out">Esgotado</span>
                                )}
                              </div>
                              <button
                                className={`chat-wine-add-btn ${isAdded ? 'btn-added' : ''}`}
                                disabled={wine.stock <= 0 || isAdding}
                                onClick={() => handleAddToCart(wine)}
                              >
                                {isAdding ? 'Adicionando...' : isAdded ? '✓ Adicionado!' : '+ Adicionar ao Carrinho'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-message-row assistant-row">
                <div className="chat-avatar-mini">🍷</div>
                <div className="chat-typing-indicator">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion Chips */}
          <div className="chat-suggestion-chips-container">
            {SUGGESTION_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                className="chat-suggestion-chip"
                onClick={() => handleSendMessage(chip)}
                disabled={loading}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <form
            className="chat-drawer-footer"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <div className="chat-input-wrapper">
              <input
                id="chat-user-input"
                type="text"
                className="chat-drawer-input"
                placeholder="Pergunte ao Sommelier (ex: harmonização com risoto)..."
                value={inputText}
                maxLength={500}
                onChange={(e) => setInputText(e.target.value)}
                disabled={loading}
              />
              <span className="chat-char-counter">{inputText.length}/500</span>
            </div>
            <button
              id="chat-send-button"
              type="submit"
              className="chat-drawer-send-btn"
              disabled={loading || inputText.trim().length === 0}
              aria-label="Enviar mensagem"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
};
