import React from 'react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

export const HeroSection: React.FC = () => {
  const handleScrollToCatalog = () => {
    const target = document.getElementById('vitrine-vinhos');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="hero-section animate-fade">
      <div className="hero-overlay" />
      <div className="hero-content">
        <Badge variant="gold" className="hero-badge">
          ✨ Curadoria de Excelência & Rótulos Exclusivos
        </Badge>
        <h1 className="hero-title">
          A Arte de Apreciar <br />
          <span className="text-accent" style={{ fontStyle: 'italic' }}>Vinhos Extraordinários</span>
        </h1>
        <p className="hero-sub">
          Explore rótulos raros de safras premiadas mundialmente, com armazenamento climatizado
          rigoroso e entrega refrigerada em todo o Brasil.
        </p>
        <div className="hero-actions">
          <Button
            variant="accent"
            size="lg"
            onClick={handleScrollToCatalog}
          >
            Explorar Adega
          </Button>
        </div>
      </div>
    </div>
  );
};
