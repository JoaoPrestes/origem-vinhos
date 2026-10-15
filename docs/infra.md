# Descritivo Base — E-commerce (Infraestrutura & Arquitetura)

## 1. Propósito deste documento

Fixar a **fundação técnica e arquitetural** de um e-commerce, de modo que um gerador de PRD parta daqui sem precisar decidir stack, princípios ou organização de código. Define o *como* estrutural; deixa o *o quê* funcional (features, regras de negócio, fluxos de usuário) para o PRD.

## 2. Stack tecnológica

- **Runtime / toolchain:** Bun (runtime, package manager, bundler e test runner unificados — reduz dependências de build).
- **Linguagem:** TypeScript em modo `strict`, end-to-end (back e front compartilham tipos).
- **Frontend:** React (componentes funcionais + hooks), tipagem compartilhada com o backend via pacote de tipos comum.
- **Backend:** API HTTP em TypeScript rodando sob Bun (servidor HTTP nativo do Bun ou framework leve compatível).
- **Banco de dados:** PostgreSQL como fonte de verdade transacional.
- **ORM:** Drizzle ORM — schema declarado em TypeScript, migrations versionadas, queries type-safe. (Alternativa equivalente: Prisma; Drizzle preferido por leveza e legibilidade SQL.)

## 3. Princípios de engenharia

- **SOLID:** cada módulo com responsabilidade única; dependências apontam para abstrações (interfaces/ports), não para implementações concretas (DB, gateway de pagamento, e-mail).
- **TDD:** todo comportamento de domínio nasce de um teste que falha primeiro (RED → GREEN → REFACTOR). Cobertura mínima alvo: 80%.
- **YAGNI:** só se implementa o que o requisito atual exige. Sem generalização especulativa.
- **KISS:** solução mais simples que resolve; sem camadas de abstração sem uso real.
- **DRY:** conhecimento de domínio em um único lugar (tipos, validações e regras não duplicados entre back e front).
- **Imutabilidade:** estado tratado por cópia/transformação, nunca mutação in-place.

## 4. Estilo arquitetural

**Vertical slices por domínio** (feature-based), com separação interna em camadas finas:

- **Domínio:** entidades, regras de negócio puras, sem dependência de framework ou DB.
- **Aplicação (casos de uso):** orquestra o domínio; recebe entrada validada, devolve resultado.
- **Infraestrutura (adapters):** implementações concretas — repositórios Drizzle, gateways externos, fila, e-mail.
- **Interface:** handlers HTTP (backend) e componentes/páginas (frontend).

Regra de dependência: **camadas externas dependem das internas, nunca o contrário** (ports & adapters enxuto). Domínio não conhece Postgres nem React.

## 5. Expressividade para LLMs

Convenções que tornam o código navegável e extensível por um LLM:

- **Nomenclatura intencional e explícita:** arquivos, funções e tipos descrevem o quê e o porquê (`createOrderFromCart`, não `handle`).
- **Co-localização por feature:** tudo de um domínio (tipos, casos de uso, testes, schema, UI) vive na mesma pasta — contexto local completo.
- **Contratos explícitos:** entradas/saídas tipadas e validadas por schema (ex.: Zod) nas bordas; nada de `any`.
- **Arquivos pequenos e focados:** 200–400 linhas típico, 500 máx.; um conceito por arquivo.
- **Fronteiras óbvias:** ports declarados como interfaces nomeadas, fáceis de localizar e mockar.
- **Testes como documentação viva:** cada caso de uso tem teste legível que descreve o comportamento esperado.

## 6. Domínios centrais (escopo de infraestrutura, não de feature)

Apenas os bounded contexts esperados — o PRD detalha regras:

- **Catálogo** (produtos, variações, preço, estoque)
- **Carrinho**
- **Pedidos / Checkout**
- **Pagamento** (atrás de um port; provedor concreto é adapter)
- **Identidade & Usuários** (auth, perfil)

Cada um é um slice independente, comunicando-se por contratos explícitos.

## 7. Estrutura de pastas (esqueleto)

```
/src
  /domains
    /catalog        (domínio, casos de uso, repo, schema, testes, ui)
    /cart
    /orders
    /payment
    /identity
  /shared           (tipos comuns, validação, utilitários puros)
  /infra            (conexão Postgres, config Drizzle, migrations)
  /web              (app React, roteamento, componentes globais)
/tests              (integração e e2e dos fluxos críticos)
```

## 8. Estratégia de testes

- **Unitários:** domínio e casos de uso (puros, rápidos, sem DB).
- **Integração:** repositórios Drizzle contra Postgres real (de teste); endpoints da API.
- **E2E:** fluxos críticos (buscar produto → carrinho → checkout → pedido).
- Runner: Bun test. Pirâmide de testes: base larga de unitários.

## 9. Fora de escopo nesta fundação (YAGNI)

Não decidido aqui — fica a critério do PRD ou de fases futuras: microserviços, multi-tenant, i18n, recomendação, busca avançada, mensageria distribuída, cache distribuído. A base é **monólito modular** até que um requisito real justifique dividir.



## 10. APP - Será um ecommerce de venda de vinhos online

Será um ecommerce de venda de vinhos online. Com possibilidade de enviar para todo o Brazil.
