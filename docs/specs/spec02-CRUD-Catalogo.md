## 1. Objetivo

Definir o comportamento funcional do módulo do catálogo de vinhos (Catalog), responsável pela exibição dos produtos para os visitantes e pelas operações de cadastro, alteração e exclusão realizadas pelos administradores diretamente na interface do catálogo.

## 2. Escopo

Esta especificação contempla:

* Exibição dos vinhos disponíveis na vitrine pública do catálogo;
* Visualização dos detalhes de cada vinho;
* Operações de criação, edição e exclusão de vinhos (CRUD) diretamente na vitrine;
* Filtragem básica de produtos por atributos específicos de vinhos (ex: tipo de vinho, uva, país).

Não contempla:

* Busca textual avançada ou auto-complete;
* Avaliações, notas ou comentários de produtos por clientes;
* Lista de vinhos favoritos;
* Gestão e controle ativo de estoque (estoque tratado como infinito no sistema).

## 3. Dados do Vinho

Cada produto cadastrado no catálogo deverá possuir, no mínimo, os seguintes dados:

| Campo | Obrigatório | Observação |
|---|---|---|
| Nome | Sim | Nome comercial do vinho |
| Preço | Sim | Preço de venda em reais (deve ser maior que zero) |
| Descrição | Sim | Notas de degustação e informações gerais |
| Imagem | Sim | Referência ou URL da imagem do produto |
| Tipo de Vinho | Sim | Tinto, Branco, Rosé, Espumante ou Sobremesa |
| Uva | Sim | Variedade da uva (ex: Cabernet Sauvignon, Malbec, Chardonnay) |
| País de Origem | Sim | País de produção (ex: Brasil, Argentina, Chile, Portugal) |
| Safra | Sim | Ano de fabricação/safra (ex: 2021) |
| Teor Alcoólico | Sim | Graduação alcoólica percentual (ex: 13.5%) |
| Data de criação | Sim | Gerada automaticamente |
| Data de atualização | Sim | Atualizada automaticamente |

## 4. Regras de Negócio

### Exibição de Produtos

* Qualquer visitante que tenha passado com sucesso pela barreira de maioridade (Age Gate) poderá visualizar a listagem geral de vinhos e os detalhes individuais de cada produto.
* Os vinhos devem exibir as informações cadastradas no catálogo e os atributos específicos do vinho de forma clara para facilitar a escolha do cliente.

### Gestão do Catálogo (CRUD)

* As operações de criação, edição e exclusão de produtos no catálogo são restritas a usuários autenticados sob o papel de `Admin`.
* Os controles de inserção, alteração e deleção de vinhos devem ser apresentados e operados diretamente na interface visual do catálogo (vitrine inline), sem a necessidade de um painel de administração isolado.
* Ao editar ou excluir um vinho, as modificações devem refletir imediatamente no catálogo público para todos os visitantes da plataforma.

### Validações de Produto

* O cadastro ou edição de um produto deve falhar se qualquer campo obrigatório estiver ausente.
* O valor unitário do preço de venda do vinho não pode ser negativo ou zero.


### Fluxo

Cadastrar vinho

Admin acessa catálogo

↓

Seleciona criar vinho

↓

Preenche informações

↓

Sistema valida

↓

Produto criado

↓

Catálogo atualizado

### Editar

Admin seleciona produto

↓

Edita informações

↓

Sistema valida

↓

Produto atualizado

### Excluir

Admin solicita exclusão

↓

Sistema solicita confirmação

↓

Produto removido

