/**
 * Precos das cartas.
 *
 * Preferencia: data/prices-liga.json, gerado na maquina do usuario por
 * scripts/fetch-liga-prices.mjs (o Liga Pokemon nao tem API publica e bloqueia
 * chamadas diretas do navegador por CORS, entao a coleta roda fora do app).
 * Sem esse arquivo, cai para o preco de mercado do TCGplayer que vem junto com
 * os dados da API, convertido para real e marcado como estimado.
 */

import { getSettings } from './store.js';
import { loadJson } from './load-json.js';

const LIGA_BASE = 'https://www.ligapokemon.com.br/?view=cards/card&card=';

let ligaPrices = null;

/** Carrega o arquivo local de precos, se ele existir. */
export async function loadLigaPrices() {
  try {
    ligaPrices = await loadJson('data/prices-liga.json');
    return ligaPrices;
  } catch {
    ligaPrices = null; // arquivo ausente e o caso normal: caimos na estimativa
    return null;
  }
}

export function ligaGeneratedAt() {
  return ligaPrices?.generatedAt ?? null;
}

/** Link para a pagina da carta no Liga Pokemon. */
export function ligaUrl(card, set) {
  const fromFile = ligaPrices?.sets?.[set.id]?.[card.number]?.url;
  if (fromFile) return fromFile;
  return LIGA_BASE + encodeURIComponent(`${card.name} (${set.code})`);
}

/** Chave de preco do TCGplayer correspondente a variante do binder. */
function tcgKeyFor(card, variant) {
  if (variant === 'r') return ['reverseHolofoil'];
  if (variant === 'f') return ['holofoil', 'normal', 'reverseHolofoil'];
  return ['normal', 'holofoil'];
}

function tcgMarket(card, variant) {
  if (!card.usd) return null;
  for (const key of tcgKeyFor(card, variant)) {
    const bucket = card.usd[key];
    const value = bucket?.market ?? bucket?.mid ?? bucket?.low;
    if (typeof value === 'number' && value > 0) return value;
  }
  return null;
}

/**
 * Preco de uma variante da carta.
 * @returns {{value: number, currency: 'BRL', source: 'liga'|'estimado'}|null}
 */
export function priceOf(card, set, variant) {
  const liga = ligaPrices?.sets?.[set.id]?.[card.number];
  const fromLiga = liga?.[variant] ?? (variant === 'f' ? liga?.n : null);
  if (typeof fromLiga === 'number' && fromLiga > 0) {
    return { value: fromLiga, currency: 'BRL', source: 'liga' };
  }
  const usd = tcgMarket(card, variant);
  if (usd == null) return null;
  return { value: usd * (getSettings().usdRate || 0), currency: 'BRL', source: 'estimado' };
}

/** Preco de referencia da carta: o da variante mais barata disponivel. */
export function basePrice(card, set, variants) {
  const found = variants.map((v) => priceOf(card, set, v.key)).filter(Boolean);
  if (found.length === 0) return null;
  return found.reduce((a, b) => (a.value <= b.value ? a : b));
}

export const formatBRL = (value) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
