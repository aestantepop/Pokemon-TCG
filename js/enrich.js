/**
 * Completa os dados do set com a API publica do Pokemon TCG.
 *
 * O checklist local traz numero, nome e raridade; a API traz tipo, texto da
 * carta e a imagem oficial. A busca acontece no navegador (o app e estatico) e
 * o resultado fica em cache no localStorage, entao so a primeira visita precisa
 * de internet. As imagens vem de images.pokemontcg.io e funcionam mesmo se a
 * chamada de metadados falhar.
 */

const API = 'https://api.pokemontcg.io/v2/cards';
const IMAGES = 'https://images.pokemontcg.io';
const CACHE_PREFIX = 'binder.cards.v1.';
const CACHE_TTL = 1000 * 60 * 60 * 24 * 30; // 30 dias

/** Raridade da API -> codigo curto usado no checklist. */
const RARITY_CODES = {
  'Common': 'C',
  'Uncommon': 'U',
  'Rare': 'R',
  'Double Rare': 'DR',
  'Illustration Rare': 'IR',
  'Ultra Rare': 'UR',
  'Special Illustration Rare': 'SIR',
  'Hyper Rare': 'HR',
  'Rare Holo': 'R',
  'Shiny Rare': 'IR',
  'Shiny Ultra Rare': 'SIR',
};

export const imageUrl = (apiId, number, size = 'small') =>
  `${IMAGES}/${apiId}/${number}${size === 'large' ? '_hires' : ''}.png`;

function readCache(setId) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + setId);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached?.fetchedAt || Date.now() - cached.fetchedAt > CACHE_TTL) return null;
    return cached;
  } catch {
    return null;
  }
}

function writeCache(setId, byNumber) {
  try {
    localStorage.setItem(CACHE_PREFIX + setId, JSON.stringify({ fetchedAt: Date.now(), byNumber }));
  } catch (err) {
    console.warn('Cache de cartas nao pode ser gravado', err);
  }
}

export function clearCache(setId) {
  localStorage.removeItem(CACHE_PREFIX + setId);
}

/** Junta tudo que serve de "descricao" da carta num texto unico pesquisavel. */
function describe(apiCard) {
  const parts = [];
  if (apiCard.flavorText) parts.push(apiCard.flavorText);
  for (const ability of apiCard.abilities ?? []) parts.push(`${ability.name}. ${ability.text ?? ''}`);
  for (const attack of apiCard.attacks ?? []) parts.push(`${attack.name}. ${attack.text ?? ''}`);
  for (const rule of apiCard.rules ?? []) parts.push(rule);
  return parts.join(' ').trim() || null;
}

async function fetchPage(apiId, page) {
  const url = `${API}?q=set.id:${encodeURIComponent(apiId)}&page=${page}&pageSize=250` +
    '&select=id,name,number,rarity,supertype,subtypes,types,flavorText,abilities,attacks,rules,images,tcgplayer,cardmarket';
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`API respondeu ${res.status}`);
  return res.json();
}

/** Busca todas as cartas do set na API e devolve um mapa numero -> dados. */
async function fetchSet(apiId) {
  const byNumber = {};
  for (let page = 1; page <= 4; page += 1) {
    const body = await fetchPage(apiId, page);
    const items = body?.data ?? [];
    for (const apiCard of items) {
      const number = Number.parseInt(apiCard.number, 10);
      if (!Number.isFinite(number)) continue;
      byNumber[number] = {
        name: apiCard.name,
        rarity: RARITY_CODES[apiCard.rarity] ?? null,
        rarityFull: apiCard.rarity ?? null,
        supertype: apiCard.supertype ?? null,
        subtypes: apiCard.subtypes ?? [],
        type: apiCard.types?.[0] ?? null,
        text: describe(apiCard),
        image: apiCard.images?.small ?? null,
        imageLarge: apiCard.images?.large ?? null,
        usd: apiCard.tcgplayer?.prices ?? null,
        eur: apiCard.cardmarket?.prices ?? null,
      };
    }
    if (items.length < 250) break;
  }
  if (Object.keys(byNumber).length === 0) throw new Error('A API nao devolveu cartas para este set.');
  return byNumber;
}

/**
 * Aplica os dados extras sobre as cartas do checklist, no lugar.
 * O checklist manda no numero e na existencia do slot; a API manda no resto.
 */
function apply(cards, byNumber, apiId) {
  for (const card of cards) {
    const extra = byNumber[card.number];
    card.image ??= imageUrl(apiId, card.number, 'small');
    card.imageLarge ??= imageUrl(apiId, card.number, 'large');
    if (!extra) continue;

    if (card.unresolved && extra.name) {
      card.name = extra.name;
      card.unresolved = false;
    }
    if (extra.rarity && card.unresolved !== true) card.rarity ??= extra.rarity;
    if (extra.type) card.type = extra.type;
    if (extra.supertype) card.supertype = extra.supertype;
    if (extra.rarityFull) card.rarityFull = extra.rarityFull;
    card.subtypes = extra.subtypes;
    card.text = extra.text;
    card.usd = extra.usd;
    card.eur = extra.eur;
    if (extra.image) card.image = extra.image;
    if (extra.imageLarge) card.imageLarge = extra.imageLarge;
  }
}

/**
 * Completa `set.cards`. Usa o cache quando existe; se nao houver internet o app
 * segue funcionando com o checklist local e as imagens diretas.
 *
 * @returns {Promise<{source: 'cache'|'network'|'offline', error?: Error}>}
 */
export async function enrich(set, { force = false } = {}) {
  const apiId = set.apiId;
  if (!force) {
    const cached = readCache(set.id);
    if (cached) {
      apply(set.cards, cached.byNumber, apiId);
      return { source: 'cache' };
    }
  }
  try {
    const byNumber = await fetchSet(apiId);
    writeCache(set.id, byNumber);
    apply(set.cards, byNumber, apiId);
    return { source: 'network' };
  } catch (error) {
    apply(set.cards, {}, apiId);
    return { source: 'offline', error };
  }
}
