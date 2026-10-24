ATO 0 · O PROBLEMA — aula de arquitetura

# Qual vinho levo

para a *picanha*?

vinhosexemplo.com.br/chat

---

cliente · agora

loja

situação realToda loja online recebe essa pergunta. Ela mistura gosto, número exato e história — e o cliente espera resposta de sommelier, em segundos.  
01 · RISCO — LLM sem catálogo

# Bonito, confiante —

e *inventado*.

vinhosexemplo.com.br/chat

---

assistente (LLM puro)Recomendo o **Vale do Sol Malbec 2018**, R\$ 189 — encorpado, perfeito para picanha. A safra 2018 foi **excepcional, a melhor da década** na região.

INVENTOU

PRODUTO NÃO EXISTE

o que aconteceuO modelo não conhece o estoque. Ele completa o padrão mais provável de uma resposta de loja de vinhos — com nome, preço e elogio plausíveis.  
nome dissoAlucinação: texto fluente sem compromisso com os fatos da loja. Para vender, isso é pior que não responder.

por quê?

02 · ALTERNATIVA ÓBVIA — mandar tudo no prompt

# Por que não colar

o catálogo *inteiro*?

limite 1 · janelaTodo modelo tem janela de contexto: um teto de tokens por chamada. Mil vinhos × \~500 tokens estouram o teto.  
limite 2 · custoCada pergunta pagaria o catálogo inteiro de novo. Tokens de entrada são cobrados por chamada.  
limite 3 · verdadePreço mudou às 14h. O prompt das 13h continua errado até alguém remontá-lo.  
03 · A IDEIA — definição

# RAG: recuperar, acrescentar, *gerar*.

Antes de responder, o sistema **busca** os trechos certos do catálogo, **coloca** esses trechos dentro do prompt e só então o modelo **escreve** — citando o que usou.  
1 · RECUPERARacha os trechos certos 2 · ACRESCENTARmonta o prompt com provas 3 · GERARescreve citando a fonte  
traduçãoRAG \= Retrieval-Augmented Generation, geração aumentada por recuperação. O modelo não "sabe" — ele consulta.  
04 · RAG POR DENTRO — a técnica, metade escrita

# RAG por dentro: a *ingestão*.

o filme da escritaTexto do catálogo chega, vira pedacinhos (chunks), cada pedacinho vira números (embedding) e os números moram no banco vetorial.  
spoiler do ato 3Existe mais de uma técnica de corte — qual é a nossa e por que ela fecha direitinho com essa loja é discussão da esteira de ingestão.  
05 · RAG POR DENTRO — metade leitura

# RAG por dentro: a *pergunta*.

o filme da leituraA pergunta vira números pela mesma tradução, bate no banco vetorial e volta com os pedacinhos mais parecidos do catálogo.  
e aí?Os pedacinhos entram no prompt e o modelo escreve em cima deles. Ingestão escreve, pergunta lê — o resto da aula é esse filme em câmera lenta.  
06 · ROTEIRO — cinco atos

# O mapa desta aula.

ATO 0

O problema

cenas 01–07

ATO 1

O monolito hoje

cenas 08–10

ATO 2

Arquitetura ampliada

cenas 11–12

ATO 3

Ingestão

cenas 13–28

ATO 4

Consumo

cenas 29–41  
---

ATO 5 · decisões e síntese — cenas 42–46  
você está aqui ▲  
contrato com vocêCada cena explica o que acontece e por que é feito assim — incluindo as alternativas óbvias que não funcionam.  
ATO 1 · PONTO DE PARTIDA — arquitetura atual

# A loja que já funciona.

já chama o mundo exterior HTTPSchamada internaSQL

cliente

Navegador

vitrine, carrinho, checkout

frontend

UI da loja

telas e componentes

backend

Monolito

regras de negócio, um deploy só

banco relacional

PostgreSQL

vinhos em JSONB · preço · estoque

caixa preta · já existe hoje

APIs externas

