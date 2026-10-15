# Plano Oficial de Execução do Redesign — Origem Vinhos (V2 - Otimizado & Seguro)

---

## 1. Visão Geral e Estratégia de Execução

Este documento especifica o **plano oficial de execução incremental** para a refatoração visual do e-commerce **Origem Vinhos**, transformando as diretrizes da [spec04-Design-System.md](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/docs/specs/spec04-Design-System.md) em um roadmap técnico seguro, previsível e isolado por fases de baixo risco.

### Princípios de Execução
* **Construção Bottom-Up:** A infraestrutura de tokens e componentes atômicos será construída antes de refatorar qualquer página existente.
* **Componentização React Antecipada:** Na Fase 4, componentes de UI reutilizáveis (`WineCard`, `Modal`, `Toast`, `QuantityStepper`, `Skeleton`, `AdminTable`, `AgeGate`) serão criados como arquivos modulares em `src/web/components/`, evitando qualquer duplicação de JSX nas fases de páginas.
* **Isolamento de Regras de Negócio:** Nenhuma lógica de estado React, hook, handler de API ou rota do servidor Bun/PostgreSQL será alterada. A refatoração é restrita à camada de apresentação (UI/CSS/JSX).
* **Verificação a Cada Fase:** Cada fase conclui com critérios de aceite testáveis e sem regressões visuais ou de acoplamento.

---

## 2. Roadmap Incremental de Implementação

```
┌─────────────────────────────────────────────────────────┐
│ Fase 1: Arquitetura de Tokens em 3 Camadas & CSS Base   │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ Fase 2: Tipografia, Espaçamento, Containers & Grid      │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ Fase 3: Componentes Atômicos Base (Button, Input...)    │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ Fase 4: Componentes React Modulares & Age Gate (+18)    │
│ (WineCard, Modal, Toast, QuantityStepper, Skeleton...)  │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ Fase 5: Header (Navbar), Footer & Navegação Global      │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ Fase 6: Seção Hero Editorial na Home                    │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ Fase 7: Autenticação (Login & Cadastro)                 │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ Fase 8A: Vitrine do Catálogo Público & Barra de Filtros │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ Fase 8B: Gestão de Estoque do Administrador (Admin CRUD)│
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ Fase 9: Carrinho de Compras & Dashboard de Perfil       │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ Fase 10: Responsividade, Microinterações & WCAG AA     │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ Fase 11: Auditoria Final & Homologação contra a Spec     │
└────────────────────────────┴────────────────────────────┘
```

---

### Fase 1: Arquitetura dos Design Tokens & Estrutura CSS Base
* **Objetivo da Fase:** Estruturar o arquivo [index.css](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/src/web/index.css) com a arquitetura de tokens em 3 Camadas (Tier 1 Primitives, Tier 2 Semantics, Tier 3 Component Scope), eliminando variáveis soltas e estabelecendo o reset CSS limpo.
* **Componentes Afetados:** Variáveis globais do `:root`, reset CSS, utilitários de tema.
* **Arquivos Modificados:**
  * [index.css](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/src/web/index.css)
* **Dependências:** Nenhuma (Fase base inicial).
* **Critérios de Aceite:**
  * Todas as variáveis do Tier 1, Tier 2 e Tier 3 declaradas no `:root` de `index.css`.
  * Presença do anel de foco `--focus-ring` e transição global `--ease-smooth`.
  * Zero quebra de layout no estado atual do app.
* **Possíveis Riscos de Regressão:** Alteração acidental do fundo do body ou cor de fonte global quebrar visibilidade legível.
* **Estratégia de Mitigação:** Manter fallbacks CSS temporários para classes legadas até que as fases subsequentes as substituam gradualmente.

---

### Fase 2: Tipografia, Espaçamentos, Layout Base & Grid
* **Objetivo da Fase:** Importar as fontes *Playfair Display* e *Inter* via Google Fonts no [index.html](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/src/web/index.html) e configurar as classes de container (`.app-shell`, `.page-content`), escala de headings e grid de 12 colunas no CSS.
* **Componentes Afetados:** Layout wrapper global, hierarquia de títulos H1-H4, parágrafos e utilitários de grid.
* **Arquivos Modificados:**
  * [index.html](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/src/web/index.html)
  * [index.css](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/src/web/index.css)
