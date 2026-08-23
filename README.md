# Binder — organizador de cartas Pokémon

App web para organizar a coleção por **lançamento → expansão**, marcar o que você
tem (normal, reverse holo e foil, com quantidade) e **imprimir em PDF só o que
falta**, no tamanho real da carta, para colocar nos bolsos vazios do binder.

Começa com **Scarlet & Violet → Surging Sparks (SSP / SV08)**: 252 cartas
numeradas + 165 reverse holo = **417 espaços de binder**.

## Como abrir (jeito fácil)

1. Nesta página do GitHub, clique no arquivo **`binder.html`**.
2. Clique no botão **Download raw file** (o ícone de seta ⤓, no canto direito).
3. O arquivo cai na sua pasta de Downloads. **Dê dois cliques nele.**

Pronto, o app abre no navegador. Não precisa instalar nada, não precisa de
servidor, não precisa de terminal.

O `binder.html` é o app inteiro num arquivo só — a interface, o checklist das
417 cartas e a lógica, tudo junto. Você pode arrastar ele para a área de
trabalho, favoritar a página no navegador e usar sempre daí.

### Coisas importantes de saber

- **Salva sozinho, na hora.** Cada clique nos contadores grava direto no
  navegador (`localStorage`). Não existe botão de salvar e não tem como perder
  por esquecer de salvar: pode fechar a aba a qualquer momento.
- **O que guarda a coleção é o navegador, não o arquivo.** No Chrome e no Edge,
  todas as páginas abertas do disco dividem o mesmo espaço de armazenamento —
  testado: mover o `binder.html` de pasta, renomear ou baixar uma versão nova
  mantém as marcações. O Firefox pode isolar por caminho do arquivo, então lá
  vale o hábito de deixar o arquivo num lugar fixo.
- **Não sincroniza entre aparelhos.** O que você marcar no computador não
  aparece no celular, nem em outro navegador do mesmo computador. Cada um tem a
  sua própria coleção. Para levar de um para o outro, use o backup.
- **Faça backup de vez em quando**: menu **Mais → Salvar backup da coleção**.
  Isso baixa um `.json` que você guarda onde quiser e recarrega depois em
  **Mais → Importar backup**. É também assim que você leva a coleção para outro
  computador ou celular.
- **Na primeira vez, abra com internet.** O app busca as imagens e os textos das
  cartas e guarda em cache. Depois disso funciona offline.
- Se você baixar uma versão nova do `binder.html` mais para frente, salve o
  backup antes e importe depois.

## Como rodar a versão de desenvolvimento

Se você for mexer no código, use os arquivos separados (`index.html`, `js/`,
`css/`). Essa versão precisa de um servidor local, porque o navegador bloqueia
`fetch` e módulos ES em páginas abertas por `file://`:

```bash
npm start                  # ou: python3 -m http.server 8080
```

Depois abra <http://localhost:8080>.

Ao terminar as mudanças, regenere o arquivo único:

```bash
npm run build:html         # gera binder.html a partir de js/, css/ e data/
```

## O que dá para fazer

- **Menu em cascata**: escolhe o lançamento (Scarlet & Violet) e a expansão
  (Surging Sparks). Novas expansões entram em `data/sets.json`.
- **Marcar o que você tem**: cada carta tem contadores de **Normal** e
  **Reverse**; as raridades que já saem foil (Double Rare, IR, UR, SIR, HR) têm
  um contador único de **Foil**.
- **Visual**: as cartas que faltam ficam escuras e dessaturadas; as que você tem
  ficam normais. Se você tem uma cópia foil ou reverse, a carta ganha o brilho
  holográfico e o selo **FOIL**. Mais de uma cópia mostra `×N`.
- **Busca** por nome, número (`57`, `057`, `057/191`), tipo, raridade ou texto
  da carta (ataques, habilidades, regras). Tem também a régua de letras A–Z.
- **Filtros**: todas / só as que faltam / só as que tenho / só as foil /
  binder incompleto (tenho a normal mas falta a reverse). Ordenação por número,
  nome, raridade ou preço.
