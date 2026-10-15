import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';

interface AgeGateProps {
  onConfirm: () => void;
}

export const AgeGate: React.FC<AgeGateProps> = ({ onConfirm }) => {
  const [visible, setVisible] = useState(false);
  const [showRestriction, setShowRestriction] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('ov_age_verified');
    if (stored === 'true') {
      onConfirm();
    } else {
      setVisible(true);
    }
  }, []);

  const handleConfirm = () => {
    localStorage.setItem('ov_age_verified', 'true');
    setVisible(false);
    onConfirm();
  };

  if (!visible) return null;

  return (
    <div className="age-gate-overlay" role="dialog" aria-modal="true" aria-label="Verificação de idade">
      <div className="age-gate-box glass-panel">
        <div className="age-gate-logo">Origem Vinhos</div>
        <div className="age-gate-divider" aria-hidden="true" />

        {showRestriction ? (
          <div className="age-gate-restricted" style={{ textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
            <h1 className="age-gate-headline" style={{ color: 'var(--palette-red-500)', marginBottom: 'var(--space-4)' }}>
              Acesso Restrito
            </h1>
            <p className="age-gate-sub" style={{ marginBottom: 'var(--space-6)' }}>
              A apreciação dos nossos vinhos é exclusiva para maiores de idade. Você deve ter 21 anos ou mais para acessar.
            </p>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => setShowRestriction(false)}
            >
              Voltar
            </Button>
          </div>
        ) : (
          <>
            <h1 className="age-gate-headline">
              Você tem 21 anos<br />ou mais?
            </h1>
            <p className="age-gate-sub">
              Este site é dedicado à apreciação responsável de vinhos.<br />
              O acesso é restrito a maiores de idade.
            </p>

            <div className="age-gate-actions" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <Button
                variant="accent"
                size="lg"
                className="w-full"
                onClick={handleConfirm}
                autoFocus
              >
                Sim, tenho 21 anos ou mais
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => setShowRestriction(true)}
              >
                Não, sou menor de idade
              </Button>
            </div>
          </>
        )}

        <p className="age-gate-disclaimer">
          Ao acessar este site, você concorda com os nossos Termos de Uso.<br />
          A venda e o consumo de bebidas alcoólicas são proibidos para menores de 21 anos.
        </p>
      </div>
    </div>
  );
};
