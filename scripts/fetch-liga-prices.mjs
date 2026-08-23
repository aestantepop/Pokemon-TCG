#!/usr/bin/env node
/**
 * Gera data/prices-liga.json com os precos do Liga Pokemon.
 *
 * Por que existe: o Liga Pokemon nao publica API e nao envia cabecalhos CORS,
 * entao o navegador nao consegue ler os precos de dentro do app. Este script
 * roda no seu computador, le as paginas e grava um arquivo que o app carrega.
 *
 *   node scripts/fetch-liga-prices.mjs sv08
 *   node scripts/fetch-liga-prices.mjs sv08 --limit 20        # testar rapido
 *   node scripts/fetch-liga-prices.mjs sv08 --debug 57        # ver o HTML de uma carta
 *   node scripts/fetch-liga-prices.mjs sv08 --from-csv precos.csv
 *
 * O formato de --from-csv e: numero,normal,reverse
 * (use quando preferir preencher os precos a mao ou vier de outra fonte).
 *
 * Aviso: o layout do site muda de tempos em tempos. Se a extracao parar de
 * funcionar, rode com --debug NUMERO para ver o HTML recebido e ajuste
 * PRICE_PATTERNS abaixo.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const setId = args.find((a) => !a.startsWith('--')) ?? 'sv08';
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : (args[i + 1] ?? true);
};

const OUT = resolve(root, 'data/prices-liga.json');
const DELAY_MS = Number(flag('delay') ?? 900);
const LIMIT = Number(flag('limit') ?? Infinity);
const DEBUG_NUMBER = flag('debug') ? Number(flag('debug')) : null;
const FROM_CSV = flag('from-csv');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/** "R$ 1.234,56" -> 1234.56 */
const parseBRL = (text) => {
  const cleaned = text.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) && value > 0 ? value : null;
};

/**
 * Estrategias de extracao, da mais especifica para a mais generica.
 * A primeira que casar vence.
 */
const PRICE_PATTERNS = [
  /menor\s*pre[cç]o[^R]{0,120}R\$\s*([\d.,]+)/i,
  /class="[^"]*\bpreco\b[^"]*"[^>]*>\s*R\$\s*([\d.,]+)/i,
  /data-price="([\d.,]+)"/i,
  /R\$\s*([\d.,]+)/,
];

function extractPrice(html) {
  for (const pattern of PRICE_PATTERNS) {
    const match = html.match(pattern);
    if (match) {
      const value = parseBRL(match[1]);
      if (value) return value;
    }
  }
  return null;
}

const cardUrl = (name, code, extra = '') =>
  `https://www.ligapokemon.com.br/?view=cards/card&card=${encodeURIComponent(`${name} (${code})`)}${extra}`;

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function loadSet() {
  const catalog = JSON.parse(readFileSync(resolve(root, 'data/sets.json'), 'utf8'));
  const meta = catalog.series.flatMap((s) => s.sets).find((s) => s.id === setId);
  if (!meta) throw new Error(`Set "${setId}" nao esta em data/sets.json`);
  return JSON.parse(readFileSync(resolve(root, meta.data), 'utf8'));
}

function readExisting() {
  try {
    return JSON.parse(readFileSync(OUT, 'utf8'));
  } catch {
    return { source: 'ligapokemon.com.br', currency: 'BRL', sets: {} };
  }
}

function save(payload) {
  payload.generatedAt = new Date().toISOString();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
}

async function main() {
  const set = loadSet();
  const payload = readExisting();
  const bucket = payload.sets[set.id] ?? (payload.sets[set.id] = {});

  if (FROM_CSV) {
    const rows = readFileSync(resolve(process.cwd(), FROM_CSV), 'utf8').split(/\r?\n/);
    let count = 0;
    for (const row of rows) {
      const [num, normal, reverse] = row.split(',').map((v) => v?.trim());
      const number = Number.parseInt(num, 10);
      if (!Number.isFinite(number)) continue;
      const card = set.cards.find((c) => c.number === number);
      const record = bucket[number] ?? (bucket[number] = {});
      if (normal) record.n = parseBRL(normal);
      if (reverse) record.r = parseBRL(reverse);
      if (card?.alwaysFoil && record.n != null) { record.f = record.n; delete record.n; }
      if (card) record.url = cardUrl(card.name, set.code);
      count += 1;
    }
    save(payload);
    console.log(`${count} precos importados de ${FROM_CSV} para ${OUT}`);
    return;
  }

  if (DEBUG_NUMBER != null) {
    const card = set.cards.find((c) => c.number === DEBUG_NUMBER);
    if (!card) throw new Error(`Carta #${DEBUG_NUMBER} nao existe em ${set.name}`);
    const url = cardUrl(card.name, set.code);
    console.log(`GET ${url}`);
    const html = await fetchHtml(url);
    const debugFile = resolve(root, `liga-debug-${DEBUG_NUMBER}.html`);
    writeFileSync(debugFile, html);
    console.log(`HTML salvo em ${debugFile} (${html.length} bytes)`);
    console.log('Preco extraido:', extractPrice(html));
    return;
  }

  const targets = set.cards.slice(0, LIMIT === Infinity ? undefined : LIMIT);
  let ok = 0;
  let failed = 0;

  for (const [index, card] of targets.entries()) {
    if (card.unresolved) continue;
    const url = cardUrl(card.name, set.code);
    try {
      const html = await fetchHtml(url);
      const price = extractPrice(html);
      if (price == null) {
        failed += 1;
        process.stderr.write(`  sem preco: ${card.display} ${card.name}\n`);
      } else {
        const record = bucket[card.number] ?? (bucket[card.number] = {});
        record[card.alwaysFoil ? 'f' : 'n'] = price;
        record.url = url;
        ok += 1;
      }
    } catch (err) {
      failed += 1;
      process.stderr.write(`  erro em ${card.display} ${card.name}: ${err.message}\n`);
    }

    if ((index + 1) % 10 === 0) {
      save(payload); // salva parcial: da para interromper e retomar
      process.stdout.write(`${index + 1}/${targets.length} (ok ${ok}, falhas ${failed})\n`);
    }
    await sleep(DELAY_MS);
  }

  save(payload);
  console.log(`Pronto: ${ok} precos gravados, ${failed} falhas -> ${OUT}`);
  if (ok === 0) {
    console.log('Nenhum preco extraido. Rode com --debug NUMERO e ajuste PRICE_PATTERNS neste arquivo.');
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