pagamento · correio (CEP) · e-mail — o monolito já chama serviços de fora  
monolitoUm frontend, um backend, um banco. Simples de operar, deploy de uma peça só — e é ele que vamos ampliar, não jogar fora.  
o catálogoCada vinho é um documento JSON numa coluna JSONB: nome, uva, safra, perfil, harmonização, preço, estoque, ficha editorial.  
07 · O LIMITE — SQL faz o que mandam

# Onde a busca exata falha.

psql — loja\_vinhos

---

SELECT nome, safra FROM vinhos  
WHERE descricao ILIKE '%encorpado%';

Serra Malbec 2018 — "corpo cheio, taninos firmes"

Vale Tannat 2018 — "potente, de guarda"

Brisa Merlot 2019 — "leve e frutado"

→ 0 linhas retornadas  
o problemaO cliente escreveu "encorpado"; a ficha diz "corpo cheio". Mesmo significado, letras diferentes — e o LIKE só sabe comparar letras.  
sem desmerecerSQL continua perfeito para o que é exato: preço ≤ 200, safra \= 2018, estoque \> 0\. Vamos usá-lo para isso — na hora certa.

por quê?

08 · DECISÃO — somar, não trocar

# Verdade e busca:

papéis *diferentes*.

PRATO 1 — FONTE DA VERDADE

banco relacional · jsonb

O que vale

transações, preço, estoque, versão. Se algo divergir, **aqui é a resposta final**.

PRATO 2 — ÍNDICE DE BUSCA

banco vetorial

O que se acha

trechos por significado e por termo. **Derivado e reconstruível**: se quebrar, refaz do PostgreSQL.  
BALANÇA DE RESPONSABILIDADES  
a respostaNão trocamos o banco. Somamos um índice especializado em achar trechos — como o índice remissivo de um livro.  
ATO 2 · VISÃO MACRO — depois

# O monolito ganha três órgãos.

SQL mesma transação polling grava vetores traduz busca híbrida prompt \+ contexto já chamava o mundo exterior

cliente

Navegador

agora com **chat**

frontend

UI da loja

backend

Monolito

banco relacional · fonte da verdade

PostgreSQL · JSONB

tabela outbox

eventos de mudança

ingestão

Worker

processa eventos em segundo plano

índice derivado

Banco vetorial

ChromaDB local · vetores \+ BM25

serviço externo

API de IA · Gemini

embeddings \+ geração

caixa preta · já existia

Outras APIs

pagamento · correio (CEP) · e-mail  
LEGENDA — bordô: ingestão · verde: consumo · âmbar: API de IA  
azul-aço: fonte da verdade · preto: já existia antes  
três órgãos novosOutbox \+ worker, banco vetorial (ChromaDB) e API de IA (Gemini). O resto continua igual.  
segurançaA chave da API fica só no backend/worker — o navegador nunca a vê.  
09 · OS DOIS TEMPOS — macro

# Duas esteiras, um catálogo.

ESTEIRA DE INGESTÃO — ASSÍNCRONA

cadastro do vinho → evento → worker → chunks → embeddings → índice (segundos depois, sem pressa)

ESTEIRA DE CONSUMO — TEMPO REAL

pergunta → vetor \+ termos → busca híbrida → filtros na verdade → LLM → resposta (milissegundos contam)  
o eloAs duas leem o mesmo catálogo, mas em momentos diferentes: a ingestão prepara; o consumo aproveita.  
próximos atosAto 3 desce a esteira bordô. Ato 4 desce a verde. Passo a passo, sem pular nada.  
ATO 3 · INGESTÃO 1/16 — começa no cadastro

# Nasce um vinho.

admin.vinhosexemplo.com.br/vinhos/novo

---

Nome · **Serra Malbec**  
Safra · **2018**  
Preço · **R\$ 179**  
Estoque · **4**  
Perfil · **corpo cheio, taninos firmes**  
Harmonização · **carnes grelhadas, picanha**  
Ficha da safra · **verão seco; colheita em março**

postgresql · tabela vinhos · coluna dados (jsonb)

---

