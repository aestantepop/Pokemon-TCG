/**
 * Binder — organizador de cartas Pokemon.
 *
 * O app e estatico: o checklist vem de data/*.json, os dados extras e as
 * imagens vem da API oficial (buscadas pelo navegador e guardadas em cache) e a
 * colecao fica em localStorage.
 */

import * as store from './store.js';
import { enrich, clearCache } from './enrich.js';
import { loadLigaPrices, ligaGeneratedAt, ligaUrl, priceOf, basePrice, formatBRL } from './prices.js';
import { collectSlots, renderSheets, waitForImages } from './print.js';
import { RARITY_ORDER, typeLabel } from './labels.js';

const $ = (id) => document.getElementById(id);

const ui = {
  seriesSelect: $('series-select'),
  setSelect: $('set-select'),
  search: $('search'),
  searchClear: $('search-clear'),
  alphabet: $('alphabet'),
  filterOwned: $('filter-owned'),
  filterRarity: $('filter-rarity'),
  filterType: $('filter-type'),
  sort: $('sort'),
  splitReverse: $('split-reverse'),
  grid: $('grid'),
  empty: $('empty'),
  resultCount: $('result-count'),
  status: $('status'),
  printRoot: $('print-root'),
};

const state = {
  catalog: null,
  set: null,
  letter: null,
  query: '',
};

const normalize = (value) => (value ?? '')
  .toString()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

/* ---------------------------------------------------------------- dados --- */

async function loadCatalog() {
  const res = await fetch('data/sets.json');
  state.catalog = await res.json();

  ui.seriesSelect.replaceChildren(...state.catalog.series.map((s) => new Option(s.name, s.id)));
  ui.seriesSelect.addEventListener('change', () => { fillSetSelect(); loadSelectedSet(); });
  ui.setSelect.addEventListener('change', loadSelectedSet);
  fillSetSelect();
}

function fillSetSelect() {
  const series = state.catalog.series.find((s) => s.id === ui.seriesSelect.value);
  ui.setSelect.replaceChildren(
    ...(series?.sets ?? []).map((s) => new Option(`${s.name} (${s.code})`, s.id)),
  );
}

function currentSetMeta() {
  const series = state.catalog.series.find((s) => s.id === ui.seriesSelect.value);
  return series?.sets.find((s) => s.id === ui.setSelect.value) ?? series?.sets[0];
}

async function loadSelectedSet() {
  const meta = currentSetMeta();
  if (!meta) return;

  status('Carregando checklist…');
  const res = await fetch(meta.data);
  state.set = await res.json();

  fillFacetFilters();
  render();

  status('Buscando imagens e dados das cartas…');
  const [result] = await Promise.all([enrich(state.set), loadLigaPrices()]);

  fillFacetFilters();
  render();
  reportSource(result);
}

function reportSource(result) {
  const liga = ligaGeneratedAt();
  const priceNote = liga
    ? `Preços do Liga Pokémon de ${new Date(liga).toLocaleDateString('pt-BR')}.`
    : 'Preços estimados (sem data/prices-liga.json).';

  if (result.source === 'offline') {
    status(`Sem conexão com a API — usando o checklist local. ${priceNote}`);
  } else {
    const origin = result.source === 'cache' ? 'cache local' : 'API oficial';
    status(`${state.set.cards.length} cartas · dados do ${origin}. ${priceNote}`);
  }
}

function status(text) {
  ui.status.textContent = text;
}

/* --------------------------------------------------------------- filtros --- */

function fillFacetFilters() {
  const rarities = [...new Set(state.set.cards.map((c) => c.rarity).filter(Boolean))]
    .sort((a, b) => RARITY_ORDER.indexOf(a) - RARITY_ORDER.indexOf(b));
  const labelFor = (code) =>
    state.set.cards.find((c) => c.rarity === code)?.rarityLabel ?? code;

  const keepRarity = ui.filterRarity.value;
  ui.filterRarity.replaceChildren(
    new Option('Todas as raridades', 'all'),
    ...rarities.map((r) => new Option(`${labelFor(r)} (${r})`, r)),
  );
  ui.filterRarity.value = rarities.includes(keepRarity) ? keepRarity : 'all';

  const types = [...new Set(state.set.cards.map((c) => c.type).filter(Boolean))];
  const keepType = ui.filterType.value;
  ui.filterType.replaceChildren(
    new Option('Todos os tipos', 'all'),
    ...types.map((t) => new Option(typeLabel(t), t)),
  );
  ui.filterType.value = types.includes(keepType) ? keepType : 'all';
}

