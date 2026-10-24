import React from 'react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export interface CardFormData {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
  installments: number;
}

interface CheckoutPaymentStepProps {
  createdOrder: any;
  total: string;
  selectedMethod: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  setSelectedMethod: (method: 'PIX' | 'CREDIT_CARD' | 'BOLETO') => void;
  paymentLoading: boolean;
  paymentData: any;
  copiedPix: boolean;
  onCopyPix: () => void;
  onSimulateWebhookApproval: () => void;
  cardData: CardFormData;
  setCardData: React.Dispatch<React.SetStateAction<CardFormData>>;
  onInitiatePayment: (orderId: string, method: 'PIX' | 'CREDIT_CARD' | 'BOLETO') => void;
  onOpenCancelModal: () => void;
}

export const CheckoutPaymentStep: React.FC<CheckoutPaymentStepProps> = ({
  createdOrder,
  total,
  selectedMethod,
  setSelectedMethod,
  paymentLoading,
  paymentData,
  copiedPix,
  onCopyPix,
  onSimulateWebhookApproval,
  cardData,
  setCardData,
  onInitiatePayment,
  onOpenCancelModal,
}) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-8)' }}>
      <div>
        <div
          className="glass-panel"
          style={{
            padding: 'var(--space-6)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-surface-elevated)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h2
              style={{
                fontFamily: 'var(--font-family-serif)',
                fontSize: '1.4rem',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Como você prefere pagar?
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              Selecione o meio de pagamento para concluir sua compra com total segurança.
            </p>
          </div>

          {/* LISTA VERTICAL DE OPÇÕES - ESTILO MERCADO PAGO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {/* 1. OPÇÃO PIX */}
            <div
              style={{
                borderRadius: 'var(--radius-md)',
                border: selectedMethod === 'PIX' ? '2px solid #32BCAD' : '1px solid var(--color-border-subtle)',
                backgroundColor:
                  selectedMethod === 'PIX' ? 'rgba(50, 188, 173, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                transition: 'all 0.2s ease',
                overflow: 'hidden',
              }}
            >
              <div
                onClick={() => {
                  setSelectedMethod('PIX');
                  if (createdOrder) onInitiatePayment(createdOrder.id, 'PIX');
                }}
                style={{
                  padding: 'var(--space-4) var(--space-5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(50, 188, 173, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M6.5 12l5.5-5.5 5.5 5.5-5.5 5.5L6.5 12z"
                        stroke="#32BCAD"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M3 12l9-9 9 9-9 9-9-9z"
                        stroke="#32BCAD"
                        strokeWidth="1.2"
                        strokeDasharray="2 2"
                      />
                    </svg>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span
                        style={{
                          fontWeight: 600,
                          color: 'var(--color-text-primary)',
                          fontSize: 'var(--font-size-md)',
                        }}
                      >
                        Pix
                      </span>
                      <span
                        style={{
                          backgroundColor: '#009ee3',
                          color: '#fff',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        NOVO
                      </span>
                    </div>
                    <p
                      style={{
                        color: 'var(--color-text-secondary)',
                        fontSize: 'var(--font-size-xs)',
                        marginTop: '2px',
                      }}
                    >
                      Aprovação imediata
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border:
                        selectedMethod === 'PIX'
                          ? '6px solid #32BCAD'
                          : '2px solid var(--color-border-medium)',
                      backgroundColor: '#fff',
                      transition: 'all 0.2s ease',
                    }}
                  />
                </div>
              </div>

              {/* Detalhes Expansíveis do Pix */}
              {selectedMethod === 'PIX' && (
                <div
                  style={{
                    padding: 'var(--space-5)',
                    borderTop: '1px solid rgba(50, 188, 173, 0.2)',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    textAlign: 'center',
                  }}
                >
                  <p
                    style={{
                      color: 'var(--color-text-secondary)',
                      fontSize: 'var(--font-size-sm)',
                      marginBottom: 'var(--space-4)',
                    }}
                  >
                    Abra o app do seu banco, escolha <strong>Pagar via Pix</strong> e escaneie o código ou cole a
                    chave abaixo:
                  </p>

                  {/* QR Code Container */}
                  <div
                    style={{
                      display: 'inline-block',
                      padding: 'var(--space-4)',
                      backgroundColor: '#ffffff',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                      marginBottom: 'var(--space-4)',
                    }}
                  >
                    {paymentData?.pixQrCodeBase64 ? (
                      <img
                        src={paymentData.pixQrCodeBase64}
                        alt="QR Code Pix"
                        style={{ width: '180px', height: '180px', display: 'block' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '180px',
                          height: '180px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <div className="spinner" />
                      </div>
                    )}
                  </div>

                  {/* Pix Copia e Cola */}
                  {paymentData?.pixQrCode && (
                    <div style={{ maxWidth: '440px', margin: '0 auto var(--space-4)' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-2)',
                          backgroundColor: 'rgba(0,0,0,0.4)',
                          border: '1px solid var(--color-border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: 'var(--space-2) var(--space-3)',
                        }}
                      >
                        <input
                          type="text"
                          readOnly
                          value={paymentData.pixQrCode}
                          style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-primary)',
                            fontSize: 'var(--font-size-xs)',
                            outline: 'none',
                            fontFamily: 'monospace',
                          }}
                        />
                        <Button
                          variant="accent"
                          size="sm"
                          onClick={onCopyPix}
                          style={{
                            flexShrink: 0,
                            padding: '4px 12px',
                            fontSize: 'var(--font-size-xs)',
                          }}
                        >
                          {copiedPix ? '✓ Copiado!' : 'Copiar'}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 'var(--space-2)',
                      color: 'var(--color-text-gold)',
                      fontSize: 'var(--font-size-xs)',
                    }}
                  >
                    <div className="spinner" style={{ width: '13px', height: '13px' }} />
                    <span>Aguardando identificação do pagamento em tempo real…</span>
                  </div>

                  <div
                    style={{
                      marginTop: 'var(--space-5)',
                      borderTop: '1px dashed var(--color-border-subtle)',
                      paddingTop: 'var(--space-4)',
                    }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onSimulateWebhookApproval}
                      style={{ color: '#32BCAD', borderColor: '#32BCAD' }}
                    >
                      ⚡ Simular Pagamento Aprovado (Demonstração)
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. OPÇÃO CARTÃO DE CRÉDITO */}
            <div
              style={{
                borderRadius: 'var(--radius-md)',
                border:
                  selectedMethod === 'CREDIT_CARD'
                    ? '2px solid var(--color-accent)'
                    : '1px solid var(--color-border-subtle)',
                backgroundColor:
                  selectedMethod === 'CREDIT_CARD'
                    ? 'rgba(212, 175, 55, 0.06)'
                    : 'rgba(255, 255, 255, 0.02)',
                transition: 'all 0.2s ease',
                overflow: 'hidden',
              }}
            >
              <div
                onClick={() => setSelectedMethod('CREDIT_CARD')}
                style={{
                  padding: 'var(--space-4) var(--space-5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(33, 150, 243, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2196f3"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <line x1="2" y1="10" x2="22" y2="10" />
                      <circle cx="6" cy="15" r="1" fill="#2196f3" />
                    </svg>
                  </div>

                  <div>
                    <span
                      style={{
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        fontSize: 'var(--font-size-md)',
                      }}
                    >
                      Cartão de Crédito
                    </span>
                    <p
                      style={{
                        color: 'var(--color-text-secondary)',
                        fontSize: 'var(--font-size-xs)',
                        marginTop: '2px',
                      }}
                    >
                      Em até 6x sem juros no cartão
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border:
                        selectedMethod === 'CREDIT_CARD'
                          ? '6px solid var(--color-accent)'
                          : '2px solid var(--color-border-medium)',
                      backgroundColor: '#fff',
                      transition: 'all 0.2s ease',
                    }}
                  />
                </div>
              </div>

              {/* Detalhes Expansíveis do Cartão */}
              {selectedMethod === 'CREDIT_CARD' && (
                <div
                  style={{
                    padding: 'var(--space-5)',
                    borderTop: '1px solid rgba(212, 175, 55, 0.2)',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-4)',
                      maxWidth: '440px',
                      margin: '0 auto',
                    }}
                  >
                    <div>
                      <label className="auth-label">Número do Cartão</label>
                      <input
                        type="text"
                        className="auth-input"
                        placeholder="0000 0000 0000 0000"
                        maxLength={19}
                        value={cardData.number}
                        onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="auth-label">Nome Completo do Titular</label>
                      <input
                        type="text"
                        className="auth-input"
                        placeholder="NOME COMO IMPRESSO NO CARTÃO"
                        value={cardData.name}
                        onChange={(e) => setCardData({ ...cardData, name: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 'var(--space-4)',
                      }}
                    >
                      <div>
                        <label className="auth-label">Validade (MM/AA)</label>
                        <input
                          type="text"
                          className="auth-input"
                          placeholder="12/28"
                          maxLength={5}
                          value={cardData.expiry}
                          onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="auth-label">CVV</label>
                        <input
                          type="password"
                          className="auth-input"
                          placeholder="123"
                          maxLength={4}
                          value={cardData.cvv}
                          onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="auth-label">Parcelamento</label>
                      <select
                        className="auth-input"
                        value={cardData.installments}
                        onChange={(e) =>
                          setCardData({ ...cardData, installments: Number(e.target.value) })
                        }
                      >
                        <option value={1}>1x de R$ {total} sem juros</option>
                        <option value={2}>2x de R$ {(Number(total) / 2).toFixed(2)} sem juros</option>
                        <option value={3}>3x de R$ {(Number(total) / 3).toFixed(2)} sem juros</option>
                        <option value={6}>6x de R$ {(Number(total) / 6).toFixed(2)} sem juros</option>
                      </select>
                    </div>

                    <Button
                      variant="accent"
                      size="lg"
                      className="w-full"
                      disabled={paymentLoading}
                      onClick={() => onInitiatePayment(createdOrder.id, 'CREDIT_CARD')}
                    >
                      {paymentLoading ? 'Processando Cartão…' : `Pagar R$ ${total}`}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. OPÇÃO BOLETO */}
            <div
              style={{
                borderRadius: 'var(--radius-md)',
                border:
                  selectedMethod === 'BOLETO'
                    ? '2px solid var(--color-accent)'
                    : '1px solid var(--color-border-subtle)',
                backgroundColor:
                  selectedMethod === 'BOLETO'
                    ? 'rgba(212, 175, 55, 0.06)'
                    : 'rgba(255, 255, 255, 0.02)',
                transition: 'all 0.2s ease',
                overflow: 'hidden',
              }}
            >
              <div
                onClick={() => {
                  setSelectedMethod('BOLETO');
                  if (createdOrder) onInitiatePayment(createdOrder.id, 'BOLETO');
                }}
                style={{
                  padding: 'var(--space-4) var(--space-5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(158, 158, 158, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#bbb"
                      strokeWidth="2"
                    >
                      <line x1="3" y1="4" x2="3" y2="20" />
                      <line x1="6" y1="4" x2="6" y2="20" />
                      <line x1="10" y1="4" x2="10" y2="20" strokeWidth="3" />
                      <line x1="14" y1="4" x2="14" y2="20" />
                      <line x1="18" y1="4" x2="18" y2="20" strokeWidth="2.5" />
                      <line x1="21" y1="4" x2="21" y2="20" />
                    </svg>
                  </div>

                  <div>
                    <span
                      style={{
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        fontSize: 'var(--font-size-md)',
                      }}
                    >
                      Boleto Bancário
                    </span>
                    <p
                      style={{
                        color: 'var(--color-text-secondary)',
                        fontSize: 'var(--font-size-xs)',
                        marginTop: '2px',
                      }}
                    >
                      Será aprovado em 1 a 2 dias úteis
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border:
                        selectedMethod === 'BOLETO'
                          ? '6px solid var(--color-accent)'
                          : '2px solid var(--color-border-medium)',
                      backgroundColor: '#fff',
                      transition: 'all 0.2s ease',
                    }}
                  />
                </div>
              </div>

              {/* Detalhes Expansíveis do Boleto */}
              {selectedMethod === 'BOLETO' && (
                <div
                  style={{
                    padding: 'var(--space-5)',
                    borderTop: '1px solid rgba(212, 175, 55, 0.2)',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    textAlign: 'center',
                  }}
                >
                  <p
                    style={{
                      color: 'var(--color-text-secondary)',
                      fontSize: 'var(--font-size-sm)',
                      marginBottom: 'var(--space-4)',
                    }}
                  >
                    O boleto tem vencimento em 3 dias úteis. A confirmação do pedido ocorrerá após compensação
                    bancária.
                  </p>
                  {paymentData?.boletoBarcode && (
                    <div
                      style={{
                        padding: 'var(--space-3)',
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: 'var(--space-4)',
                        fontFamily: 'monospace',
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-gold)',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {paymentData.boletoBarcode}
                    </div>
                  )}
                  <Button variant="accent" onClick={onSimulateWebhookApproval}>
                    ⚡ Simular Compensação Bancária
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Coluna Lateral de Resumo & Botão de Cancelamento da Compra */}
      <div>
        <div
          className="glass-panel"
          style={{
            padding: 'var(--space-6)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-surface-elevated)',
            position: 'sticky',
            top: '100px',
          }}
        >
          <h3
            style={{
              fontFamily: 'var(--font-family-serif)',
              fontSize: 'var(--font-size-md)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-3)',
            }}
          >
            Pedido: {createdOrder.displayCode}
          </h3>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-2)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <span>Itens:</span>
            <span>{createdOrder.itemsCount} garrafa(s)</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-4)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <span>Status:</span>
            <Badge variant="secondary">AGUARDANDO PAGAMENTO</Badge>
          </div>
          <div
            style={{
              borderTop: '1px solid var(--color-border-medium)',
              paddingTop: 'var(--space-4)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 'var(--space-6)',
            }}
          >
            <span style={{ fontWeight: 600 }}>Total:</span>
            <strong style={{ fontSize: 'var(--font-size-xl)', color: 'var(--color-text-gold)' }}>
              R$ {(createdOrder.totalCents / 100).toFixed(2).replace('.', ',')}
            </strong>
          </div>

          {/* BOTÃO PARA CANCELAR A COMPRA */}
          <div
            style={{
              borderTop: '1px solid var(--color-border-subtle)',
              paddingTop: 'var(--space-4)',
              textAlign: 'center',
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenCancelModal}
              style={{
                color: 'var(--color-status-error)',
                width: '100%',
                borderColor: 'rgba(229, 57, 53, 0.3)',
              }}
            >
              ✕ Cancelar Compra
            </Button>
            <p
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-secondary)',
                marginTop: 'var(--space-2)',
              }}
            >
              Os itens permanecerão no seu carrinho.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
