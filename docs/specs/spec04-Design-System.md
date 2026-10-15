# Especificação Oficial do Design System — Origem Vinhos (V2 - Arquitetura Enterprise)

---

## 1. Visão Geral e Propósito

Este documento estabelece a **especificação técnica, visual e arquitetural definitiva** do Design System da marca **Origem Vinhos**. Projetado sob a perspectiva combinada de *Principal Product Designer*, *Staff Frontend Engineer* e *Design System Architect*, esta especificação consolida a fundação visual para transformar a aplicação em um e-commerce comercial de padrão internacional.

Sua arquitetura é fundamentada nos princípios de consistência, acessibilidade e escalabilidade do **Ant Design**, aliada à sofisticação estética minimalista de marcas de tecnologia e luxo como **Apple, Vercel, Linear, Stripe e Notion**.

---

## 2. Diagnóstico Crítico da UI Atual & Resolução Arquitetural

| Problema Identificado na UI | Causa Raiz no Código / CSS | Solução Arquitetural no Design System V2 |
| :--- | :--- | :--- |
| **Arquitetura de Tokens Rasa e Inconsistente** | Mistura de valores em pixels fixos, nomes genéricos e tokens não mapeados (`--surface-card` ausente no `:root`). | Implementação de **Arquitetura de Tokens em 3 Camadas** (Primitivos → Semânticos → Componentes). |
| **Ausência de Componentes Críticos de E-commerce** | Falta de modais estruturados, tabelas admin, steppers de quantidade, toasts e skeleton loaders. | Especificação detalhada de **6 novos componentes base** (`Modal`, `Toast`, `QuantityStepper`, `AdminTable`, `Skeleton`, `FilterBar`). |
| **Excesso de Espaço Vazio e Layout Desequilibrado** | Containers sem limite `max-width` adequado e ausência de grid responsivo calibrado. | Container centralizado de 1280px com grid fluido de 12 colunas e `gap` de 24px/16px. |
| **Hero Section Rígida em Telas Móveis** | Layout fixo que empurra o catálogo para fora da primeira dobra em smartphones. | **Hero Compacto no Mobile:** Ocultação da imagem lateral e redução de altura vertical em `<640px`. |
| **Header sem Presença Visual** | Fundo plano, logo sem tipografia editorial e ausência de estados ativos nítidos. | Navbar em *Glassmorphic Elevation* com `backdrop-filter: blur(16px)`, navegação em *Pills* e badge dinâmico. |
| **Formulários Simplistas e Sem Validação Visual** | Inputs com bordas genéricas do navegador e falta de anel de foco acessível. | Inputs com token semântico de foco em ouro champanhe, feedback de erro integrado e rótulos flutuantes. |
| **Animações Abruptas** | Elementos alteram estado instantaneamente sem curva de transição. | Sistema global de transição com easing tátil `cubic-bezier(0.16, 1, 0.3, 1)`. |

---

## 3. Arquitetura de Design Tokens em 3 Camadas

A fundação visual é organizada estritamente em três níveis funcionais para garantir desacoplamento total entre a paleta cromática e os componentes da interface.

```
┌─────────────────────────────────────────────────────────┐
│ Tier 1: Tokens Primitivos (Valores Brutos e Paletas)    │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ Tier 2: Tokens Semânticos (Intenção e Papel Funcional)  │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ Tier 3: Tokens de Componente (Escopo Local do Componente)│
└─────────────────────────────────────────────────────────┘
```

### 3.1 Tier 1: Tokens Primitivos (Primitives)