* **Dependências:** Fase 1 concluída.
* **Critérios de Aceite:**
  * Fontes *Playfair Display* e *Inter* carregando via CDN sem flashes de texto não estilizado.
  * Container máximo de `1280px` aplicado centralizado no app.
  * Grid de 4 colunas desktop / 2 tablet / 1 mobile pronto para uso.
* **Possíveis Riscos de Regressão:** Atraso no carregamento de fontes da web (FOUT/FOIT).
* **Estratégia de Mitigação:** Declarar `font-display: swap` nas conexões de fontes e definir fallbacks nativos (`serif` e `sans-serif`).

---

### Fase 3: Componentes Atômicos Base (Button, Input, Select, Badge, Chips)
* **Objetivo da Fase:** Implementar e padronizar o CSS dos componentes primários de formulário e controle (`.btn`, `.input-field`, `.select-custom`, `.badge`, `.filter-chip`).
* **Componentes Afetados:** Botões de ação, inputs de login/cadastro, dropdowns de filtro e tags de status.
* **Arquivos Modificados:**
  * [index.css](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/src/web/index.css)
* **Dependências:** Fase 1 e Fase 2 concluídas.
* **Critérios de Aceite:**
  * Botões nas variantes `.btn-primary`, `.btn-accent` e `.btn-outline` com estados hover, active, focus-visible e disabled estilizados.
  * Inputs com anel de foco em ouro champanhe (`--focus-ring`) e suporte a mensagem de erro.
  * Select customizado com ícone SVG integrado à direita.
* **Possíveis Riscos de Regressão:** Estilos de botões nativos do navegador sobrescreverem os componentes customizados.
* **Estratégia de Mitigação:** Aplicar reset explícito `appearance: none; border: none; outline: none;` nos seletores.

---

### Fase 4: Componentes React Modulares & Age Gate (+18)
* **Objetivo da Fase:** Criar os componentes React reutilizáveis em `src/web/components/` e refatorar o modal de maioridade [AgeGate.tsx](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/src/web/components/AgeGate.tsx) com o novo padrão glassmorphic desde o primeiro acesso.
* **Componentes Criados/Refatorados:**
  * `src/web/components/WineCard.tsx`
  * `src/web/components/Modal.tsx`
  * `src/web/components/Toast.tsx`
  * `src/web/components/QuantityStepper.tsx`
  * `src/web/components/Skeleton.tsx`
  * `src/web/components/AdminTable.tsx`
  * `src/web/components/AgeGate.tsx`
* **Arquivos Modificados:**
  * Componentes em `src/web/components/`
  * [index.css](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/src/web/index.css)
* **Dependências:** Fases 1, 2 e 3 concluídas.
* **Critérios de Aceite:**
  * Todos os 7 componentes React criados, tipados e com CSS encapsulado por classes dos Design Tokens.
  * Age Gate (+18) 100% atualizado com visual glassmorphic funcional no primeiro acesso.
* **Possíveis Riscos de Regressão:** Prop-drilling ou desalinhamento de handlers nos novos componentes.
* **Estratégia de Mitigação:** Manter exatamente as mesmas interfaces de Props (`onConfirm`, `onAddToCart`, etc.) dos elementos originais.

---

### Fase 5: Header (Navbar), Footer & Navegação Global
* **Objetivo da Fase:** Refatorar o header da aplicação no [App.tsx](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/src/web/App.tsx), aplicando a barra de navegação em glassmorphism fixo no topo, logo em tipografia Serif e navegação em pills com badge animado do carrinho.
* **Componentes Afetados:** `.navbar`, `.navbar-inner`, `.navbar-logo`, `.navbar-links`, `.cart-badge`, `.footer`.
* **Arquivos Modificados:**
  * [App.tsx](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/src/web/App.tsx)
  * [index.css](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/src/web/index.css)
* **Dependências:** Fases 1 a 4 concluídas.
* **Critérios de Aceite:**
  * Navbar fixa no topo com efeito `backdrop-filter: blur(16px)` ao rolar a página.
  * Aba ativa com indicador visual em ouro champanhe.
  * Contador numérico do carrinho estilizado e animado ao receber novos itens.
* **Possíveis Riscos de Regressão:** O header fixo ocultar a parte superior do conteúdo das páginas.
* **Estratégia de Mitigação:** Adicionar `padding-top` proporcional à altura da navbar no container principal `.page-content`.

---