{  
  "id": "VIN-001", "version": 3,  
  "nome": "Serra Malbec",  
  "safra": 2018, "preco": 179,  
  "estoque": 4,  
  "perfil": "corpo cheio, taninos firmes",  
  "harmonizacao": "carnes grelhadas, picanha",  
  "safra\_contexto": "verão seco; colheita em março"  
}  
passo 1Salvar grava o JSON no PostgreSQL — a fonte da verdade. Tudo que a ingestão fizer nasce deste documento.

por que não gravar direto nos dois?

INGESTÃO 2/16 — a alternativa que quebra

# O perigo das *duas gravações*.

backend

POST /vinhos

tenta gravar nos dois sistemas

gravação 1

PostgreSQL

vinho salvo

gravação 2

Banco vetorial

índice de busca  
✓  
✗  
rede caiu entre as duas chamadas — o vinho existe, mas **nunca aparece na busca**  
chamada 1 chamada 2 · remota · pode falhar  
o nome dissoDual-write: duas gravações remotas sem transação comum. Cedo ou tarde, uma acontece e a outra não.  
e tentar de novo?Retentativa ajuda, mas quem guarda a fila de pendências se o processo morrer? Esse é exatamente o problema que a próxima cena resolve.  
INGESTÃO 3/16 — o padrão outbox

# Outbox: gravar *tudo junto*.

1 TRANSAÇÃO NO POSTGRESQL — OS DOIS OU NENHUM

tabela vinhos

VIN-001 · v3

tabela outbox

evento: vinho\_alterado

worker

Consumidor

lê a outbox a cada poucos segundos (polling)  
pega o evento pendente processou → marca como feito (ou tenta de novo)  
✓  
por que funcionaO evento é gravado na mesma transação do produto: impossível ter um sem o outro. O worker refaz o resto quantas vezes precisar.  
sem kafkaPrimeira versão com polling simples no banco que já existe. Fila dedicada só quando o volume pedir.  
INGESTÃO 4/16 — o operário da esteira

# Quem é o *worker*?

1 · LER O EVENTO 2 · BUSCAR O JSON 3 · CORTAR \+ TRADUZIR 4 · GRAVAR \+ FEITO ✓ fila da outbox → vinho\_alterado VIN-001 vinho\_alterado VIN-007 vinho\_removido VIN-004  
processo separadoUm programa à parte do backend, em laço infinito: acorda a cada poucos segundos, executa a volta 1-2-3-4 e cochila de novo.  
por que fora da requisiçãoO passo 3 chama uma API externa — demora e pode falhar. Se fosse dentro do cadastro, o lojista olharia uma tela travada. Assim o cadastro responde na hora e o worker termina com calma.  
INGESTÃO 5/16 — a metáfora central

# Dois bancos, *dois idiomas*.

BANCO RELACIONAL — FALA "EXATO"

safra \= 2018**✓ entende**  
preço ≤ 200**✓ entende**  
estoque \> 0**✓ entende**  
"encorpado"?**✗ a ficha diz "corpo cheio"**

BANCO VETORIAL — FALA "SIGNIFICADO"

"encorpado" ≈ "corpo cheio"**✓ entende**  
"picanha" ≈ "carne grelhada"**✓ entende**  
gosto, ocasião, estilo**✓ entende**  
2018 × 2019**✗ parecidos demais**  
⇆ NENHUM ENTENDE O OUTRO  
callbackO SQL da cena 09 fala o idioma da esquerda: perfeito no exato, surdo no significado.  
a pontePara os dois se entenderem, alguém precisa traduzir o catálogo. É a próxima cena.  
INGESTÃO 6/16 — o processo de embedding

# Embedding é *tradução*.

Um modelo de IA lê o texto e devolve as **coordenadas** dele no idioma do banco vetorial. Quem opera a tradução é o **worker** — e a máquina de traduzir mora fora de casa.  
texto em português chamada de API coordenadas

idioma de entrada

chunk

"verão seco; colheita em março"

o tradutor

worker

empacota o texto e chama a API

a máquina de traduzir

API de IA · Gemini