```css
:root {
  /* ── Primitivos Cromáticos: Vinho Bordô ── */
  --palette-wine-900: #26070B;
  --palette-wine-800: #3B0B11;
  --palette-wine-700: #58111A; /* Brand Main */
  --palette-wine-600: #781824;
  --palette-wine-500: #9C2231;

  /* ── Primitivos Cromáticos: Ouro Champanhe ── */
  --palette-gold-500: #9E7D1D;
  --palette-gold-400: #D4AF37; /* Accent Main */
  --palette-gold-300: #E6C665;
  --palette-gold-200: #F3DC9B;

  /* ── Primitivos Neutros (Escuro Profundo) ── */
  --palette-neutral-950: #0B0A0D; /* Canvas Base */
  --palette-neutral-900: #141318; /* Surface Normal */
  --palette-neutral-850: #1D1B24; /* Surface Elevated */
  --palette-neutral-800: #272430; /* Surface Interactive */
  --palette-neutral-700: #3D394A; /* Border Base */
  --palette-neutral-400: #A19DAA; /* Text Muted */
  --palette-neutral-100: #F4F3F6; /* Text Bright */

  /* ── Primitivos Semânticos Globais ── */
  --palette-red-500: #E53935;
  --palette-red-100: rgba(229, 57, 53, 0.15);
  --palette-green-500: #43A047;
  --palette-green-100: rgba(67, 160, 71, 0.15);

  /* ── Primitivos Tipográficos ── */
  --font-family-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-family-serif: 'Playfair Display', Georgia, serif;

  /* ── Primitivos de Escala de Tamanho (Ratio 1.25) ── */
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-md: 1.000rem;   /* 16px */
  --font-size-lg: 1.250rem;   /* 20px */
  --font-size-xl: 1.563rem;   /* 25px */
  --font-size-2xl: 1.953rem;  /* 31px */
  --font-size-3xl: 2.441rem;  /* 39px */
  --font-size-hero: 3.250rem; /* 52px */

  /* ── Primitivos de Espaçamento (Base 4px/8px) ── */
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.50rem;  /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1.00rem;  /* 16px */
  --space-5: 1.25rem;  /* 20px */
  --space-6: 1.50rem;  /* 24px */
  --space-8: 2.00rem;  /* 32px */
  --space-10: 2.50rem; /* 40px */
  --space-12: 3.00rem; /* 48px */
  --space-16: 4.00rem; /* 64px */

  /* ── Primitivos de Raio de Borda ── */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 18px;
  --radius-full: 9999px;
}
```

---

### 3.2 Tier 2: Tokens Semânticos (Semantic Layer)

Estes tokens traduzem a intenção de uso do elemento na interface, abstraindo completamente as cores brutas.

```css
:root {
  /* ── Superfícies & Fundos ── */
  --color-surface-base: var(--palette-neutral-950);
  --color-surface-card: var(--palette-neutral-900);
  --color-surface-elevated: var(--palette-neutral-850);
  --color-surface-interactive: var(--palette-neutral-800);
  --color-surface-glass: rgba(20, 19, 24, 0.75);

  /* ── Elementos Interativos ── */
  --color-interactive-primary: var(--palette-wine-700);
  --color-interactive-primary-hover: var(--palette-wine-600);
  --color-interactive-accent: var(--palette-gold-400);
  --color-interactive-accent-hover: var(--palette-gold-300);

  /* ── Bordas & Divisores ── */
  --color-border-subtle: rgba(255, 255, 255, 0.08);
  --color-border-medium: rgba(255, 255, 255, 0.16);
  --color-border-focus: var(--palette-gold-400);
  --color-border-accent: rgba(212, 175, 55, 0.35);

  /* ── Tipografia Semântica ── */
  --color-text-primary: var(--palette-neutral-100);   /* Contraste 15.4:1 (WCAG AAA) */
  --color-text-secondary: var(--palette-neutral-400); /* Contraste 4.8:1 (WCAG AA) */
  --color-text-gold: var(--palette-gold-300);
  --color-text-on-accent: var(--palette-neutral-950);

  /* ── Status & Feedback ── */
  --color-status-error: var(--palette-red-500);
  --color-status-error-bg: var(--palette-red-100);
  --color-status-success: var(--palette-green-500);
  --color-status-success-bg: var(--palette-green-100);

  /* ── Elevação e Sombra ── */
  --shadow-card-normal: 0 4px 16px rgba(0, 0, 0, 0.5), 0 0 1px var(--color-border-subtle);
  --shadow-card-hover: 0 12px 32px rgba(0, 0, 0, 0.7), 0 0 2px var(--color-border-accent);
  --shadow-dropdown: 0 16px 40px rgba(0, 0, 0, 0.85);

  /* ── Transição Global ── */
  --ease-smooth: cubic-bezier(0.16, 1, 0.3, 1);
  --transition-fast: 150ms var(--ease-smooth);
  --transition-normal: 250ms var(--ease-smooth);

  /* ── Anel de Foco para Acessibilidade (WCAG 2.1 AA) ── */
  --focus-ring: 0 0 0 3px rgba(212, 175, 55, 0.25), 0 0 0 1px var(--color-border-focus);
}
```