### Fase 6: Seção Hero Editorial na Home
* **Objetivo da Fase:** Criar o componente React `Hero.tsx` em `src/web/components/` e integrá-lo no topo da página do catálogo, adicionando copy editorial, selos de qualidade e destaque de imagem.
* **Componentes Afetados:** `Hero.tsx`, `.hero-section`, `.hero-content`, `.hero-title`, `.hero-badges`, `.hero-image-wrapper`.
* **Arquivos Modificados:**
  * `src/web/components/Hero.tsx` [NEW]
  * [Catalog.tsx](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/src/web/pages/Catalog.tsx)
  * [index.css](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/src/web/index.css)
* **Dependências:** Fases 1 a 5 concluídas.
* **Critérios de Aceite:**
  * Hero Section visível acima dos filtros no primeiro acesso à adega.
  * Layout split 2 colunas em desktop e versão compacta sem imagem em mobile (`<640px`).
* **Possíveis Riscos de Regressão:** Deslocamento excessivo do catálogo em telas pequenas.
* **Estratégia de Mitigação:** Aplicar a regra de exibição compacta para mobile já validada na especificação.

---

### Fase 7: Autenticação (Login & Cadastro)
* **Objetivo da Fase:** Refatorar a interface visual da tela de login/cadastro em [Auth.tsx](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/src/web/pages/Auth.tsx).
* **Componentes Afetados:** Cards de login, abas de alternância, botões de ação de auth.
* **Arquivos Modificados:**
  * [Auth.tsx](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/src/web/pages/Auth.tsx)
  * [index.css](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/src/web/index.css)
* **Dependências:** Fases 1 a 5 concluídas.
* **Critérios de Aceite:**
  * Card de autenticação centralizado em glassmorphism refinado.
  * Validações de erro de login/cadastro destacadas em tom `var(--color-status-error)`.
* **Possíveis Riscos de Regressão:** Falha no envio dos formulários por alteração acidental de handlers `onSubmit`.
* **Estratégia de Mitigação:** Manter intactas todas as props e chamadas `fetch` existentes, alterando estritamente `className` e markup visual.

---

### Fase 8A: Vitrine do Catálogo Público & Barra de Filtros
* **Objetivo da Fase:** Refatorar a exibição da vitrine pública de produtos e a barra de filtros por Tipo, Uva e País em [Catalog.tsx](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/src/web/pages/Catalog.tsx), consumindo os componentes `WineCard` e `FilterBar`.
* **Componentes Afetados:** Grid público de vinhos, barra de seletores, chips ativos de busca e mensagens de lista vazia.
* **Arquivos Modificados:**
  * [Catalog.tsx](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/src/web/pages/Catalog.tsx)
* **Dependências:** Fases 1 a 7 concluídas.
* **Critérios de Aceite:**
  * Grid de 4 colunas perfeitamente alinhado exibindo os novos cards `WineCard`.
  * Barra de filtros funcional com suporte a chips ativos e opção de limpar filtros.
* **Possíveis Riscos de Regressão:** Quebrar a filtragem dinâmica por query params.
* **Estratégia de Mitigação:** Validar a requisição de busca via API antes e depois de substituir o JSX do grid.

---

### Fase 8B: Gestão de Estoque do Administrador (Admin CRUD)
* **Objetivo da Fase:** Refatorar os controles de criação, edição e exclusão lógica para usuários com perfil `Admin` em [Catalog.tsx](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/src/web/pages/Catalog.tsx), consumindo os componentes `Modal` e `AdminTable`.
* **Componentes Afetados:** Formulários modais de cadastro/edição de vinho e tabela de gestão administrativa.
* **Arquivos Modificados:**
  * [Catalog.tsx](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/src/web/pages/Catalog.tsx)
* **Dependências:** Fase 8A concluída.
* **Critérios de Aceite:**
  * Ações de Admin (Criar, Editar, Deletar) isoladas em modais glassmorphic refinados.
  * Tabela de controle de vinhos legível e funcional para o administrador.
* **Possíveis Riscos de Regressão:** Perda de permissão de admin ou erro no envio dos dados do formulário de produto.
* **Estratégia de Mitigação:** Testar ações com usuário comum (bloqueado) e usuário Admin (liberado).

---

### Fase 9: Carrinho de Compras, Dashboard de Perfil & QuantityStepper
* **Objetivo da Fase:** Refatorar a página do carrinho [Cart.tsx](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/src/web/pages/Cart.tsx) e a tela de perfil [Profile.tsx](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/src/web/pages/Profile.tsx), integrando o novo `QuantityStepper` para alteração de unidades.
* **Componentes Afetados:** Tabela de itens do carrinho, resumo de preço total, controle de quantidade `+`/`-`, formulário de edição de perfil.
* **Arquivos Modificados:**
  * [Cart.tsx](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/src/web/pages/Cart.tsx)
  * [Profile.tsx](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/src/web/pages/Profile.tsx)