modelo gigante, já pronto, camada gratuita

saída

\[0.021, −0.114, …\]

NA INGESTÃO — SEM RELÓGIO

o worker traduz o **catálogo inteiro** uma vez, de madrugada se preciso: ninguém está esperando

NA PERGUNTA — COM RELÓGIO

traduz-se **uma frase só**, a da pergunta — milissegundos, uma vez por cliente  
por que API externaRodar esse modelo aqui exigiria GPU cara ligada o dia inteiro. E chamar API não é novidade: lembra da caixa preta da cena 08? Pagamento e frete já eram assim.  
por que o workerPorque a tradução é trabalho de esteira: pesada, repetitiva e assíncrona. O backend só traduz perguntas — leves e na hora.

por quê?

INGESTÃO 7/16 — granularidade

# Por que não indexar

o JSON *inteiro*?

JEITO A — DOCUMENTO ÚNICO

Pergunta: **"com o que harmoniza?"**

→ recupera a ficha INTEIRA: nome, safra, preço, estoque, perfil, harmonização, ficha da safra…

SINAL ÚTIL NO CONTEXTO

JEITO B — TRECHO CERTO

Pergunta: **"com o que harmoniza?"**

→ recupera só: **"carnes grelhadas, picanha"**

SINAL ÚTIL NO CONTEXTO

o conceitoChunk é um trecho com assunto próprio. Pedaço menor \= busca mais precisa \= contexto mais limpo para o LLM.  
nem grande, nem miúdoGrande demais arrasta ruído; pequeno demais perde o sentido. Cortamos por assunto, não por tamanho fixo.  
INGESTÃO 8/16 — técnicas de chunking

# Três jeitos de cortar.

A · TAMANHO FIXO✗ descartado  
"Serra Malbec 2018 — verão se**|**co; colheita em **|**março, taninos fi**|**rmes"  
a tesoura cai a cada N caracteres — **corta ideias no meio**; metade do sentido fica de cada lado

B · POR FRASE OU PARÁGRAFO✗ descartado  
"Serra Malbec 2018, R\$ 179\. Verão seco; colheita em março. Combina com picanha."  
respeita a frase, mas o parágrafo **mistura assuntos** — safra, preço e prato no mesmo saco

C · POR ASSUNTO — A ESTRUTURA DO JSON✓ escolhido  
{ identidade/safra } · { perfil sensorial } · { harmonização }  
cada campo da ficha **já nasceu sendo um assunto** — a faca é a estrutura do dado, não a régua  
regra práticaExiste chunking por tamanho com sobreposição, por frase, semântico… Todos úteis para texto corrido. O nosso dado já vem estruturado — o campo é o corte.  
e se fosse PDF?Aí sim valeria a régua por tamanho com sobreposição. Ferramenta certa para o formato certo.  
INGESTÃO 9/16 — chunking

# Três chunks, três assuntos.

DOCUMENTO DE ORIGEM

Serra Malbec 2018

o JSON inteiro do vinho

CHUNK · IDENTIDADE/SAFRA  
"Serra Malbec 2018 — verão seco; colheita em março"  
wine\_id VIN-001 · type identidade · v3

CHUNK · PERFIL SENSORIAL  
"corpo cheio, taninos firmes"  
wine\_id VIN-001 · type sensorial · v3

CHUNK · HARMONIZAÇÃO  
"carnes grelhadas, picanha"  
wine\_id VIN-001 · type harmonização · v3  
metadadosCada chunk carrega de onde veio: wine\_id, tipo e versão. É isso que permite filtrar, agrupar e reindexar depois.  
INGESTÃO 10/16 — embedding

# Texto vira vetor.

O modelo de embedding lê o chunk e devolve uma lista fixa de números — as **coordenadas** desse texto num espaço de significados.  
vocabulárioVetor \= lista de números \= ponto num espaço de centenas de dimensões. Aqui usamos gemini-embedding-2.  
regra de ouroMesmo modelo, mesma versão, mesma dimensão para documento e pergunta — trocar de modelo exige reindexar tudo.  
INGESTÃO 11/16 — o espaço vetorial

