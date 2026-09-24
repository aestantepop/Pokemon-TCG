// Ponto de entrada: carrega o save, aplica ganho offline e roda o loop.
(() => {
  const G = globalThis.IdleGame;

  let estado = G.carregar();
  const offline = estado ? G.aplicarOffline(estado) : null;
  estado ??= G.criarEstado();

  G.substituirEstado = (novo) => {
    estado = novo;
    G.definirEstadoUI(novo);
  };

  G.iniciarUI(estado);
  if (offline && offline.segundos > 60) {
    G.toast(`Enquanto você estava fora: +R$ ${G.fmt(offline.valor)}`);
  }

  setInterval(() => {
    G.tick(estado);
    G.atualizarVivo();
  }, 200);

  setInterval(() => G.salvar(estado), 5000);
  const salvarAgora = () => G.salvar(estado);
  document.addEventListener('visibilitychange', salvarAgora);
  window.addEventListener('pagehide', salvarAgora);
})();
