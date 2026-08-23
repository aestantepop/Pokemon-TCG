/**
 * Estado da colecao, persistido em localStorage.
 *
 * Formato: { [setId]: { [numero]: { n, r, f } } }
 *   n = copias normais       (raridades C / U / R)
 *   r = copias reverse holo  (so quando a carta tem impressao RH)
 *   f = copias foil          (DR / IR / UR / SIR / HR, que ja saem foil)
 * Chaves com valor zero sao removidas para o backup ficar enxuto.
 */

const KEY = 'binder.collection.v1';
const SETTINGS_KEY = 'binder.settings.v1';

const listeners = new Set();

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

let collection = readJson(KEY, {});
let settings = { usdRate: 5.4, ...readJson(SETTINGS_KEY, {}) };

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(collection));
  } catch (err) {
    console.warn('Nao foi possivel salvar a colecao', err);
  }
}

function emit() {
  for (const fn of listeners) fn();
}

/** Variantes que a carta pode ter, na ordem em que aparecem na interface. */
export function variantsOf(card) {
  if (card.alwaysFoil) return [{ key: 'f', label: 'Foil', foil: true }];
  const out = [{ key: 'n', label: 'Normal', foil: false }];
  if (card.hasReverse) out.push({ key: 'r', label: 'Reverse', foil: true });
  return out;
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function entry(setId, number) {
  return collection[setId]?.[number] ?? {};
}

export function qty(setId, number, variant) {
  return entry(setId, number)[variant] ?? 0;
}

/** Total de copias da carta somando todas as variantes. */
export function totalQty(setId, number) {
  const e = entry(setId, number);
  return (e.n ?? 0) + (e.r ?? 0) + (e.f ?? 0);
}

export function hasCard(setId, number) {
  return totalQty(setId, number) > 0;
}

/** A carta esta representada por alguma copia foil (reverse ou foil)? */
export function hasFoil(setId, number) {
  const e = entry(setId, number);
  return (e.r ?? 0) > 0 || (e.f ?? 0) > 0;
}

export function setQty(setId, number, variant, value) {
  const next = Math.max(0, Math.min(99, Math.round(value) || 0));
  const set = collection[setId] ?? (collection[setId] = {});
  const card = set[number] ?? (set[number] = {});
  if (next === 0) delete card[variant];
  else card[variant] = next;
  if (Object.keys(card).length === 0) delete set[number];
  if (Object.keys(set).length === 0) delete collection[setId];
  persist();
  emit();
}

export function bump(setId, number, variant, delta) {
  setQty(setId, number, variant, qty(setId, number, variant) + delta);
}

export function resetSet(setId) {
  delete collection[setId];
  persist();
  emit();
}

export function exportBackup() {
  return JSON.stringify(
    { app: 'binder', version: 1, exportedAt: new Date().toISOString(), collection, settings },
    null,
    2,
  );
}

/** Importa um backup. `merge` soma as quantidades em vez de substituir. */
export function importBackup(json, { merge = false } = {}) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  const incoming = data?.collection;
  if (!incoming || typeof incoming !== 'object') throw new Error('Backup invalido: falta "collection".');

  if (!merge) {
    collection = incoming;
  } else {
    for (const [setId, cards] of Object.entries(incoming)) {
      const target = collection[setId] ?? (collection[setId] = {});
      for (const [number, variants] of Object.entries(cards)) {
        const slot = target[number] ?? (target[number] = {});
        for (const [variant, value] of Object.entries(variants)) {
          slot[variant] = Math.min(99, (slot[variant] ?? 0) + (Number(value) || 0));
        }
      }
    }
  }
  if (data.settings) updateSettings(data.settings);
  persist();
  emit();
}

export function getSettings() {
  return { ...settings };
}

export function updateSettings(patch) {
  settings = { ...settings, ...patch };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* cota cheia: as configuracoes nao sao criticas */ }
  emit();
}

/** Resumo de progresso do set, contando slots de binder (carta + reverse). */
export function progress(cards, setId) {
  let slots = 0;
  let filled = 0;
  let copies = 0;
  for (const card of cards) {
    for (const v of variantsOf(card)) {
      slots += 1;
      const q = qty(setId, card.number, v.key);
      if (q > 0) filled += 1;
      copies += q;
    }
  }
  return { slots, filled, copies, pct: slots ? (filled / slots) * 100 : 0 };
}