function buildAlphabet() {
  const letters = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
  ui.alphabet.replaceChildren(
    ...letters.map((letter) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = letter;
      btn.addEventListener('click', () => {
        state.letter = state.letter === letter ? null : letter;
        render();
      });
      return btn;
    }),
  );
}

function matchesSearch(card) {
  if (!state.query) return true;
  const haystack = [
    card.name,
    card.display,
    `${card.display}/${state.set.printedTotal}`,
    String(card.number),
    card.rarity,
    card.rarityLabel,
    card.rarityFull,
    typeLabel(card.type),
    card.type,
    card.supertype,
    (card.subtypes ?? []).join(' '),
    card.text,
  ];
  return normalize(haystack.join(' ')).includes(state.query);
}

function matchesLetter(card) {
  if (!state.letter) return true;
  const first = normalize(card.name)[0] ?? '';
  return state.letter === '#' ? !/[a-z]/.test(first) : normalize(state.letter) === first;
}

function matchesOwned(card) {
  const mode = ui.filterOwned.value;
  if (mode === 'all') return true;
  const has = store.hasCard(state.set.id, card.number);
  if (mode === 'owned') return has;
  if (mode === 'foil') return store.hasFoil(state.set.id, card.number);
  if (mode === 'incomplete') {
    // algum espaco do binder ainda vazio (ex.: tenho a normal mas nao a reverse)
    return store.variantsOf(card).some((v) => store.qty(state.set.id, card.number, v.key) === 0);
  }
  return !has; // "missing": nenhuma copia
}

function visibleCards() {
  const rarity = ui.filterRarity.value;
  const type = ui.filterType.value;

  const cards = state.set.cards.filter((card) =>
    (rarity === 'all' || card.rarity === rarity)
    && (type === 'all' || card.type === type)
    && matchesLetter(card)
    && matchesOwned(card)
    && matchesSearch(card));

  const priceOfCard = (card) =>
    basePrice(card, state.set, store.variantsOf(card))?.value ?? -1;

  const sorters = {
    number: (a, b) => a.number - b.number,
    name: (a, b) => a.name.localeCompare(b.name, 'pt-BR') || a.number - b.number,
    rarity: (a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) || a.number - b.number,
    price: (a, b) => priceOfCard(b) - priceOfCard(a),
  };
  return cards.sort(sorters[ui.sort.value] ?? sorters.number);
}

/* ------------------------------------------------------------ renderizacao --- */

function stepper(card, variant, onChanged) {
  const setId = state.set.id;
  const row = document.createElement('div');
  row.className = 'variant';

  const label = document.createElement('span');
  label.className = 'variant-label';
  label.textContent = variant.label;

  const box = document.createElement('div');
  box.className = 'stepper';

  const minus = document.createElement('button');
  minus.type = 'button';
  minus.textContent = '−';
  minus.title = `Tirar uma cópia ${variant.label}`;

  const count = document.createElement('span');
  count.className = 'qty';

  const plus = document.createElement('button');
  plus.type = 'button';
  plus.textContent = '+';
  plus.title = `Adicionar uma cópia ${variant.label}`;

  const paint = () => {
    const value = store.qty(setId, card.number, variant.key);
    count.textContent = value;
    row.classList.toggle('zero', value === 0);
    row.classList.toggle('has', value > 0);
  };

  const change = (delta) => {
    store.bump(setId, card.number, variant.key, delta);
    paint();
    onChanged?.();
  };
  minus.addEventListener('click', () => change(-1));
  plus.addEventListener('click', () => change(1));
  paint();

  box.append(minus, count, plus);
  row.append(label, box);
  return row;
}

/**
 * Um tile do grid.
 * @param {object[]} variants variantes mostradas neste tile (uma so quando o
 *   modo "reverse separado" esta ligado)
 */
