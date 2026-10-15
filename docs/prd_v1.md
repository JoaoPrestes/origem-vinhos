# Documento de Requisitos de Produto (PRD) — E-Commerce de Vinhos (V1)

## 1. Visão Geral e Problema a ser Resolvido

### O Problema
Comprar vinhos selecionados de forma online muitas vezes envolve processos burocráticos ou plataformas confusas para o consumidor final. Para o negócio, iniciar uma operação digital completa com gateways de pagamento, controle complexo de estoque e logística exige investimentos significativos e esforço de desenvolvimento antes de validar a atratividade do catálogo e o comportamento do público-alvo.

### A Solução
Uma plataforma digital simplificada de e-commerce de vinhos que permite a visualização interativa do catálogo e a organização de intenções de compra em um carrinho de compras pessoal. A plataforma atende aos requisitos legais de comercialização de bebidas alcoólicas e valida o interesse dos clientes no portfólio de vinhos oferecido.

---

## 2. Objetivo da V1 (MVP)
A V1 tem como objetivo validar a aderência do portfólio de vinhos da marca no canal digital, permitindo a atração e o engajamento de usuários em torno do catálogo de produtos. O foco é fornecer uma experiência simples, segura e focada na seleção de produtos, postergando a automatização do fechamento de transações comerciais.

---

## 3. Funcionalidades da V1

### 3.1. Controle de Acesso por Maioridade
Garantir a conformidade legal para a exibição e venda de bebidas alcoólicas para o público nacional.
- **Barreira de Idade (Age Gate):** Bloqueio de acesso inicial ao catálogo, exigindo confirmação de maioridade antes de permitir a navegação na plataforma.
- **Validação de Cadastro:** Mecanismo no cadastro que restringe o registro de contas para usuários menores de idade.

### 3.2. Gestão de Usuários (Identity)
Permitir que usuários se identifiquem na plataforma para acessar funcionalidades exclusivas.
- **Cadastro e Autenticação:** Criação de conta de usuário e acesso seguro ao sistema.
- **Diferenciação Básica de Perfis:** Distinção funcional entre clientes comuns e administradores do catálogo.

### 3.3. Catálogo de Vinhos (Catalog)
Apresentação da lista de vinhos disponíveis aos visitantes autorizados.
- **Vitrine de Produtos:** Exibição estruturada das características comerciais de cada vinho (como nome, preço, descrição, imagem e atributos de classificação essenciais de vinhos).
- **Gerenciamento de Produtos:** Funcionalidade que permite a criação, edição e exclusão de vinhos no catálogo por usuários administradores autenticados.

### 3.4. Carrinho de Compras (Cart)
Permitir que usuários selecionem e organizem suas escolhas antes de qualquer contato ou tomada de decisão.
- **Uso Restrito a Usuários Autenticados:** A adição de vinhos ao carrinho é uma funcionalidade exclusiva para usuários identificados no sistema.
- **Gestão do Carrinho:** Permite adicionar itens, atualizar quantidades e remover produtos da lista.

### 3.5. Gestão de Endereços (Address) & Início do Checkout
Permitir que usuários cadastrem seus endereços com consulta automática de CEP e iniciem a esteira de validação para compras.
- **CRUD de Endereços:** Permite cadastrar, visualizar, editar e excluir múltiplos endereços, com marcação de endereço padrão.
- **Preenchimento Automático por CEP:** Integração com serviço de CEP (POC ViaCEP) para busca e preenchimento de logradouro, bairro, cidade e UF.
- **Validação Preliminar no Checkout:** O botão "Finalizar Compra" no carrinho valida se o usuário possui pelo menos um endereço cadastrado, bloqueando e direcionando para o cadastro caso não possua.

---

## 4. Fluxos de Usuário em Alto Nível

### 4.1. Navegação e Seleção de Produtos (Cliente)
1. **Verificação de Idade:** O visitante acessa a plataforma e passa pela barreira de confirmação de maioridade.
2. **Navegação:** O visitante navega pelo catálogo e visualiza as informações dos vinhos.
3. **Autenticação para Compra:** Ao tentar interagir com a intenção de compra (adicionar ao carrinho), o usuário é solicitado a fazer login ou cadastrar-se.
4. **Organização do Carrinho:** O usuário adiciona e gerencia os vinhos escolhidos no seu carrinho pessoal.
5. **Início do Checkout & Validação de Endereço:** O usuário clica em "Finalizar Compra". O sistema valida se há ao menos um endereço cadastrado. Se houver, prossegue para a revisão inicial do checkout com o endereço padrão; caso contrário, redireciona para o cadastro de endereço e retorna em seguida.

### 4.2. Gestão de Catálogo (Administrador)
1. **Autenticação:** O administrador acessa sua conta na plataforma.
2. **Gerenciamento Inline:** Ao navegar pelo catálogo, o administrador visualiza os controles para criar novos produtos, alterar informações ou remover itens da vitrine.

---

## 5. Critérios de Aceite Funcionais

| Funcionalidade | Critério de Aceite Funcional |
| :--- | :--- |
| **Barreira de Idade** | O catálogo só deve ser visualizado após a confirmação expressa de maioridade na tela inicial. |
| **Cadastro de Usuário** | O sistema deve rejeitar o registro de contas de usuários com idade inferior a 18 anos. |
| **Acesso ao Carrinho** | Adicionar vinhos ao carrinho de compras ou visualizar a lista de itens deve ser bloqueado para usuários não autenticados, direcionando-os à autenticação. |
| **Gestão do Catálogo** | Os botões de inserção, edição ou exclusão de produtos só devem estar visíveis e acessíveis para usuários autenticados com permissão de administrador. |
| **Gestão de Endereços & CEP** | Usuários autenticados podem gerenciar seus endereços com preenchimento automático por CEP e definição de endereço padrão. |
| **Validação de Checkout** | Avançar em "Finalizar Compra" exige que o usuário possua ao menos um endereço cadastrado, bloqueando a continuidade caso não possua. |

---

## 6. Fora de Escopo da V1
Para manter o MVP estritamente focado em validação de catálogo, captação de usuários e infraestrutura básica de entrega, os seguintes pontos estão excluídos da V1:
- **Fechamento de Pedidos e Geração de Código de Pedido:** A transação final de compra e código de pedido serão implementados em versões futuras; o Checkout na V1 atua estritamente como validador de pré-requisitos (endereço).
- **Meios de Pagamento (Payment):** Nenhuma integração ou facilidade para pagamentos (Pix, cartão, boleto) estará disponível na plataforma.
- **Logística e Cálculo de Frete:** Sem cálculo de frete, regras de entrega ou envio integrados.
- **Gestão Ativa de Estoque:** O estoque não será decrementado ou gerenciado ativamente no sistema durante esta fase.
- **Painel Administrativo Isolado:** A administração do catálogo de vinhos será feita diretamente na interface principal da vitrine.
- **Ferramentas de Marketing e Engajamento:** Cupons de desconto, avaliações de clientes, sistemas de recomendação ou lista de favoritos estão fora desta versão.

---

> [!NOTE]
> **Especificações Futuras (Specs):** A formatação visual das páginas, definições exatas de atributos de dados (schemas), estruturas de endpoints de API e contratos de comunicação pertencem ao escopo das especificações técnicas e serão detalhados em momento oportuno.
