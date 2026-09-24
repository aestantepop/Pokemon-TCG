// Constantes de balanceamento e regras genéricas (valem para qualquer personagem).
// Scripts clássicos (sem import/export) para o jogo abrir com dois cliques via file://.
(() => {
  const G = (globalThis.IdleGame ??= {});

  G.TRILHAS = ['ambiente', 'equipamento', 'estilo', 'habilidade', 'intimidade'];
  G.MARCOS = [0, 25, 50, 75, 100];

  G.TAGS = {
    acolhedor: 'Acolhedor',
    brincalhao: 'Neutro/Brincalhão',
    frio: 'Frio/Distante',
  };

  G.BALANCO = {
    // custo = custoBase × custoMultiplicador^índiceEstágio (seção 3)
    custoMultiplicador: 1.25,
    // custoBase da k-ésima sub-trilha = custoBase da trilha × escalaSubtrilha^k
    escalaSubtrilha: 4,
    // % de bônus de cada índice de estágio (0..4)
    efeitoPorEstagio: [0, 20, 50, 100, 200],
    rendaBaseClique: 1,
    rendaBaseSegundo: 1,
    // Quanto cada trilha pesa em R$/clique e R$/segundo.
    // Dentro de uma trilha os % somam; entre trilhas, multiplicam.
    pesos: {
      ambiente: { clique: 1, segundo: 0.25 },
      estilo: { clique: 1, segundo: 0.25 },
      equipamento: { clique: 0.25, segundo: 1 },
      habilidade: { clique: 0.25, segundo: 1 },
      intimidade: { clique: 0, segundo: 0 },
    },
    // bônusPermanente (%) = √(moedaAcumuladaTotal / constanteReset)
    constanteReset: 1000,
    progressoMinReset: 85,
    // multiplicador global = 1 + sinergiaPorPonto × Σ progresso geral (0–100) do roster
    sinergiaPorPonto: 0.002,
    // cada outra personagem com traço dá +1%
    bonusCruzadoTraco: 0.01,
    boostRespostaAlinhada: 0.15,
    afinidade: { max: 100, alinhada: 10, neutra: 3, desalinhada: -5 },
    // Afinidade mínima para comprar cada índice de estágio da trilha Intimidade
    afinidadeIntimidade: [0, 10, 25, 45, 70],
    offlineMaxSegundos: 8 * 3600,
  };

  // Tiers de mídia (seção 9.3). Todos exigem marco E afinidade, para evitar "rush".
  // `marco` refere-se à sub-trilha intimidade.midia.
  G.TIERS_MIDIA = [
    { tier: 1, nome: 'Fofo/Cotidiano', marco: 25, afinidadeMin: 0 },
    { tier: 2, nome: 'Descontraído/Pessoal', marco: 50, afinidadeMin: 25 },
    { tier: 3, nome: 'Confiante/Provocante', marco: 75, afinidadeMin: 45, capituloConcluido: 5 },
    { tier: 4, nome: 'Intimista', marco: 100, afinidadeMin: 70, capituloConcluido: 6 },
    { tier: 5, nome: 'Final', resetDisponivel: true, afinidadeMin: 100 },
  ];
})();
