# 🍷 Origem Vinhos — Adega Virtual Premium

E-commerce de vinhos finos e adega virtual premium desenvolvido com foco em alta performance, arquitetura hexagonal, integridade financeira transacional e design sofisticado.

---

## 🛠️ Stack Tecnológica

- **Runtime & Gerenciador:** [Bun](https://bun.com)
- **Linguagem:** TypeScript
- **Frontend:** React + CSS Vanilla com tokens de design e estética Dark Mode Premium
- **Backend / API:** Bun HTTP Server nativo + Handlers de Domínio Hexagonais
- **Banco de Dados & ORM:** PostgreSQL + [Drizzle ORM](https://orm.drizzle.team)
- **Qualidade & Testes:** Suíte E2E e unitária com `bun test` (100% de cobertura nos fluxos críticos)

---

## 🚀 Como Executar Localmente

### 1. Pré-requisitos
- [Bun](https://bun.sh/) (v1.1+)
- [Docker](https://www.docker.com/) e Docker Compose (para o PostgreSQL)

### 2. Configurar Variáveis de Ambiente
Copie o arquivo de exemplo para `.env`:
```bash
cp .env.example .env
```

### 3. Iniciar o Banco de Dados PostgreSQL
Suba a instância do banco via Docker:
```bash
docker compose up -d
```

### 4. Instalar Dependências
```bash
bun install
```

### 5. Sincronizar o Schema do Banco
```bash
bun run db:push
```

### 6. Iniciar o Servidor de Desenvolvimento
```bash
bun run dev
```
Acesse a aplicação no seu navegador em `http://localhost:3000`.

---

## 🧪 Executando os Testes Automatizados

O projeto conta com mais de 70 testes automatizados cobrindo Catálogo, Identidade, Favoritos, Endereços, Pedidos (com Outbox Pattern e Inbox Pattern anti-duplicação) e Pagamentos:

```bash
bun test
```

---

## 📦 Compilação para Produção

Para gerar o bundle estático do frontend:
```bash
bun run build
```
