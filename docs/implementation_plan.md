# Plano de Implementação Refinado & Auditado — Domínio de Endereço & Validação de Checkout

Este plano técnico estabelece a estratégia de desenvolvimento incremental para o domínio de Gerenciamento de Endereços (`Address`), consulta por CEP (POC ViaCEP) e esteira preliminar de Checkout no **Origem Vinhos**.

---

## User Review Required

> [!IMPORTANT]
> **Protocolo Obrigatório de Aprovação Antes de Cada Fase:**
> Antes de iniciar a execução de qualquer fase, a IA deverá apresentar ao usuário:
> 1. Análise do impacto da alteração;
> 2. Lista completa dos arquivos que serão criados;
> 3. Lista completa dos arquivos que serão modificados;
> 4. Justificativa detalhada para cada alteração;
> 5. Mapeamento de riscos específicos daquela etapa;
> 6. **Interrupção e aguardo de aprovação explícita do usuário antes de criar ou modificar qualquer arquivo.**

> [!WARNING]
> **Política e Estratégia de Rollback:**
> Caso ocorra qualquer falha irrecuperável ou erro de compilação durante a implementação de uma fase:
> 1. A execução será imediatamente interrompida;
> 2. Nenhuma alteração será propagada para as fases subsequentes;
> 3. As alterações da fase com falha serão revertidas para restaurar o projeto a um estado verde/compilável;
> 4. Um relatório de diagnóstico detalhará a causa raiz e os arquivos afetados;
> 5. A IA aguardará novas instruções do usuário antes de realizar qualquer tentativa.

---

## Refinamento Arquitetural & Alinhamento SOLID / Clean Architecture

1. **Separação Estrita de Domínio e Infraestrutura (Ports & Adapters):**
   * O **Domínio** ([src/domains/address/address.service.ts](../src/domains/address/address.service.ts)) define estritamente o contrato/interface do *Port* (`CepLookupService`).
   * A **Infraestrutura** ([src/infra/cep/viacep.adapter.ts](../src/infra/cep/viacep.adapter.ts)) implementa o *Adapter* concreto (`ViaCepAdapter`). O domínio **não possui nenhuma referência ao ViaCEP**. A substituição futura pelos Correios ocorrerá exclusivamente na camada de infraestrutura.
2. **Desacoplamento de Responsabilidades do Repositório (SRP):**
   * O **Repository** ([src/domains/address/address.repository.ts](../src/domains/address/address.repository.ts)) atua exclusivamente na persistência pura de dados (operações de `insert`, `select`, `update`, `delete`).
   * O **Domain Service** ([src/domains/address/address.service.ts](../src/domains/address/address.service.ts)) orquestra as regras de negócio: auto-atribuição de padrão no 1º cadastro, elevação automática do endereço mais recente na exclusão do padrão, e alternância atômica do indicador `isDefault`.
3. **Gerenciamento de Configurações Externas (Sem Valores Hardcoded):**
   * `VIA_CEP_URL`: lido via `process.env.VIA_CEP_URL` (padrão: `https://viacep.com.br/ws`).
   * `CEP_TIMEOUT_MS`: lido via `Number(process.env.CEP_TIMEOUT_MS)` (padrão: `5000`).

---

## Proposed Changes

---

### Fase 1: Schema de Banco de Dados Centralizado (Drizzle ORM)

#### Objetivo
Adicionar a tabela `addresses` e os relacionamentos 1:N com `users` diretamente no schema centralizado do Drizzle em `src/infra/schema.ts`.

#### [MODIFY] [schema.ts](../src/infra/schema.ts)
- Definir a tabela `addresses` (`id`, `userId`, `zipCode`, `street`, `number`, `complement`, `neighborhood`, `city`, `state`, `label`, `isDefault`, `createdAt`, `updatedAt`).
- Definir `addressesRelations` e atualizar `usersRelations`.

#### Testes Necessários
- **Integração:** Validação da conexão e integridade de chaves estrangeiras (`bun run check-db.ts`).

#### Critérios de Conclusão
- Aplicação compilando; tabela `addresses` acessível via PostgreSQL.

---

### Fase 2: Domínio, Repositório Puro e Adapter ViaCEP na Infraestrutura

#### Objetivo
Implementar os schemas Zod de validação, a persistência pura em `AddressRepository`, os casos de uso no `AddressService` (Port `CepLookupService`) e o adapter concreto `ViaCepAdapter` na camada `src/infra/cep/`.

#### [NEW] [schema.ts](../src/domains/address/schema.ts)
- Schemas Zod de entrada/saída (`createAddressSchema`, `updateAddressSchema`, `cepQuerySchema`).

#### [NEW] [address.repository.ts](../src/domains/address/address.repository.ts)
- Persistência pura sem regras de negócio: `insert`, `findById`, `findByUserId`, `update`, `delete`, `clearDefaultFlags`.

#### [NEW] [address.service.ts](../src/domains/address/address.service.ts)
- Contrato da interface `CepLookupService` (Port).
- Lógica das regras de domínio: atribuição inicial do 1º endereço como padrão, elevação automática do endereço mais recente ao deletar o padrão, alternância de padrão.