# A geometria do significado.

leitura do mapaTextos parecidos caem perto: Malbec e Tannat são vizinhos (tintos de corpo). O Merlot leve fica longe.  
por que isso importa"Encorpado" e "corpo cheio" não têm letras em comum — mas caem na mesma região. É assim que a busca entende paráfrase.

por que não basta?

INGESTÃO 12/16 — o limite do denso

# Onde o vetor *tropeça*.

o tropeçoPara o significado, "2018" e "2019" são quase a mesma coisa — safras recentes de clima parecido. Mas para o cliente, é exatamente o ano que importa.  
conclusãoNúmeros exatos, códigos e nomes próprios pedem uma técnica lexical, que trata a palavra como palavra. Próxima cena.  
INGESTÃO 13/16 — índice lexical

# BM25: o peso das palavras.

O banco vetorial quebra o texto em termos e pesa cada um: **frequente no documento** e **raro no catálogo** valem mais. Stopwords valem quase nada.

2018  
0.94  
malbec  
0.81  
tinto  
0.52  
corpo  
0.37  
o · de · um  
0.01  
onde rodaDentro do próprio banco vetorial: o ChromaDB tem BM25 embutido, rodando local, sem chamar API. Cada chunk ganha um vetor esparso no momento da gravação.  
detalhe que salvaO BM25 precisa saber que o texto é português: configuramos radical e stopwords em PT — senão "encorpado" perde o pedaço errado.  
INGESTÃO 14/16 — o registro indexado

# Anatomia de um ponto.

banco vetorial · coleção vinhos · registro

---

{  
  "id": "7f3a…-VIN-001-identidade",   // UUID estável: wine\_id \+ chunk\_type  
  "vector": {  
    "dense": \[0.021, \-0.114, 0.087, …\],   // 768 números · gemini-embedding-2  
    "bm25":  { "2018": 0.94, "malbec": 0.81, … }  
  },  
  "payload": {  
    "wine\_id": "VIN-001", "chunk\_type": "identidade",  
    "version": 3, "text": "Serra Malbec 2018 — verão seco…",  
    "fonte": "ficha\_editorial"  
  }  
}  
1 PONTO \= ID \+ 2 VETORES \+ PAYLOAD  
id estávelMesmo vinho \+ mesmo tipo \= mesmo UUID. Reindexar sobrescreve o ponto certo — sem duplicar, sem órfãos.  
payloadO texto original e a origem viajam junto: a busca devolve prova, não só semelhança.  
INGESTÃO 15/16 — ponta a ponta

# Da ficha ao índice.

1 · cadastro2 · JSON salvo3 · evento outbox 4 · worker: chunks5 · embedding \+ BM256 · banco vetorial  
leia o caminhoCada estação tem um motivo de existir — e você já viu cada uma: transação, outbox, chunks, dois vetores, um ponto.  
tempoTudo isso acontece segundos depois do cadastro, fora da requisição do admin. O lojista nem percebe.  
INGESTÃO 16/16 — atualização e exclusão

# Mudou a ficha? *Reindexa.*

VERSÃO 2 — SAINDO

"verão normal; colheita em abril"

id 7f3a…-VIN-001-identidade

VERSÃO 3 — ENTRANDO

"verão seco; colheita em março"

id 7f3a…-VIN-001-identidade

RELÓGIO DO ÍNDICE

idempotênciaMesmo UUID, payload novo: o upsert sobrescreve. Rodar duas vezes dá o mesmo resultado — por isso o worker pode tentar de novo sem medo.  
exclusão e atrasoVinho removido gera evento e os pontos saem do índice. Entre a mudança e a reindexação há um atraso de segundos — lembre dele no Ato 4\.  
ATO 4 · CONSUMO 1/13 — tempo real

# A pergunta chega.

vinhosexemplo.com.br/chat

---

clienteQuero um tinto encorpado de 2018 para picanha, até R\$ 200\. O que vocês têm? Como foi essa safra?