function cardTile(card, variants) {
  const setId = state.set.id;
  const isReverseTile = variants.length === 1 && variants[0].key === 'r';

  const tile = document.createElement('article');
  tile.className = 'card';

  const art = document.createElement('div');
  art.className = 'card-art';

  if (card.image) {
    const img = document.createElement('img');
    img.src = card.image;
    img.alt = card.name;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', () => {
      img.remove();
      const ph = document.createElement('div');
      ph.className = 'placeholder';
      ph.textContent = `${card.display} · ${card.name}`;
      art.append(ph);
    }, { once: true });
    art.append(img);
  }

  const badges = document.createElement('div');
  badges.className = 'badges';
  art.append(badges);

  /** Reaplica tudo que depende das quantidades: opacidade, brilho foil e selos. */
  const paintTile = () => {
    const owned = variants.reduce((sum, v) => sum + store.qty(setId, card.number, v.key), 0);
    const foil = variants.some((v) => v.foil && store.qty(setId, card.number, v.key) > 0);

    tile.classList.toggle('missing', owned === 0);
    tile.classList.toggle('foil', foil);

    const tags = [];
    if (card.rarity) tags.push(['badge rarity', isReverseTile ? 'RH' : card.rarity]);
    if (foil) tags.push(['badge foil-tag', 'FOIL']);
    if (owned > 1) tags.push(['badge count', `×${owned}`]);

    badges.replaceChildren(...tags.map(([className, text]) => {
      const node = document.createElement('span');
      node.className = className;
      node.textContent = text;
      return node;
    }));
  };

  const info = document.createElement('div');
  info.className = 'card-info';
  const num = document.createElement('span');
  num.className = 'card-num';
  num.textContent = isReverseTile ? `${card.display} RH` : card.display;
  const name = document.createElement('span');
  name.className = 'card-name';
  name.textContent = card.name;
  name.title = card.text ? `${card.name} — ${card.text}` : card.name;
  info.append(num, name);

  const price = basePrice(card, state.set, variants);
  if (price) {
    const tag = document.createElement('span');
    tag.className = `card-price${price.source === 'estimado' ? ' estimated' : ''}`;
    tag.textContent = formatBRL(price.value);
    tag.title = price.source === 'liga'
      ? 'Preço do Liga Pokémon'
      : 'Estimativa a partir do preço de mercado internacional';
    info.append(tag);
  }

  const box = document.createElement('div');
  box.className = 'variants';
  for (const variant of variants) box.append(stepper(card, variant, paintTile));

  const links = document.createElement('div');
  links.className = 'card-links';
  const liga = document.createElement('a');
  liga.href = ligaUrl(card, state.set);
  liga.target = '_blank';
  liga.rel = 'noopener';
  liga.textContent = 'Liga Pokémon';
  links.append(liga);

  paintTile();
  tile.append(art, info, box, links);
  return tile;
}

/** Atualiza o contador de progresso do set inteiro. */
function paintProgress() {
  const stats = store.progress(state.set.cards, state.set.id);
  const { slots, filled, copies } = stats;
  $('progress-have').textContent = filled;
  $('progress-total').textContent = `/${slots}`;
  $('progress-fill').style.width = `${slots ? (filled / slots) * 100 : 0}%`;
  $('progress-label').textContent =
    `${(slots ? filled / slots * 100 : 0).toFixed(1)}% do master set · ${copies} cartas na coleção`;
  return stats;
}

function render() {
  if (!state.set) return;

  for (const btn of ui.alphabet.children) btn.classList.toggle('on', btn.textContent === state.letter);

  const cards = visibleCards();
  const split = ui.splitReverse.checked;

  const tiles = [];
  for (const card of cards) {
    const variants = store.variantsOf(card);
    if (!split) { tiles.push(cardTile(card, variants)); continue; }
    for (const variant of variants) tiles.push(cardTile(card, [variant]));
  }

  ui.grid.replaceChildren(...tiles);
  ui.empty.hidden = tiles.length > 0;

  const { slots } = paintProgress();
  ui.resultCount.textContent =
    `${tiles.length} ${tiles.length === 1 ? 'carta' : 'cartas'} na tela · `
    + `${state.set.cards.length} numeradas + ${state.set.reverseHoloCount} reverse = ${slots} espaços no binder`;

  const links = state.set.links ?? {};
  if (links.pkmncards) $('link-pkmncards').href = links.pkmncards;
  if (links.watchtower) $('link-watchtower').href = links.watchtower;
  if (links.ligapokemon) $('link-liga').href = links.ligapokemon;
}