- **Reverse holo como carta separada**: liga esse modo e cada reverse vira um
  tile próprio — a grade passa a mostrar os 417 espaços do master set.
- **Exportar PDF do binder**: gera folhas A4 com grade 3×3 no tamanho exato da
  carta (63×88 mm), só com o que falta. Dá para incluir/excluir os reverse, as
  secretas (192–252), a imagem e o preço, ou usar os filtros da tela. O "PDF" é
  a caixa de impressão do navegador → **Salvar como PDF**.
- **Backup**: exporta e importa a coleção em JSON (menu **Mais**).

Tudo fica salvo no `localStorage` do navegador — não sobe para lugar nenhum.

## Preços

O **Liga Pokémon não tem API pública** e não libera leitura pelo navegador
(CORS), então os preços de lá entram por um arquivo gerado na sua máquina:

```bash
node scripts/fetch-liga-prices.mjs sv08            # coleta o set inteiro
node scripts/fetch-liga-prices.mjs sv08 --limit 20 # teste rápido
node scripts/fetch-liga-prices.mjs sv08 --debug 57 # salva o HTML de uma carta
```

Isso grava `data/prices-liga.json`; rode `npm run build:html` para embutir e
recarregue a página — os preços aparecem em R$ marcados como **Liga**. Sem esse arquivo, o app mostra o preço de mercado
internacional convertido pela cotação que você define em **Mais → Atualizar
preços**, em itálico e marcado como *estimado*. Toda carta tem link direto para
a página dela no Liga Pokémon.

> O script raspa o HTML do site, e o layout do Liga muda de tempos em tempos.
> Se ele parar de achar preço, rode com `--debug NUMERO`, olhe o HTML salvo e
> ajuste `PRICE_PATTERNS` no próprio script. Também dá para preencher a mão:
> `node scripts/fetch-liga-prices.mjs sv08 --from-csv precos.csv`, com linhas
> no formato `numero,normal,reverse`.

## Estrutura

```
binder.html                       app inteiro num arquivo (gerado; é o que você abre)
index.html                        interface da versão de desenvolvimento
css/styles.css                    tema escuro + folha de estilo de impressão
js/app.js                         orquestra tela, filtros e diálogos
js/store.js                       coleção em localStorage
js/enrich.js                      dados e imagens da API do Pokémon TCG (+cache)
js/prices.js                      preços do Liga / estimativa
js/print.js                       montagem das folhas 3×3
js/labels.js                      rótulos em português
js/load-json.js                   leitura dos dados (trocada no arquivo único)
data/sets.json                    catálogo de lançamentos e expansões
data/sv08-surging-sparks.json     checklist do set (gerado)
data/surging-sparks-checklist.csv checklist original do TCG Watchtower
scripts/build-set-data.mjs        CSV → JSON do set
scripts/build-single-file.mjs     junta tudo em binder.html
scripts/fetch-liga-prices.mjs     coleta de preços do Liga Pokémon
```

## Adicionar outra expansão

1. Coloque o checklist em `data/` e adapte `scripts/build-set-data.mjs`
   (as faixas de tipo por numeração ficam em `TYPE_RANGES`).
2. Rode `npm run build:data`.
3. Adicione a entrada em `data/sets.json` com o `id`, o `code` e o caminho do
   JSON. O menu em cascata se monta sozinho a partir desse arquivo.
4. Inclua o caminho do novo JSON em `DATA_FILES`, dentro de
   `scripts/build-single-file.mjs`, e rode `npm run build:html`.

## Observações sobre os dados

- O checklist do TCG Watchtower omite 8 números (162, 164, 176, 182, 183, 185,
  186 e 191). Eles existem no JSON como espaços reservados e o nome real é
  preenchido pela API na primeira carga com internet.
- Os tipos foram deduzidos das faixas de numeração do set (sets modernos são
  ordenados por tipo) e são sobrescritos pelos dados da API quando ela responde.