POST /chat · a mesma frase, inteira

backend do monolito

Orquestrador

vai conduzir os próximos dez passos  
relógio ligadoDiferente da ingestão, aqui cada milissegundo conta: tem um cliente esperando na tela.  
CONSUMO 2/13 — leitura da pergunta

# Uma frase, três pedidos.

"Quero um tinto encorpado de 2018 para picanha, até R\$ 200\. Como foi essa safra?"

INTENÇÃO ABERTA

"tinto encorpado", "picanha" — gosto e ocasião. Vai para a **busca por significado**.

FILTROS EXATOS

safra \= 2018, preço ≤ 200 — números e fatos. Viram **filtro estruturado**, não texto de busca.

PEDIDO DE HISTÓRIA

"como foi a safra?" — exige **fonte editorial**; sem fonte, a resposta honesta é "não sabemos".  
quem decideEssa leitura pode ser feita por regras simples ou por uma chamada barata ao LLM que devolve JSON. O que importa: separar antes de buscar.  
CONSUMO 3/13 — duas representações

# A pergunta vira *duas coisas*.

pergunta do cliente

"tinto encorpado 2018 picanha…"

ramo denso · gemini-embedding-2

---

task: "question answering"  
query: "tinto encorpado 2018 picanha"  
→ vetor \[0.031, \-0.082, …\]

captura o **significado** da intenção

ramo lexical · bm25 (pt)

---

{ "2018": 0.94, "tinto": 0.52,  
  "encorpado": 0.77, "picanha": 0.88 }

captura os **termos exatos** da frase  
mesma mágica, dois dialetosOs dois ramos miram o mesmo banco vetorial: um fala em geometria, o outro em palavras. As próximas cenas mostram cada dialeto.  
CONSUMO 4/13 — busca por significado

# Cosseno mede *direção*.

leituraO vetor da pergunta é comparado com o vetor de cada chunk: quanto menor o ângulo, maior a afinidade de significado.  
resultado parcialMalbec (cos ≈ 0,98) e Tannat (≈ 0,95) sobem no ranking. "Encorpado" achou "corpo cheio" sem nenhuma letra em comum.

por quê?

CONSUMO 5/13 — a métrica certa

# Por que ângulo,

e não *distância*?

o problema da réguaA pergunta é curta; a ficha é longa. Textos de tamanhos diferentes geram vetores de comprimentos diferentes — a distância entre as pontas puniria os mais longos.  
o ângulo ignora o tamanhoMesma direção \= mesmo assunto \= cosseno 1,00. Por isso a comparação é angular: só a direção (o significado) conta.  
CONSUMO 6/13 — busca lexical

# BM25 também lê a pergunta.

2018  
0.94  
picanha  
0.88  
encorpado  
0.77  
tinto  
0.52  
~~até R\$ 200~~  
—  
atenção ao detalheBM25 não é "só da ingestão": ele indexa os documentos e representa a consulta com a mesma técnica — os dois lados falam a mesma língua.  
o que fica de fora"Até R\$ 200" não vira termo de busca. Preço é filtro estruturado, conferido na fonte da verdade — cenas 37 e 38\.

por quê?

CONSUMO 7/13 — um cobre o outro

# Por que busca *híbrida*?

CASO A · "tinto encorpado para picanha"

Nenhuma ficha usa a palavra "encorpado".

**Cosseno:** acha "corpo cheio" ✓  
**BM25:** nenhum termo bate ✗

CASO B · "safra 2018"

No espaço de significados, 2018 e 2019 são vizinhos.

**Cosseno:** mistura as safras ✗  
**BM25:** casa o número exato ✓  
conclusãoCada técnica tem um ponto cego — e o ponto cego de uma é a visão aguçada da outra. Por isso as duas rodam juntas.  
custoRodar as duas custa quase o mesmo que rodar uma: o banco vetorial resolve as duas na mesma consulta.  
CONSUMO 8/13 — juntando os rankings

# RRF: fusão por *posição*.

RANKING · COSSENO