#### [NEW] [viacep.adapter.ts](../src/infra/cep/viacep.adapter.ts)
- Implementação isolada de `CepLookupService` consumindo `process.env.VIA_CEP_URL` e `process.env.CEP_TIMEOUT_MS`.

#### [NEW] [address.test.ts](../tests/address.test.ts)
- Testes unitários para regras de serviço e sanitização.
- Testes de integração para repositório e adapter HTTP.

#### Testes Necessários
- `bun test tests/address.test.ts`

#### Critérios de Conclusão
- Todos os testes de regras de serviço e infraestrutura passando.

---

### Fase 3: Handlers HTTP & Registro de Rotas na API Bun

#### Objetivo
Implementar os handlers de requisição HTTP (`address.handlers.ts`) e conectar as rotas REST ao servidor HTTP do Bun (`src/index.ts`).

#### [NEW] [address.handlers.ts](../src/domains/address/address.handlers.ts)
- Handlers: `list`, `create`, `update`, `delete`, `setDefault`, `lookupCep`.

#### [MODIFY] [index.ts](../src/index.ts)
- Registrar as rotas `/api/addresses` e `/api/addresses/lookup-cep/:cep`.

#### [MODIFY] [e2e.test.ts](../tests/e2e.test.ts)
- Adicionar cobertura HTTP para os novos endpoints de endereço.

#### Testes Necessários
- `bun test tests/e2e.test.ts`

#### Critérios de Conclusão
- Endpoints `/api/addresses` respondendo corretamente com status 200, 201, 400, 401, 404, 500.

---

### Fase 4: Componentes React de Gestão de Endereço no Perfil

#### Objetivo
Desenvolver os componentes `AddressFormModal` e `AddressList` integrados à página `Profile.tsx`.

#### [NEW] [AddressFormModal.tsx](../src/web/components/AddressFormModal.tsx)
- Modal com busca automática por CEP (8 dígitos), auto-preenchimento, preservação de campos manuais e aviso de fallback.

#### [NEW] [AddressList.tsx](../src/web/components/AddressList.tsx)
- Listagem dos cards com opção de editar, excluir e marcar como padrão.

#### [MODIFY] [Profile.tsx](../src/web/pages/Profile.tsx)
- Integrar a aba/seção "Meus Endereços".

#### [MODIFY] [index.css](../src/web/index.css)
- Estilos dos modais e cards conforme o Design System V2.

#### Testes Necessários
- Manual: Cadastro por CEP, fallback manual em CEP inexistente (`99999999`) e alternância visual de padrão.

#### Critérios de Conclusão
- Perfil permitindo CRUD de endereços via interface visual.

---

### Fase 5A: Botão "Finalizar Compra", Tela de Checkout & Exibição de Endereço

#### Objetivo
Adicionar o botão "Finalizar Compra" no Carrinho, criar a estrutura da página `Checkout.tsx` e exibir o Endereço Padrão selecionado.

#### [NEW] [Checkout.tsx](../src/web/pages/Checkout.tsx)
- Exibição inicial do Checkout com resumo de produtos e o Endereço Padrão do usuário.

#### [MODIFY] [Cart.tsx](../src/web/pages/Cart.tsx)
- Botão "Finalizar Compra" navegando para a rota de checkout.

#### [MODIFY] [App.tsx](../src/web/App.tsx)
- Registro da página `'checkout'`.

#### Testes Necessários
- Manual: Navegação Carrinho → Finalizar Compra → Checkout.

#### Critérios de Conclusão
- Transição de tela funcionando visualmente.

---

### Fase 5B: Intercepção de Usuário sem Endereço & Retorno Automático ao Checkout

#### Objetivo
Bloquear o avanço no Checkout para usuários com 0 endereços cadastrados, redirecionar para a tela de cadastro e retornar automaticamente ao Checkout após salvar o endereço.

#### [MODIFY] [Checkout.tsx](../src/web/pages/Checkout.tsx)
- Intercepção se `hasAddresses === false`, exibindo alerta e disparando o modal de cadastro de endereço com contexto de retorno.

#### Testes Necessários
- Manual & E2E: Testar usuário com 0 endereços tentando acessar o Checkout e seu retorno pós-cadastro.

#### Critérios de Conclusão
- Fluxo de bloqueio e retorno automático funcionando perfeitamente.

---

### Fase 6: Estabilização, Audit de Código & Validação Geral de Qualidade

#### Objetivo
Realizar a auditoria final da base de código desenvolvida para garantir qualidade, aderência ao SOLID, ausência de código morto e aprovação de todos os testes.

#### Ações
- Auditoria SOLID e Clean Architecture (Port/Adapter estrito).
- Limpeza de imports e comentários.
- Validação contra PRD, `infra.md` e Specs 01 a 05.
- Execução total dos testes (`bun test`).

#### Critérios de Conclusão
- 100% dos testes aprovados (`bun test`); zero regressões.

---

## Avaliação de Riscos Residuais

Não foram identificados riscos bloqueadores neste momento. Os riscos residuais (como ajuste de concorrência em transações de banco de dados e alinhamentos finos de layout responsivo) deverão ser reavaliados antes do início de cada fase de implementação durante o protocolo de aprovação.
