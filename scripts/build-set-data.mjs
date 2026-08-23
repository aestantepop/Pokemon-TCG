#!/usr/bin/env node
/**
 * Converte o checklist CSV do TCG Watchtower em data/sv08-surging-sparks.json.
 *
 * O CSV traz numero, nome e raridade, mas nao traz tipo nem texto da carta.
 * O tipo e derivado das faixas de numeracao (sets de Pokemon TCG sao ordenados
 * por tipo) e pode ser sobrescrito em tempo de execucao pelos dados da API
 * oficial, que o app busca no navegador.
 *
 * Uso: node scripts/build-set-data.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CSV = resolve(root, 'data/surging-sparks-checklist.csv');
const OUT = resolve(root, 'data/sv08-surging-sparks.json');

/** Faixas de numeracao -> tipo, na ordem padrao dos sets modernos. */
const TYPE_RANGES = [
  [1, 15, 'Grass'],
  [16, 39, 'Fire'],
  [40, 56, 'Water'],
  [57, 69, 'Lightning'],
  [70, 96, 'Psychic'],
  [97, 116, 'Fighting'],
  [117, 121, 'Darkness'],
  [122, 132, 'Metal'],
  [133, 142, 'Dragon'],
  [143, 161, 'Colorless'],
  [162, 190, 'Trainer'],
  [191, 191, 'Energy'],
];

const RARITY_LABELS = {
  C: 'Comum',
  U: 'Incomum',
  R: 'Rara',
  DR: 'Double Rare',
  IR: 'Illustration Rare',
  UR: 'Ultra Rare',
  SIR: 'Special Illustration Rare',
  HR: 'Hyper Rare',
};

/** Raridades cuja impressao ja e foil por natureza (nao existe versao "normal"). */
const ALWAYS_FOIL = new Set(['DR', 'IR', 'UR', 'SIR', 'HR']);

const typeForNumber = (n) => TYPE_RANGES.find(([lo, hi]) => n >= lo && n <= hi)?.[2] ?? null;

const supertypeForType = (type) =>
  type === 'Trainer' ? 'Trainer' : type === 'Energy' ? 'Energy' : 'Pokemon';

/** Divide uma linha de CSV respeitando aspas duplas. */
function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i += 1; } else { quoted = !quoted; }
    } else if (ch === ',' && !quoted) {
      out.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

const csv = readFileSync(CSV, 'utf8').split(/\r?\n/);

const cards = new Map(); // numero -> carta
const reverseNumbers = new Set();
let section = null;

for (const line of csv) {
  if (!line.trim()) continue;
  const sectionMatch = line.match(/^---\s*(.+?)\s*--/);
  if (sectionMatch) { section = sectionMatch[1]; continue; }
  const cells = splitCsvLine(line);
  const first = cells[0];

  const rh = first.match(/^(\d{3})\s+RH$/);
  if (rh) { reverseNumbers.add(Number(rh[1])); continue; }

  const plain = first.match(/^(\d{3})$/);
  if (!plain) continue;
  const number = Number(plain[1]);
  const name = cells[1];
  const rarity = cells[2];
  if (!name || !rarity) continue;
  cards.set(number, { number, name, rarity, section });
}

// As cartas secretas (>=192) sao versoes alternativas de uma carta base:
// herdam o tipo dela pelo nome.
const typeByName = new Map();
for (const card of cards.values()) {
  if (card.number <= 191) typeByName.set(card.name.toLowerCase(), typeForNumber(card.number));
}

const HIGHEST_NUMBERED = 191;
const TOTAL_PRINTED = 252;

const build = (card) => {
  const { number, name, rarity } = card;
  const type = number <= HIGHEST_NUMBERED
    ? typeForNumber(number)
    : typeByName.get(name.toLowerCase()) ?? null;
  const alwaysFoil = ALWAYS_FOIL.has(rarity);
  return {
    number,
    display: String(number).padStart(3, '0'),
    name,
    rarity,
    rarityLabel: RARITY_LABELS[rarity] ?? rarity,
    type,
    supertype: supertypeForType(type),
    secret: number > HIGHEST_NUMBERED,
    alwaysFoil,
    hasReverse: reverseNumbers.has(number),
    // Preenchidos em tempo de execucao pela API oficial (ver js/enrich.js).
    text: null,
    image: null,
  };
};

const list = [];
for (let n = 1; n <= TOTAL_PRINTED; n += 1) {
  const card = cards.get(n);
  if (card) { list.push(build(card)); continue; }
  if (n > HIGHEST_NUMBERED) continue; // buracos acima de 191 nao existem
  // O checklist de origem omite alguns numeros; criamos o espaco para que o
  // binder fique completo e o nome seja resolvido pela API no primeiro acesso.
  list.push({
    ...build({ number: n, name: `Carta #${String(n).padStart(3, '0')}`, rarity: 'U' }),
    unresolved: true,
  });
}

const set = {
  id: 'sv08',
  apiId: 'sv8',
  code: 'SSP',
  name: 'Surging Sparks',
  series: 'Scarlet & Violet',
  releaseDate: '2024-11-08',
  printedTotal: HIGHEST_NUMBERED,
  total: TOTAL_PRINTED,
  reverseHoloCount: reverseNumbers.size,
  links: {
    pkmncards: 'https://pkmncards.com/set/surging-sparks/',
    watchtower: 'https://tcgwatchtower.com/pokemon/sets/scarlet-violet/surging-sparks/cards',
    ligapokemon: 'https://www.ligapokemon.com.br/?view=cards/card&card=Surging%20Sparks',
  },
  cards: list,
};

writeFileSync(OUT, `${JSON.stringify(set, null, 2)}\n`);

const unresolved = list.filter((c) => c.unresolved).length;
console.log(`${OUT}: ${list.length} cartas, ${reverseNumbers.size} com reverse holo, ${unresolved} a resolver pela API.`);