1º · VIN-002 Tannat "potente" ≈ encorpado  
2º · VIN-001 Malbec "corpo cheio"  
3º · VIN-003 Merlot "leve"

RANKING · BM25

1º · VIN-001 "2018" \+ "picanha"  
2º · VIN-002 "2018"  
3º · VIN-003 nenhum termo forte

LISTA FUNDIDA · RRF

VIN-001 1º em uma, 2º na outra  
VIN-002 1º em uma, 2º na outra  
VIN-003 3º nas duas  
reciprocal rank fusionCada lista vale pela posição, não pela nota bruta: pontos \= 1 / (60 \+ posição). Assim escalas diferentes (cosseno 0–1, BM25 0–10+) não briguem.  
deduplicaçãoVários chunks do mesmo vinho? A lista final agrupa por wine\_id — um vinho, uma candidatura.  
CONSUMO 9/13 — filtros e reconferência

# O funil da verdade.

três portasSafra \= filtro estruturado no payload. Preço e estoque \= consulta fresquinha no PostgreSQL, na hora da resposta.  
por isso buscamos a maisPedimos mais candidatos do que vamos exibir: se os filtros derrubarem alguns, ainda sobra recomendação.

por quê?

CONSUMO 10/13 — o índice atrasa

# Por que reconferir

na *fonte*?

14:00  
**Índice atualizado** — worker reindexou o Serra Malbec: estoque 4\.  
14:01  
**Checkout vendeu** — cliente comprou as últimas. PostgreSQL agora: estoque 0\.  
14:01  
**Pergunta chega** — o índice ainda diz estoque 4\. O worker vai reindexar… daqui a alguns segundos.  
sem a reconferênciaO chat ofereceria um vinho esgotado — com preço e tudo. Frustração garantida.  
a regraÍndice serve para encontrar; fonte da verdade serve para afirmar. Preço e estoque só valem lidos agora.  
CONSUMO 11/13 — o pedido de história

# Safra: fonte ou *silêncio*.

QUANDO A FICHA EXISTE

"verão seco; colheita em março"

FONTE · FICHA EDITORIAL · VIN-001  
O trecho entra no contexto e a resposta **cita a fonte**.

QUANDO NÃO EXISTE

"Para este rótulo não temos registro editorial sobre a safra."

SEM FONTE · SEM AFIRMAÇÃO  
Melhor um "não sabemos" honesto do que uma safra **inventada**.  
princípioInformação extra sobre safra só existe se existir no corpus. O prompt manda o modelo ficar quieto quando falta prova — e a ausência de prova é decidida antes de chamar o LLM.  
CONSUMO 12/13 — prompt aumentado

# O pacote que o LLM recebe.

backend → gemini-2.5-flash-lite · corpo da chamada

---

SISTEMA — Você é o sommelier da loja. Responda só com as evidências abaixo. Se faltar informação, diga que não sabe. Cite o código do vinho.

EVIDÊNCIAS — VIN-001: "Serra Malbec 2018 — verão seco; colheita em março" · "corpo cheio, taninos firmes" · "carnes grelhadas, picanha"

DADOS ATUAIS — VIN-001: preço R\$ 179 · estoque 4 (PostgreSQL, agora)

PERGUNTA — "Quero um tinto encorpado de 2018 para picanha, até R\$ 200\. Como foi essa safra?" ▌  
delimitadoO modelo não "pensa na loja": ele redige sobre provas. A instrução reduz invenção — não garante zero erro, por isso tudo é citável.  
barato de propósitoContexto pequeno \= tokens pequenos. O funil das cenas anteriores é o que deixa esse pacote curto.  
CONSUMO 13/13 — a resposta

# A resposta com *recibo*.

vinhosexemplo.com.br/chat

---

assistente da lojaTemos o **Serra Malbec 2018**: corpo cheio e taninos firmes, combina muito bem com picanha. Está **R\$ 179** e temos **4 unidades** em estoque. Sobre a safra: nossa ficha registra **verão seco e colheita em março**.

