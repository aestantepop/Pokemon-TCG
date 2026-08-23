/** Rotulos em portugues compartilhados entre a tela e a impressao. */

export const TYPE_LABELS = {
  Grass: 'Planta', Fire: 'Fogo', Water: 'Água', Lightning: 'Elétrico',
  Psychic: 'Psíquico', Fighting: 'Lutador', Darkness: 'Sombrio', Metal: 'Metálico',
  Dragon: 'Dragão', Colorless: 'Incolor', Fairy: 'Fada',
  Trainer: 'Treinador', Energy: 'Energia',
};

/** Ordem de raridade do mais comum para o mais raro. */
export const RARITY_ORDER = ['C', 'U', 'R', 'DR', 'IR', 'UR', 'SIR', 'HR'];

export const typeLabel = (type) => TYPE_LABELS[type] ?? type ?? '—';