---

## 4. Grid, Layout & Responsividade

### 4.1 Regras de Alinhamento de Layout
* **Max-Width Global:** `1280px` com `margin: 0 auto`.
* **Padding Lateral de Margem:**
  * Desktop (`>1024px`): `var(--space-6)` (24px).
  * Mobile/Tablet (`<1024px`): `var(--space-4)` (16px).

### 4.2 Grid do Catálogo de Vinhos
* **Desktop (> 1024px):** 4 Colunas (`repeat(4, 1fr)`), `gap: var(--space-6)`.
* **Tablet (640px – 1024px):** 2 Colunas (`repeat(2, 1fr)`), `gap: var(--space-5)`.
* **Mobile (< 640px):** 1 Coluna (`1fr`), `gap: var(--space-4)`.

---

## 5. Especificação de Componentes de Interface (UI Component Specs)

Todos os componentes devem obrigatoriamente consumir os tokens das Camadas 2 e 3, **eliminando qualquer valor bruto de pixel ou cor em estilos CSS locais**.

### 5.1 Botões (`.btn`)
* **Variantes:**
  * `.btn-primary`: Background `var(--color-interactive-primary)`, texto `var(--color-text-primary)`. Hover: `var(--color-interactive-primary-hover)` com `translateY(-1px)`.
  * `.btn-accent`: Background `var(--color-interactive-accent)`, texto `var(--color-text-on-accent)`, peso 600. Hover: `var(--color-interactive-accent-hover)`.
  * `.btn-outline`: Background `transparent`, borda `1px solid var(--color-border-medium)`. Hover: `background: rgba(255, 255, 255, 0.05)`.
* **Tamanhos:**
  * `.btn-sm`: Altura `32px`, font-size `var(--font-size-xs)`, padding `0 var(--space-3)`.
  * `.btn-md` (Padrão): Altura `42px`, font-size `var(--font-size-sm)`, padding `0 var(--space-5)`.
  * `.btn-lg`: Altura `50px`, font-size `var(--font-size-md)`, padding `0 var(--space-6)`.
* **Acessibilidade:** `:focus-visible` aplica `box-shadow: var(--focus-ring); outline: none`.

---

### 5.2 Campo de Entrada (`.input-field`) & Select (`.select-custom`)
* **Estrutura:** Fundo `var(--color-surface-elevated)`, borda `1px solid var(--color-border-medium)`, raio `var(--radius-md)`.
* **Rótulo (Label):** Font-size `var(--font-size-sm)`, peso 500, cor `var(--color-text-secondary)`, com `margin-bottom: var(--space-2)`.
* **Estado de Foco:** Borda altera para `var(--color-border-focus)` com anel `box-shadow: var(--focus-ring)`.
* **Mensagem de Erro:** Exibida em `var(--font-size-xs)`, cor `var(--color-status-error)` logo abaixo do campo.

---

### 5.3 Card de Vinho (`.wine-card`)
* **Container:** Fundo `var(--color-surface-card)`, borda `1px solid var(--color-border-subtle)`, raio `var(--radius-lg)`, transição `var(--transition-normal)`.
* **Hover State:** `transform: translateY(-4px)`, borda passa para `var(--color-border-accent)`, sombra `var(--shadow-card-hover)`.
* **Área da Imagem:** Proporção `4:3` (portrait), `object-fit: cover`, fundo degradê escuro. Zoom suave da imagem `scale(1.04)` no hover.
* **Badge Flutuante de Tipo:** Posição superior esquerda (`top: var(--space-3)`, `left: var(--space-3)`), com fundo glassmorphic `var(--color-surface-glass)` e borda translúcida.
* **Hierarquia Tipográfica do Card:**
  * *País/Safra:* `var(--font-size-xs)`, cor `var(--color-text-secondary)`.
  * *Nome do Vinho:* Fonte Serif (`var(--font-family-serif)`), `var(--font-size-md)`, peso 600.
  * *Preço:* `var(--font-size-lg)`, peso 700, cor `var(--color-text-gold)`.