VIN-001 fonte · ficha editorial preço e estoque conferidos agora safra 2018 ≤ R\$ 200 ✓  
verificávelCada afirmação tem origem: código do vinho, ficha citada, números lidos na hora. O cliente pode conferir — e a loja também.  
compare com a cena 02Mesma pergunta, mesmo modelo de linguagem. A diferença não é o modelo: é o pipeline em volta dele.  
ATO 5 · DECISÃO — modelos

# Escolha financeira,

validação *técnica*.

EMBEDDING

gemini-embedding-2

Vetoriza chunks e perguntas. Mesma versão e dimensão nos dois lados; **trocar \= reindexar tudo**.

GERAÇÃO

gemini-2.5-flash-lite

Redige a resposta sobre as evidências. Contexto curto \+ modelo leve \= **latência baixa**.

CAMADA GRATUITA

R\$ 0sujeito a cotas do projeto  
CRITÉRIOS QUE CONTINUAM VALENDO

qualidade em portuguêslatênciacotas e limitescusto por tokenpolítica de dados  
decisão do projetoO free tier do AI Studio pesa muito — mas a escolha é revisitável: critérios registrados, troca consciente.  
a chaveCriada no AI Studio, vive só no backend/worker. O frontend jamais a toca.  
ATO 5 · REVISÃO — consumo completo

# Do chat à resposta: dez passagens.

1 · chat envia a frase  
2 · backend decompõe  
3 · embedding da pergunta  
4 · termos BM25  
5 · busca híbrida no banco vetorial  
6 · fusão RRF \+ agrupa por vinho  
7 · filtros \+ PostgreSQL agora  
8 · contexto montado  
9 · LLM redige com provas  
10 · resposta no chat  
ensaiado, não improvisadoCada passagem tem dona e motivo. Quando algo falhar em produção, você saberá em qual número olhar.  
ATO 5 · SÍNTESE — o ciclo inteiro

# Uma loja. Duas esteiras.

*Um ciclo.*

CADASTRO POSTGRESQL \+ OUTBOX WORKER · CHUNKS API DE IA · EMBEDDINGS BANCO VETORIAL CHAT · PERGUNTA BUSCA → FILTROS → LLM → RESPOSTA  
o que você levaRAG não é um produto: é um desenho — fonte da verdade, índice derivado, dois vetores, uma fusão, uma reconferência e uma resposta com recibo.  
quase láExemplos de catálogo e safra são fictícios. A seguir: a revisão relâmpago e o obrigado.  
ATO 5 · REVISÃO — o caminho andado

# O que discutimos hoje.

0  
**O problema** — o modelo de linguagem, sozinho, inventa. RAG \= recuperar, acrescentar, gerar.  
1  
**A arquitetura** — dois bancos, dois idiomas: o relacional guarda a verdade, o vetorial acha por significado; o worker traduz entre eles.  
2  
**A ingestão** — outbox na mesma transação, corte por assunto, cada trecho com vetor denso \+ BM25.  
3  
**O consumo** — pergunta vira vetor e termos, busca híbrida, fusão por posição, funil da verdade no banco relacional.  
4  
**As decisões** — modelos, custo, segurança da chave — e a regra de ouro: índice encontra, fonte da verdade afirma.  
ficou nebuloso?Volta na cena dela — cada uma foi feita para ser revisitada, com e sem narração.  
FIM — até a próxima

# Obrigado.

Bons estudos, bons códigos — e da próxima vez que um chat de loja responder certinho, sem inventar nada, você já sabe: **tem um desenho segurando aquilo ali**.

UMA AULA DO PROF. FRANCISCO PRESTES · LINKEDIN.COM/IN/FRANCISCOPRESTES

RAG · LOJA DE VINHOS — 46 CENAS — COM E SEM NARRAÇÃO  
RAG · LOJA DE VINHOS — PIPELINE DE INGESTÃO E CONSUMO01 / 38  
LAT −23.55 · LON −46.63 · GRID 40PX  
PALCO 1920×1080 · ESCALA AUTOMÁTICA  
← ANTERIORPRÓXIMA →