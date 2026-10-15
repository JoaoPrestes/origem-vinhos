## 1. Objetivo

Definir o comportamento funcional do módulo do carrinho de compras (Cart), permitindo que usuários autenticados selecionem vinhos do catálogo, gerenciem as quantidades desejadas e visualizem o valor acumulado de suas escolhas.

## 2. Escopo

Esta especificação contempla:

* Adição de vinhos do catálogo ao carrinho;
* Visualização dos itens inseridos no carrinho com seus respectivos valores unitários e totais;
* Alteração da quantidade de itens de cada vinho no carrinho;
* Remoção individual de vinhos do carrinho;
* Esvaziamento completo do carrinho de compras;
* Ação de "Finalizar Compra" (disparo da validação preliminar do Checkout);
* Persistência dos itens do carrinho no banco de dados, associados à conta do usuário.

Não contempla:

* Carrinho de compras para usuários não autenticados (visitantes anônimos);
* Mesclagem de carrinhos de sessão anônima com o carrinho do usuário logado;
* Cálculo automático de valor de frete ou tempo estimado de entrega;
* Aplicação de cupons de desconto ou cálculo de promoções.

## 3. Dados do Carrinho

O carrinho de compras é composto pelo vínculo entre o usuário e os vinhos selecionados, contendo no mínimo os seguintes dados por item:

| Campo | Obrigatório | Observação |
|---|---|---|
| Identificador do Usuário | Sim | Vínculo com a conta do usuário autenticado |
| Identificador do Vinho | Sim | Referência ao produto adicionado do catálogo |
| Quantidade | Sim | Número inteiro de garrafas selecionadas (mínimo 1) |
| Data de Adição | Sim | Data e hora em que o item foi adicionado |
| Data de Atualização | Sim | Data e hora da última alteração de quantidade |

## 4. Regras de Negócio

### Restrição de Autenticação

* O acesso e a manipulação do carrinho de compras são permitidos exclusivamente a usuários autenticados.
* Caso um visitante anônimo tente adicionar um produto ao carrinho ou acessar a página do carrinho, o sistema deverá bloquear a ação e redirecioná-lo imediatamente para a tela de autenticação (Login/Cadastro).

### Transição para o Checkout ("Finalizar Compra")

* O carrinho deve conter a ação "Finalizar Compra", disponível apenas para carrinhos contendo ao menos 1 item.
* Ao clicar em "Finalizar Compra", o sistema navega para a tela de **Checkout**.
* No Checkout, o sistema verifica se o usuário possui ao menos 1 endereço cadastrado (**Tem endereço?**):
  * **Sim → Continua:** Permanece no Checkout com o Endereço Padrão selecionado.
  * **Não → Cadastro de Endereço → Volta para o Checkout:** Direciona para o formulário de Cadastro de Endereço e, após o salvamento, retorna para o Checkout automaticamente.

### Gestão de Itens e Quantidades

* Ao adicionar um vinho que já existe no carrinho, o sistema deve apenas incrementar a quantidade desejada do produto existente.
* A quantidade mínima permitida de garrafas para qualquer item adicionado ao carrinho é 1.
* O usuário pode alterar a quantidade de garrafas de um vinho diretamente no carrinho. Caso a quantidade seja editada para zero (0) ou menos, o sistema deve remover o produto do carrinho do usuário.

### Exclusão de Produtos do Catálogo

* Caso um vinho seja removido do catálogo por um administrador e ainda esteja presente no carrinho de um ou mais usuários, o item deverá ser removido automaticamente desses carrinhos.
* O sistema deverá recalcular o valor total do carrinho após a remoção do item.
* A remoção do produto não deverá impedir os usuários de continuar utilizando seus carrinhos normalmente.

### Cálculo de Valores

* O sistema deve calcular dinamicamente o valor subtotal de cada item (Preço Unitário Atual do Catálogo $\times$ Quantidade) e o valor total acumulado do carrinho.
* Caso o preço de um vinho seja atualizado por um administrador no catálogo, o valor do carrinho do cliente deve refletir automaticamente o preço atualizado do produto ao ser consultado ou recarregado.


### Adicionar

Usuário autenticado

↓

Seleciona vinho

↓

Adicionar ao carrinho

↓

Produto já existe?

↓

Sim → Incrementa quantidade

Não → Cria novo item

### Atualizar

Usuário altera quantidade

↓

Sistema valida

↓

Quantidade válida?

↓

Sim → Atualiza

Não → Remove item

### Limpar carrinho

Usuário

↓

Solicita limpar carrinho

↓

Confirma

↓

Carrinho vazio