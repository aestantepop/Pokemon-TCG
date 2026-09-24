// Persistência no localStorage do navegador.
(() => {
  const G = (globalThis.IdleGame ??= {});
  const CHAVE = 'idle-game-save-v1';

  G.carregar = () => {
    try {
      const bruto = localStorage.getItem(CHAVE);
      if (bruto) return G.migrarEstado(JSON.parse(bruto));
    } catch (err) {
      console.warn('Save inválido, começando do zero.', err);
    }
    return null;
  };

  G.salvar = (estado) => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch (err) {
      console.warn('Não foi possível salvar.', err);
    }
  };

  G.apagarSave = () => {
    try {
      localStorage.removeItem(CHAVE);
    } catch {
      // armazenamento indisponível: nada a apagar
    }
  };
})();
