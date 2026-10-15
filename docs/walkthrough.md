# Walkthrough — Origem Vinhos (V1)

Concluímos a implementação da V1 do E-Commerce de Vinhos **Origem Vinhos** exatamente conforme a infraestrutura, o PRD purificado e as especificações estabelecidas. O projeto agora é uma aplicação monolítica robusta, modular e type-safe que roda em cima do Bun e do PostgreSQL via Drizzle ORM.

---

## O que foi construído

### 1. Infraestrutura & Banco de Dados (PostgreSQL + Drizzle ORM)
* **Tabelas do Banco:** Criamos as tabelas `users`, `products` e `cart_items` com validações, chaves estrangeiras e integridade referencial.
* **Soft Delete:** A tabela de produtos possui a coluna `deleted_at` para permitir a exclusão lógica por administradores.
* **Migrations:** Geramos as migrações iniciais e as aplicamos na instância do PostgreSQL (rodando sob um container Docker).

### 2. Domínio Identity (Usuários, Sessões & Segurança)
* **Cadastro +18:** Validação rigorosa de maioridade durante a criação de conta no Zod e banco de dados.
* **Autenticação:** Hashing de senha ultra-rápido usando `Bun.password` e sessões stateless assinadas trafegadas via cookies `HttpOnly` com duração de 7 dias.
* **CRUD de Usuário:** Endpoints para consultar perfil (`me`), atualizar dados e excluir a própria conta de forma segura.

### 3. Domínio Catalog (Vitrine de Vinhos)
* **Vitrine Dinâmica:** Listagem pública de vinhos contendo seus metadados de classificação (safra, uva, país, teor alcoólico).
* **Filtros de Busca:** Parâmetros de consulta para filtrar a adega virtual por tipo, uva e país de origem.
* **CRUD Inline para Admin:** Usuários autenticados sob o papel de `Admin` ganham controles visuais diretamente no catálogo para cadastrar, editar e desativar logicamente vinhos.

### 4. Domínio Cart (Carrinho de Compras & Integração)
* **Persistência no Banco:** Itens do carrinho são salvos no banco de dados vinculados à conta do usuário (acesso apenas a usuários logados).
* **Sincronização de Soft Delete:** Lógica integrada no `CartService` que detecta se algum vinho no carrinho do cliente foi deletado logicamente por um administrador no catálogo. Caso positivo, o sistema expurga esses itens inativos do banco de dados do carrinho de forma silenciosa e recalcula o valor total acumulado.

---

## Demonstração Visual (Testes E2E no Navegador)

Para comprovar a qualidade visual e de fluxos do projeto, realizamos um teste funcional simulado ponta a ponta no navegador, cobrindo:
1. Validação inicial do **Age Gate** (+18).
2. Carregamento do catálogo populado via script de seed.
3. Bloqueio e redirecionamento de usuário deslogado ao tentar colocar itens no carrinho.
4. Login automático usando credenciais de teste do cliente.
5. Adição de vinho ("Château Margaux 2015") com sucesso ao carrinho.
6. Alteração de quantidades (de 1 para 2 garrafas) no carrinho de compras e atualização imediata do valor total para **R$ 1.700,00**.

### Vídeo da Sessão de Navegação:
![Gravação da Sessão de Testes E2E](C:/Users/João%20Otavio%20Gamer/.gemini/antigravity-ide/brain/e5c14612-985a-42a7-bcb0-a07caa4d4443/testing_origem_vinhos_e2e_1783747114988.webp)

### Estado do Carrinho Recalculado (2 Garrafas):
![Estado Final do Carrinho no Teste](C:/Users/João%20Otavio%20Gamer/.gemini/antigravity-ide/brain/e5c14612-985a-42a7-bcb0-a07caa4d4443/final_cart_state_1783747277915.png)

---

## Estrutura de Arquivos Implementada

```
/src
  /domains
    /identity
      - schema.ts            (Validações Zod para Auth)
      - user.repository.ts   (Mutação e busca de usuários no Drizzle)
      - auth.service.ts      (Criptografia de senhas e cookie de sessão)
      - identity.handlers.ts (Endpoints HTTP de Identity)
    /catalog
      - schema.ts            (Validações Zod para vinhos)
      - catalog.repository.ts(CRUD de vinhos com suporte a soft delete)
      - catalog.handlers.ts  (Endpoints HTTP de exibição e CRUD Admin)
    /cart
      - schema.ts            (Validações Zod para carrinho)
      - cart.repository.ts   (Manipulação de itens de carrinho no banco)
      - cart.service.ts      (Sincronização de soft deletes e totais)
      - cart.handlers.ts     (Endpoints HTTP do carrinho de compras)
  /infra
    - db.ts                  (Conexão Drizzle + Postgres)
    - schema.ts              (Mapeamento de tabelas do Drizzle)
    /migrations              (Arquivos de migração gerados)
  /web
    /components
      - AgeGate.tsx          (Barreira de maioridade)
    /pages
      - Auth.tsx             (Formulários de Login e Cadastro)
      - Catalog.tsx          (Vitrine e formulários de CRUD Admin)
      - Cart.tsx             (Resumo do carrinho e controle de quantidades)
      - Profile.tsx          (Visualização e edição do usuário)
    - App.tsx                (Navbar, estado global e roteador SPA por abas)
    - index.css              (Estilização premium, bordô/dourado e glassmorphism)
    - index.html             (Template HTML básico)
    - index.tsx              (Entrypoint do cliente React)
  - index.ts                 (Entrypoint do servidor e bundler Bun)
/tests
  - e2e.test.ts              (15 testes de integração / E2E cobrindo todas as regras)
```

---

## Como Executar a Aplicação Localmente

Siga o passo a passo abaixo para rodar e testar visualmente a aplicação no seu navegador:

### 1. Certifique-se de que o Postgres está Ativo
Como o banco de dados está rodando no Docker, garanta que o container foi iniciado:
```bash
docker start origem-vinhos-postgres
```
*(Caso queira recriar o container do zero, use o comando: `docker run --name origem-vinhos-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=origemvinhos -p 5432:5432 -d postgres`)*.

### 2. Inicie o Servidor em Modo de Desenvolvimento
Execute o comando abaixo na raiz do repositório. O Bun compilará o frontend React e iniciará a API com hot reload ativo:
```bash
bun run dev
```

### 3. Acesse a Aplicação
Abra seu navegador e acesse:
**[http://localhost:3000](http://localhost:3000)**

### 4. Como testar o perfil Admin
1. Cadastre-se na aplicação pública (com data de nascimento maior de 18 anos).
2. Acesse seu cliente de banco de dados (ou terminal do docker) e execute o comando SQL abaixo para promover o seu usuário a Admin:
   ```sql
   UPDATE users SET profile = 'Admin' WHERE email = 'seu-email-cadastrado@exemplo.com';
   ```
3. Realize o login novamente (ou atualize a página) para ver os botões administrativos inline de Criação, Edição e Exclusão no catálogo de vinhos.