* **Ação:** Botão de largura total `.btn-primary` ou `.btn-accent` com feedback tátil de clique.

---

### 5.4 Header / Navbar (`.navbar`)
* **Estilo Visual:** Posição fixa no topo (`sticky`), fundo em *Glassmorphism* (`var(--color-surface-glass)`), `backdrop-filter: blur(16px)`, borda inferior `1px solid var(--color-border-subtle)`.
* **Logo da Adega:** Tipografia Serif `var(--font-family-serif)`, font-size `var(--font-size-xl)`, peso 700 com cor em ouro champanhe.
* **Navegação em Pills:** Links com padding `var(--space-2) var(--space-4)`, raio `var(--radius-full)`. Aba ativa recebe fundo `rgba(212, 175, 55, 0.12)` e texto `var(--color-text-gold)`.
* **Badge Dinâmico do Carrinho:** Indicador numérico circular em fundo `var(--color-interactive-primary)` com animação de pulso suave (`scale-bounce 300ms`) ao alterar quantidade.

---

### 5.5 Hero Section (Home / Catálogo)
* **Desktop (>1024px):** Layout Split em 2 colunas.
  * *Coluna Esquerda (Copy Editorial):* Tag superior em caixa alta `[ ADEGA PREMIUM ]` em ouro champanhe, Título H1 Serif em `var(--font-size-hero)`, texto descritivo e grupo de botões CTA.
  * *Coluna Direita (Imagem de Destaque):* Fotografia editorial portrait de garrafa/adega envolta em borda glassmorphic.
* **Mobile (<640px) — Adaptação Compacta:**
  * A imagem lateral pesada é **ocultada** (`display: none`).
  * O título H1 é reduzido para `var(--font-size-2xl)` e o padding vertical é condensado para **64px**, permitindo que os filtros e o catálogo fiquem visíveis imediatamente na primeira dobra.

---

### 5.6 [NOVO] Seletor de Quantidade (`.quantity-stepper`)
* **Estrutura:** Grupo compacto composto por botão decrementar `-`, contador numérico e botão incrementar `+`.
* **Visual:** Fundo `var(--color-surface-elevated)`, borda `1px solid var(--color-border-medium)`, raio `var(--radius-md)`.
* **Comportamento:** Validação automática impedindo quantidade inferior a 1, com desativação visual do botão `-` (`opacity: 0.4`).

---

### 5.7 [NOVO] Modal / Drawer (`.modal-container`)
* **Overlay:** Fundo `var(--color-surface-base)` com transparência `85%` e `backdrop-filter: blur(8px)`.
* **Janela Modal:** Fundo `var(--color-surface-elevated)`, borda `1px solid var(--color-border-accent)`, raio `var(--radius-xl)`, sombra `var(--shadow-dropdown)`.
* **Cabeçalho & Ações:** Título em fonte Serif, botão de fechar `×` no topo direito, área de conteúdo scrollável e rodapé de ações com botões `.btn-outline` (Cancelar) e `.btn-primary` (Confirmar).

---

### 5.8 [NOVO] Sistema de Notificação Toast (`.toast-notification`)
* **Posicionamento:** Flutuante no canto superior direito (`top: 24px`, `right: 24px`), z-index `9999`.
* **Visual:** Card compacto glassmorphic com borda fina indicativa do status (`var(--color-status-success)` para confirmações de carrinho, `var(--color-status-error)` para falhas).
* **Animação:** Entrada via `slide-in-right 200ms var(--ease-smooth)` e saída com fade em 3 segundos.

---

### 5.9 [NOVO] Tabela de Gestão Admin (`.admin-table`)
* **Visual:** Tabela limpa para controle do catálogo pelo usuário `Admin`.
* **Cabeçalho (`<th>`):** Font-size `var(--font-size-xs)`, caixa alta, cor `var(--color-text-secondary)`, borda inferior `1px solid var(--color-border-medium)`.
* **Linhas (`<tr>`):** Fundo intercalado suave no hover (`rgba(255, 255, 255, 0.02)`), ações alinhadas à direita (Editar, Excluir Logicamente).

