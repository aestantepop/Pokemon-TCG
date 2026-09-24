# Idle — Aika (MVP)

Jogo idle mobile (retrato, base 1080×1920) implementado a partir do design doc.
Personagem-piloto: **Aika** (tema academia). Arte, falas e mídias ainda são
placeholders.

## Como abrir

Dê dois cliques em `idle-game/index.html`. Não precisa de servidor nem de build.
O progresso salva sozinho no navegador (`localStorage`).

Testes da engine: `npm run test:idle`

## Onde fica cada coisa

| Arquivo | O que tem |
| --- | --- |
| `js/config.js` | Balanceamento e regras genéricas: fórmula de custo, pesos clique/segundo, reset, sinergia, afinidade, tiers de mídia |
| `js/data/aika.js` | Dados da Aika: sub-trilhas e nomes de estágio, traços, capítulos, mensagens |
| `js/personagens.js` | Expande os dados compactos na estrutura do design doc (Personagem → SubTrilha → Estagio) |
| `js/engine.js` | Toda a lógica, sem DOM (testada em `tests/engine.test.mjs`) |
| `js/assets.js` | Mapa `chave → imagem`. Chave ausente = placeholder |
| `js/ui.js`, `css/style.css` | Telas |

## Como adicionar conteúdo

- **Arte:** coloque a imagem em `assets/` e registre em `js/assets.js`, por exemplo
  `'aika.estilo.cabelo.50': 'assets/aika/estilo/cabelo-50.png'`. Mensagens usam
  `'aika.mensagem.tier-1'`. Não precisa mexer na lógica.
- **Falas:** preencha `textos` em `js/data/aika.js`:
  `c1p1: { fala: '...', acolhedor: '...', brincalhao: '...', frio: '...' }`.
- **Mensagens:** preencha `conteudo` em `mensagens`.
- **Nova personagem:** copie `js/data/aika.js`, troque os dados e inclua o
  `<script>` no `index.html`. Todos os sistemas (traços, capítulos, roster,
  sinergia) já são genéricos.

## Decisões tomadas onde o doc não fechava

- **Estágio 0** é o estado inicial, grátis. Compram-se os marcos 25, 50, 75 e 100,
  com custo `custoBase × 1.25^índice`.
- O custo base cresce ×4 a cada sub-trilha dentro da trilha. Sem isso, o 1.25^i
  do doc deixa a curva quase plana.
- **Efeitos:** os % somam dentro de uma trilha e multiplicam entre trilhas.
- **`moedaAcumuladaTotal`** é a moeda investida na personagem desde o último reset
  (a moeda do roster é compartilhada).
- **Reset:** exige capítulo 7 e 85% de progresso geral. Zera trilhas, capítulos,
  afinidade e respostas da personagem. Mantém o dinheiro do roster, o
  guarda-roupa e as mensagens.
- **Traço:** o jogador escolhe. O padrão de respostas marca um traço como
  "sugerido" (acolhedor → Confiante, brincalhão → Possessiva, frio → Carente).
- **Capítulos** exigem progresso, os diálogos do capítulo respondidos e uma
  afinidade mínima. Se só faltar afinidade, dá para "conversar de novo". Assim
  uma resposta ruim atrasa o jogador, mas não o trava.
- **Intimidade** exige afinidade mínima por estágio (10/25/45/70).

## Fora do MVP

Aquisição de novas personagens (indefinida no doc) e a reação de ciúme do
capítulo 6 quando o jogador some ou foca em outra personagem.