* **Dependências:** Fases 1 a 8B concluídas.
* **Critérios de Aceite:**
  * Carrinho com visualização clara de garrafas, preços unitários, total acumulado em ouro champanhe e alteração fluida de quantidade.
  * Tela de perfil organizada com dados da conta e opções de edição/logout.
* **Possíveis Riscos de Regressão:** Erro de cálculo do valor total do carrinho.
* **Estratégia de Mitigação:** Preservar a chamada de sincronização e cálculo existente no handler do `CartService`.

---

### Fase 10: Responsividade, Microinterações, Estados Vazios & Acessibilidade (WCAG AA)
* **Objetivo da Fase:** Aplicar os ajustes finais de responsividade mobile (360px a 2560px), microinterações de hover/active, animações de carregamento (`Skeleton`), estados vazios e auditoria de contraste de cores.
* **Componentes Afetados:** Todos os componentes do projeto.
* **Arquivos Modificados:**
  * Arquivos da pasta `src/web/`
* **Dependências:** Fases 1 a 9 concluídas.
* **Critérios de Aceite:**
  * Aplicação sem quebras horizontais em smartphones de 360px.
  * Navegação por teclado funcionando com destaque visual em todos os botões e inputs (`--focus-ring`).
  * Estados vazios refinados exibindo mensagens elegantes e botão para retornar à adega.
* **Possíveis Riscos de Regressão:** Animações causarem lentidão em dispositivos móveis.
* **Estratégia de Mitigação:** Utilizar apenas propriedades otimizadas para aceleração de hardware GPU (`transform` e `opacity`).

---

### Fase 11: Auditoria Final & Homologação contra a Spec
* **Objetivo da Fase:** Realizar uma revisão minuciosa comparando a aplicação em execução contra todos os requisitos da [spec04-Design-System.md](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/docs/specs/spec04-Design-System.md) e registrar a conclusão no walkthrough.
* **Componentes Afetados:** Aplicação completa.
* **Arquivos Modificados:**
  * [docs/walkthrough.md](file:///c:/Users/Jo%C3%A3o%20Otavio%20Gamer/Desktop/Projetos%20Antigravity/Origem%20Vinhos/docs/walkthrough.md)
* **Dependências:** Fases 1 a 10 concluídas.
* **Critérios de Aceite:**
  * 100% dos requisitos e critérios de aceite homologados.
  * Testes manuais e gravação no navegador aprovando o fluxo completo de compra e visualização.
  * Aplicação pronta para uso comercial.

---

## 3. Matriz de Dependências e Trava de Retrabalho

| Fase a Iniciar | Pré-requisito Obrigatório | Motivo Técnico / Prevenção de Retrabalho |
| :--- | :--- | :--- |
| **Fase 2 (Layout Base)** | Fase 1 | Impede o uso de unidades de medida não mapeadas nos tokens. |
| **Fase 3 (Componentes Base)** | Fases 1 e 2 | Garante que botões e inputs utilizem a tipografia e espaçamentos padronizados. |
| **Fase 4 (Componentes React & AgeGate)** | Fases 1, 2 e 3 | Cria os blocos reutilizáveis (`WineCard`, `Modal`, etc.) que serão consumidos pelas páginas. |
| **Fase 5 (Navbar & Header)** | Fases 1 a 4 | O header consome a badge do carrinho e o design de botões/pills. |
| **Fase 6 (Hero Section)** | Fases 1 a 5 | A Hero depende da navbar e dos botões primários/secundários. |
| **Fase 7 (Autenticação)** | Fases 1 a 5 | A tela de login consome os inputs, botões e modais padronizados. |
| **Fase 8A (Catálogo Público)** | Fases 1 a 7 | O catálogo consome `WineCard`, `FilterBar` e a Hero Section. |
| **Fase 8B (Admin CRUD)** | Fase 8A | Isolamento da gestão admin após validar a vitrine pública de vinhos. |
| **Fase 9 (Carrinho & Perfil)** | Fases 1 a 8B | O carrinho consome o `QuantityStepper` e os cards de produtos. |
| **Fase 10 e 11 (Polimento/Auditoria)** | Fases 1 a 9 | Polimento final só deve ser feito com a estrutura completa e funcional. |
