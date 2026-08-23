/**
 * Gera as folhas de impressao 3x3 com as cartas que faltam.
 *
 * Cada slot tem o tamanho real de uma carta (63x88 mm), entao a folha impressa
 * pode ser recortada e colocada nos bolsos vazios do binder. A ordem segue a do
 * checklist: primeiro as cartas numeradas, depois os reverse holo.
 * A "exportacao para PDF" e a caixa de impressao do navegador com a opcao
 * "Salvar como PDF" -- sem depender de biblioteca externa.
 */

import { variantsOf, qty } from './store.js';
import { basePrice, formatBRL } from './prices.js';
import { typeLabel } from './labels.js';

const PER_PAGE = 9;

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

/**
 * Monta a lista de slots que serao impressos.
 * @param {object[]} cards cartas ja filtradas
 */
export function collectSlots(cards, set, options) {
  const base = [];
  const reverse = [];

  for (const card of cards) {
    if (card.secret && !options.secrets) continue;
    for (const variant of variantsOf(card)) {
      if (qty(set.id, card.number, variant.key) > 0) continue;
      if (variant.key === 'r') {
        if (options.reverse) reverse.push({ card, variant });
      } else {
        base.push({ card, variant });
      }
    }
  }

  const byNumber = (a, b) => a.card.number - b.card.number;
  return [...base.sort(byNumber), ...reverse.sort(byNumber)];
}

function buildSlot(slot, set, options) {
  const { card, variant } = slot;
  const node = el('div', 'slot');

  if (options.images && card.image) {
    const img = el('img');
    img.src = card.image;
    img.alt = '';
    img.loading = 'eager';
    node.append(img);
  }

  const body = el('div', 'slot-text');
  const label = variant.key === 'r' ? `${card.display} RH` : card.display;
  body.append(el('div', 'slot-num', `${label} / ${set.printedTotal}`));
  body.append(el('div', 'slot-name', card.name));

  const meta = [card.rarityLabel ?? card.rarity, card.type && typeLabel(card.type)]
    .filter(Boolean).join(' · ');
  body.append(el('div', 'slot-meta', variant.key === 'r' ? `${meta} · Reverse Holo` : meta));

  const foot = el('div', 'slot-foot');
  foot.append(el('span', null, set.code));
  if (options.prices) {
    const price = basePrice(card, set, [variant]);
    foot.append(el('span', 'slot-price', price ? formatBRL(price.value) : '—'));
  }
  body.append(foot);

  node.append(body);
  return node;
}

/** Desenha as folhas dentro de `root` e devolve quantas paginas foram geradas. */
export function renderSheets(root, slots, set, options) {
  root.replaceChildren();
  const pages = Math.ceil(slots.length / PER_PAGE);

  for (let page = 0; page < pages; page += 1) {
    const wrapper = el('section');
    const head = el('div', 'sheet-head');
    head.append(el('span', null, `${set.series} — ${set.name} (${set.code})`));
    head.append(el('span', null, `Faltando — página ${page + 1} de ${pages}`));
    wrapper.append(head);

    const sheet = el('div', 'sheet');
    const slice = slots.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
    for (const slot of slice) sheet.append(buildSlot(slot, set, options));
    for (let i = slice.length; i < PER_PAGE; i += 1) sheet.append(el('div', 'slot blank'));

    wrapper.append(sheet);
    root.append(wrapper);
  }
  return pages;
}

/**
 * Espera as imagens da area de impressao carregarem, para que a caixa de
 * impressao nao abra com slots em branco. Segue adiante se alguma falhar.
 */
export function waitForImages(root, timeout = 12000) {
  const images = [...root.querySelectorAll('img')].filter((img) => !img.complete);
  if (images.length === 0) return Promise.resolve();
  const loaded = Promise.all(
    images.map((img) => new Promise((done) => {
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    })),
  );
  return Promise.race([loaded, new Promise((done) => setTimeout(done, timeout))]);
}
