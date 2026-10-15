## 1. Objetivo

Definir o comportamento funcional do módulo de gerenciamento de usuários (Identity), responsável pelo cadastro, autenticação e gerenciamento básico das contas dos usuários da plataforma.

## 2. Escopo

Esta especificação contempla:

Cadastro de usuários;
Autenticação (Login e Logout);
Consulta do próprio perfil;
Atualização dos dados do usuário;
Exclusão da própria conta;
Gerenciamento dos próprios endereços de entrega (associação 1:N);
Diferenciação entre usuários Cliente e Administrador;
Validação de maioridade durante o cadastro.

Não contempla:

Recuperação de senha;
Login social (Google, Apple etc.);
Verificação por e-mail;
Autenticação em dois fatores (2FA);
Gerenciamento de administradores.

## 3. Dados do Usuário

O usuário deverá possuir, no mínimo, os seguintes dados:

| Campo | Obrigatório | Observação |
|---|---|---|
| Nome | Sim | Nome completo do usuário |
| E-mail | Sim | Deve ser único |
| Senha | Sim | Armazenada de forma segura |
| Data de nascimento | Sim | Utilizada para validar maioridade |
| Perfil | Sim | Customer ou Admin |
| Endereços | Não | Lista de endereços associados (relacionamento 1:N com `Address`, detalhado em spec05) |
| Data de criação | Sim | Gerada automaticamente |
| Data de atualização | Sim | Atualizada automaticamente |        
## 4. Regras de Negócio

### Cadastro

O sistema deverá permitir o cadastro apenas quando:

todos os campos obrigatórios estiverem preenchidos;
o e-mail ainda não estiver cadastrado;
o usuário possuir idade igual ou superior a 18 anos.

Caso alguma regra seja violada, o cadastro não deverá ser concluído.

### Login

O usuário poderá autenticar-se utilizando:

e-mail;
senha.

Caso as credenciais sejam inválidas, o acesso deverá ser negado.

### Perfil

Usuários autenticados poderão:

visualizar seus próprios dados;
atualizar seus próprios dados;
gerenciar seus endereços cadastrados;
excluir sua própria conta.

Um usuário não poderá visualizar nem alterar dados de outros usuários.

### Exclusão da Conta

* Apenas o próprio usuário poderá solicitar a exclusão da sua conta.
* O sistema deverá solicitar uma confirmação antes de concluir a exclusão.
* Após a exclusão da conta, o usuário perderá imediatamente o acesso às funcionalidades autenticadas da plataforma.

### Papéis

#### Customer

Pode:

    acessar catálogo;
    gerenciar carrinho;
    gerenciar seus endereços (CRUD);
    editar seu perfil.

Não pode:

    alterar catálogo;
    acessar funcionalidades administrativas.

#### Admin

Possui todas as permissões do Customer.

Além disso pode:    

    cadastrar produtos;
    editar produtos;
    excluir produtos.


## 5. Fluxos

### Cadastro

1. O visitante acessa a tela de cadastro.
2. Preenche os dados obrigatórios.
3. O sistema valida as informações fornecidas.
4. O sistema verifica se o e-mail já está cadastrado.
5. O sistema verifica se o usuário possui idade igual ou superior a 18 anos.
6. Caso todas as validações sejam aprovadas, a conta é criada com sucesso.

### Login

1. O usuário informa e-mail e senha.
2. O sistema valida as credenciais.
3. Caso sejam válidas, o usuário é autenticado.
4. Caso sejam inválidas, o acesso é negado e uma mensagem de erro é exibida.

### Atualização de Perfil

1. O usuário autenticado acessa seu perfil.
2. Altera as informações desejadas.
3. O sistema valida os novos dados.
4. Caso sejam válidos, as informações são atualizadas.

### Exclusão de Conta

1. O usuário autenticado solicita a exclusão da própria conta.
2. O sistema solicita confirmação da ação.
3. Após a confirmação, a conta é removida.

## 6. Casos de Erro

O sistema deverá tratar, no mínimo, os seguintes cenários:

- tentativa de cadastro utilizando um e-mail já existente;
- tentativa de cadastro por usuário menor de 18 anos;
- tentativa de login com credenciais inválidas;
- tentativa de acesso sem autenticação;
- tentativa de acessar ou alterar dados de outro usuário;
- tentativa de acessar funcionalidades administrativas sem possuir permissão.

## 7. Critérios de Aceite

| Funcionalidade | Critério de Aceite |
|----------------|--------------------|
| Cadastro | Um usuário maior de 18 anos consegue criar uma conta utilizando um e-mail ainda não cadastrado. |
| Login | Apenas usuários com credenciais válidas conseguem autenticar-se. |
| Perfil | O usuário consegue visualizar e editar apenas seus próprios dados. |
| Exclusão de Conta | O usuário consegue excluir apenas sua própria conta. |
| Autorização | Apenas usuários com perfil Admin podem executar operações administrativas. |