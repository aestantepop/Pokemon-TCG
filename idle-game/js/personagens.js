// Registro de personagens: expande a definição compacta de cada arquivo em data/
// para a estrutura do design doc (Personagem → SubTrilha → Estagio).
(() => {
  const G = (globalThis.IdleGame ??= {});

  G.PERSONAGENS = {};

  G.registrarPersonagem = (def) => {
    const B = G.BALANCO;
    const trilhas = {};
    for (const trilhaId of G.TRILHAS) {
      const t = def.trilhas[trilhaId];
      trilhas[trilhaId] = {
        id: trilhaId,
        nome: t.nome,
        subtrilhas: t.subtrilhas.map(([id, nome, nomesVisuais], k) => {
          const custoBase = Math.round(t.custoBase * B.escalaSubtrilha ** k);
          return {
            id,
            nome,
            custoBase,
            estagios: G.MARCOS.map((marco, i) => ({
              marco,
              nomeVisual: nomesVisuais[i],
              custo: Math.round(custoBase * B.custoMultiplicador ** i),
              efeitoPercentual: trilhaId === 'intimidade' ? 0 : B.efeitoPorEstagio[i],
            })),
          };
        }),
      };
    }

    const capitulos = def.capitulos.map((c, i) => {
      const n = i + 1;
      const pontos = [];
      for (let p = 1; p <= c.pontos; p++) {
        const id = `c${n}p${p}`;
        const txt = def.textos[id] ?? {};
        pontos.push({
          id,
          fala: txt.fala ?? null,
          opcoes: Object.keys(G.TAGS).map((tag) => ({ tag, texto: txt[tag] ?? null })),
        });
      }
      return { ...c, n, pontos };
    });

    G.PERSONAGENS[def.id] = { ...def, trilhas, capitulos };
  };
})();