---

### 5.10 [NOVO] Carregadores Esqueleto (`.skeleton-card`)
* **Efeito:** Placeholder animado com degradê em movimento (*shimmer animation*).
* **Uso:** Exibido durante o carregamento inicial do catálogo e requisições assíncronas para evitar saltos de layout (*Cumulative Layout Shift - CLS*).

---

### 5.11 [NOVO] Barra de Filtros & Chips Ativos (`.filter-bar`)
* **Estrutura:** Linha superior do catálogo contendo dropdowns de Tipo, Uva e País, acompanhada por **Chips Ativos** com opção de remoção individual `×` e botão de limpar todos os filtros.

---

## 6. Diretrizes de Imagens por IA

Para garantir o padrão de alta gastronomia e sofisticação das imagens geradas via IA (`generate_image`):
* **Iluminação:** Iluminação dramática de estúdio, sombras suaves, destaques em luz quente sobre o vidro e o líquido.
* **Cores da Fotografia:** Predominância de carvão escuro, madeira de carvalho e destaques bordô/dourado.
* **Prompt Padrão Otimizado:** `Luxury wine bottle, dark moody cellar background, crystal glass, cinematic lighting, 8k resolution, elegant label, professional studio photography, high end commercial style`.

---

## 7. Plano de Implementação Incremental (16 Etapas)

Após a aprovação desta especificação pelo usuário, a refatoração visual será executada na seguinte sequência:

1. **Configurar Tokens em 3 Camadas:** Atualizar [index.css](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/src/web/index.css) com os Tiers 1, 2 e 3.
2. **Importar Tipografia Editorial:** Integrar fontes *Playfair Display* e *Inter*.
3. **Padronizar Layout & Container Grid:** Aplicar grid de 12 colunas e margens responsivas.
4. **Implementar Utilitários de Elevação & Sombra:** Configurar sombras e glassmorphism.
5. **Refatorar Componente Button:** Aplicar variantes (`primary`, `accent`, `outline`) e acessibilidade.
6. **Refatorar Inputs & Selects:** Estilizar campos de busca e formulários com anel de foco.
7. **Especificar & Implementar Componente QuantityStepper:** Criar contador de quantidade para o carrinho.
8. **Refatorar Card de Vinho:** Redesenhar vitrine com imagens portrait, badges e hover 3D.
9. **Refatorar Navbar / Header:** Implementar header fixo glassmorphic com navegação em pills.
10. **Implementar Seção Hero na Home:** Criar banner editorial split (Desktop) e compacto (Mobile).
11. **Implementar Barra de Filtros & Chips:** Organizar filtros de Tipo, Uva e País.
12. **Implementar Componentes Modal & Toast:** Estilizar telas de Age Gate (+18), formulários Admin e toasts.
13. **Implementar Tabela de Gestão Admin:** Estilizar listagem de vinhos para perfil administrador.
14. **Implementar Skeleton Loaders:** Adicionar placeholders animados para carregamento assíncrono.
15. **Adicionar Microinterações & Transições:** Aplicar feedback de clique e animações de página.
16. **Homologação de Acessibilidade & Responsividade:** Validar contraste WCAG AA, foco por teclado e viewports (360px a 2560px).

---

## 8. Critérios de Aceite & Qualidade Final

* [ ] 100% dos estilos consumindo a arquitetura de Design Tokens de 3 Camadas.
* [ ] Zero utilização de valores brutos em pixels ou cores hardcoded em CSS local.
* [ ] Nenhuma regra de negócio, backend ou API foi modificada.
* [ ] Todos os 6 novos componentes (`Modal`, `Toast`, `QuantityStepper`, `AdminTable`, `Skeleton`, `FilterBar`) documentados e estilizados.
* [ ] Hero Section responsiva com versão compacta funcional para smartphones.
* [ ] Aplicação testada com contraste aprovado no padrão WCAG 2.1 AA.