/* ------------------------------------------------------------- impressao --- */

function printOptions() {
  return {
    images: $('print-images').checked,
    reverse: $('print-reverse').checked,
    secrets: $('print-secrets').checked,
    prices: $('print-prices').checked,
    filtered: $('print-filtered').checked,
  };
}

function updatePrintSummary() {
  const options = printOptions();
  const source = options.filtered ? visibleCards() : state.set.cards;
  const slots = collectSlots(source, state.set, options);
  $('print-summary').textContent = slots.length === 0
    ? 'Nada faltando com essas opções — nenhuma página seria gerada.'
    : `${slots.length} espaços para imprimir em ${Math.ceil(slots.length / 9)} página(s) A4.`;
  $('print-go').disabled = slots.length === 0;
}

async function doPrint() {
  const options = printOptions();
  const source = options.filtered ? visibleCards() : state.set.cards;
  const slots = collectSlots(source, state.set, options);
  if (slots.length === 0) return;

  status('Montando as folhas…');
  const pages = renderSheets(ui.printRoot, slots, state.set, options);
  if (options.images) await waitForImages(ui.printRoot);
  status(`${pages} página(s) prontas — use "Salvar como PDF" na caixa de impressão.`);
  window.print();
}

/* ---------------------------------------------------------------- backup --- */

function download(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------------------------------------------------------------- eventos --- */

function wireEvents() {
  let searchTimer;
  ui.search.addEventListener('input', () => {
    ui.searchClear.hidden = ui.search.value === '';
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.query = normalize(ui.search.value.trim()); render(); }, 120);
  });
  ui.searchClear.addEventListener('click', () => {
    ui.search.value = '';
    ui.searchClear.hidden = true;
    state.query = '';
    render();
  });

  for (const control of [ui.filterOwned, ui.filterRarity, ui.filterType, ui.sort, ui.splitReverse]) {
    control.addEventListener('change', render);
  }

  $('btn-print').addEventListener('click', () => {
    updatePrintSummary();
    $('print-dialog').showModal();
  });
  for (const id of ['print-images', 'print-reverse', 'print-secrets', 'print-prices', 'print-filtered']) {
    $(id).addEventListener('change', updatePrintSummary);
  }
  $('print-dialog').addEventListener('close', (event) => {
    if (event.target.returnValue === 'print') doPrint();
  });

  $('btn-prices').addEventListener('click', () => {
    $('usd-rate').value = store.getSettings().usdRate;
    $('prices-dialog').showModal();
  });
  $('prices-dialog').addEventListener('close', async (event) => {
    const rate = Number.parseFloat($('usd-rate').value);
    if (Number.isFinite(rate) && rate > 0) store.updateSettings({ usdRate: rate });
    if (event.target.returnValue === 'reload') {
      status('Recarregando preços…');
      clearCache(state.set.id);
      const [result] = await Promise.all([enrich(state.set, { force: true }), loadLigaPrices()]);
      reportSource(result);
    }
    render();
  });

  $('btn-export').addEventListener('click', () => {
    const stamp = new Date().toISOString().slice(0, 10);
    download(`binder-colecao-${stamp}.json`, store.exportBackup());
  });

  $('btn-import').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      store.importBackup(await file.text());
      status('Backup importado.');
    } catch (err) {
      status(`Falha ao importar: ${err.message}`);
    }
    event.target.value = '';
  });

  $('btn-reset').addEventListener('click', () => {
    const name = state.set?.name ?? 'esta expansão';
    if (confirm(`Zerar todas as quantidades de ${name}? Isso não pode ser desfeito.`)) {
      store.resetSet(state.set.id);
      status(`${name} zerada.`);
    }
  });

  // Mudancas na colecao so repintam o progresso; o tile cuida de si mesmo.
  // A excecao e quando um filtro de posse esta ativo: a carta pode ter saido
  // ou entrado na selecao, entao vale redesenhar a grade.
  store.onChange(() => {
    if (!state.set) return;
    if (ui.filterOwned.value === 'all') paintProgress();
    else render();
  });
}

buildAlphabet();
wireEvents();
loadCatalog().then(loadSelectedSet).catch((err) => {
  status(`Erro ao carregar: ${err.message}`);
  console.error(err);
});
