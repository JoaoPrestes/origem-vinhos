import React from 'react';

type Page = 'catalog' | 'auth' | 'cart' | 'profile' | 'checkout';

interface FooterProps {
  onNavigate?: (page: Page) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="footer" role="contentinfo">
      <div className="page-content">
        <div className="footer-grid">
          {/* Coluna 1: Marca & Slogan */}
          <div className="footer-col">
            <div className="footer-brand">Origem Vinhos</div>
            <p className="footer-desc">
              Curadoria exclusiva de rótulos selecionados das melhores vinícolas do mundo com entrega refrigerada garantida.
            </p>
          </div>

          {/* Coluna 2: Navegação Rápida */}
          <div className="footer-col">
            <h4 className="footer-heading">Navegação</h4>
            <ul className="footer-links">
              <li>
                <button className="footer-link-btn" onClick={() => onNavigate?.('catalog')}>
                  Adega de Vinhos
                </button>
              </li>
              <li>
                <button className="footer-link-btn" onClick={() => onNavigate?.('cart')}>
                  Meu Carrinho
                </button>
              </li>
              <li>
                <button className="footer-link-btn" onClick={() => onNavigate?.('auth')}>
                  Minha Conta / Entrar
                </button>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Responsabilidade & Legislação */}
          <div className="footer-col">
            <h4 className="footer-heading">Apreciação Responsável</h4>
            <p className="footer-legal">
              A venda e o consumo de bebidas alcoólicas são proibidos para menores de 18 anos. Beba com moderação.
            </p>
            <p className="footer-copyright">
              © {new Date().getFullYear()} Origem Vinhos. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
