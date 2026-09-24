// Lógica pura do jogo: nada aqui toca no DOM, para poder testar no Node.
// O estado é um objeto serializável; as funções que o alteram o mutam no lugar.
(() => {
  const G = (globalThis.IdleGame ??= {});
  const B = () => G.BALANCO;
  const def = (pid) => G.PERSONAGENS[pid];

  // ---------- Estado ----------

  function estadoPersonagem(d) {
    const estagios = {};
    const guardaRoupa = {};
    for (const t of G.TRILHAS) {
      estagios[t] = {};
      for (const s of d.trilhas[t].subtrilhas) estagios[t][s.id] = 0;
    }
    for (const s of d.trilhas.estilo.subtrilhas) guardaRoupa[s.id] = { max: 0, exibido: null };
    return {
      desbloqueada: true,
      estagios, // índice 0..4 (marco = índice × 25)
      traco: null,
      resets: 0,
      bonusPermanente: 0, // %
      moedaAcumuladaTotal: 0, // moeda investida nesta personagem desde o último reset
      afinidade: 0,
      capitulo: 1,
      respostas: {},
      contagemTags: { acolhedor: 0, brincalhao: 0, frio: 0 },
      boostAtivo: false,
      guardaRoupa,
      mensagens: [], // { id, em }
      mensagensLidas: 0,
    };
  }

  G.criarEstado = (agora = Date.now()) => {
    const personagens = {};
    for (const d of Object.values(G.PERSONAGENS)) personagens[d.id] = estadoPersonagem(d);
    return {
      versao: 1,
      moeda: 0,
      moedaTotalGanha: 0,
      foco: Object.keys(G.PERSONAGENS)[0],
      ultimoTick: agora,
      personagens,
    };
  };

  // Completa um save antigo com campos novos (ex.: sub-trilha adicionada nos dados).
  G.migrarEstado = (salvo) => {
    const base = G.criarEstado(salvo.ultimoTick ?? Date.now());
    const estado = { ...base, ...salvo, personagens: {} };
    for (const [pid, novo] of Object.entries(base.personagens)) {
      const velho = salvo.personagens?.[pid] ?? {};
      const p = { ...novo, ...velho };
      for (const t of G.TRILHAS) p.estagios[t] = { ...novo.estagios[t], ...velho.estagios?.[t] };
      p.guardaRoupa = { ...novo.guardaRoupa, ...velho.guardaRoupa };
      p.contagemTags = { ...novo.contagemTags, ...velho.contagemTags };
      estado.personagens[pid] = p;
    }
    if (!estado.personagens[estado.foco]) estado.foco = base.foco;
    return estado;
  };

  // ---------- Progresso ----------

  G.marco = (idx) => G.MARCOS[idx];

  G.nivelTrilha = (estado, pid, trilhaId) => {
    const valores = Object.values(estado.personagens[pid].estagios[trilhaId]);
    return valores.reduce((a, i) => a + G.MARCOS[i], 0) / valores.length;
  };

  G.progressoGeral = (estado, pid) =>
    G.TRILHAS.reduce((a, t) => a + G.nivelTrilha(estado, pid, t), 0) / G.TRILHAS.length;

  // ---------- Custos ----------

  function multCustoTraco(estado, pid, trilhaId) {
    const traco = tracoAtual(estado, pid);
    if (traco?.efeito.tipo === 'custoTrilha' && traco.efeito.trilha === trilhaId) return traco.efeito.mult;
    return 1;
  }

  function tracoAtual(estado, pid) {
    const id = estado.personagens[pid].traco;
    return id ? def(pid).tracos.find((t) => t.id === id) : null;
  }
  G.tracoAtual = tracoAtual;

  G.subtrilhaDef = (pid, trilhaId, subId) => def(pid).trilhas[trilhaId].subtrilhas.find((s) => s.id === subId);

  G.custoProximo = (estado, pid, trilhaId, subId) => {
    const idx = estado.personagens[pid].estagios[trilhaId][subId];
    if (idx >= G.MARCOS.length - 1) return null;
    const estagio = G.subtrilhaDef(pid, trilhaId, subId).estagios[idx + 1];
    return Math.ceil(estagio.custo * multCustoTraco(estado, pid, trilhaId));
  };

  // { ok, custo, motivo } — motivo explica por que não dá para comprar.
  G.podeComprar = (estado, pid, trilhaId, subId) => {
    const p = estado.personagens[pid];
    const idx = p.estagios[trilhaId][subId];
    const custo = G.custoProximo(estado, pid, trilhaId, subId);
    if (custo === null) return { ok: false, custo: null, motivo: 'max' };
    if (trilhaId === 'intimidade') {
      const req = B().afinidadeIntimidade[idx + 1];
      if (p.afinidade < req) return { ok: false, custo, motivo: 'afinidade', requisito: req };
    }
    if (estado.moeda < custo) return { ok: false, custo, motivo: 'moeda' };
    return { ok: true, custo };
  };

  G.comprar = (estado, pid, trilhaId, subId) => {
    const r = G.podeComprar(estado, pid, trilhaId, subId);
    if (!r.ok) return r;
    const p = estado.personagens[pid];
    estado.moeda -= r.custo;
    p.moedaAcumuladaTotal += r.custo;
    const idx = ++p.estagios[trilhaId][subId];
    if (trilhaId === 'estilo') {
      const gr = p.guardaRoupa[subId];
      gr.max = Math.max(gr.max, idx);
    }
    return { ...r, eventos: G.atualizarPersonagem(estado, pid) };
  };

  // ---------- Renda ----------

  function fatorTrilhas(estado, pid, tipo) {
    const p = estado.personagens[pid];
    let fator = 1;
    for (const t of G.TRILHAS) {
      const peso = B().pesos[t][tipo];
      if (!peso) continue;
      let soma = 0;
      for (const s of def(pid).trilhas[t].subtrilhas) soma += s.estagios[p.estagios[t][s.id]].efeitoPercentual;
      fator *= 1 + (soma / 100) * peso;
    }
    return fator;
  }

  G.multiplicadorSinergia = (estado) => {
    let soma = 0;
    for (const [pid, p] of Object.entries(estado.personagens)) if (p.desbloqueada) soma += G.progressoGeral(estado, pid);
    return 1 + B().sinergiaPorPonto * soma;
  };

  // Multiplicador que vale só para `pid`: reset, boost de resposta, bônus cruzado e traço possessivo.
  G.multiplicadorPersonagem = (estado, pid) => {
    const p = estado.personagens[pid];
    let m = (1 + p.bonusPermanente / 100) * (p.boostAtivo ? 1 + B().boostRespostaAlinhada : 1);
    for (const [outroId, outro] of Object.entries(estado.personagens)) {
      if (outroId === pid || !outro.desbloqueada) continue;
      if (outro.traco) m *= 1 + B().bonusCruzadoTraco;
      const traco = tracoAtual(estado, outroId);
      if (estado.foco === outroId && traco?.efeito.tipo === 'buffRosterEmFoco') m *= traco.efeito.mult;
    }
    return m;
  };

  G.rendaClique = (estado, pid = estado.foco) =>
    B().rendaBaseClique * fatorTrilhas(estado, pid, 'clique') * G.multiplicadorPersonagem(estado, pid) * G.multiplicadorSinergia(estado);

  G.rendaSegundoPersonagem = (estado, pid) =>
    B().rendaBaseSegundo * fatorTrilhas(estado, pid, 'segundo') * G.multiplicadorPersonagem(estado, pid) * G.multiplicadorSinergia(estado);

  G.rendaSegundo = (estado) =>
    Object.entries(estado.personagens).reduce((a, [pid, p]) => a + (p.desbloqueada ? G.rendaSegundoPersonagem(estado, pid) : 0), 0);

  function ganhar(estado, valor) {
    estado.moeda += valor;
    estado.moedaTotalGanha += valor;
  }

  G.clicar = (estado) => {
    const v = G.rendaClique(estado);
    ganhar(estado, v);
    return v;
  };

  G.tick = (estado, agora = Date.now()) => {
    const dt = Math.max(0, (agora - estado.ultimoTick) / 1000);
    estado.ultimoTick = agora;
    const v = G.rendaSegundo(estado) * dt;
    ganhar(estado, v);
    return v;
  };

  // Ganho acumulado enquanto o jogo estava fechado (limitado a offlineMaxSegundos).
  G.aplicarOffline = (estado, agora = Date.now()) => {
    const segundos = Math.min(Math.max(0, (agora - estado.ultimoTick) / 1000), B().offlineMaxSegundos);
    const v = G.rendaSegundo(estado) * segundos;
    ganhar(estado, v);
    estado.ultimoTick = agora;
    return { segundos, valor: v };
  };

  // ---------- História e respostas ----------

  G.capituloDef = (pid, n) => def(pid).capitulos[n - 1];

  G.capituloConcluido = (estado, pid, n) => {
    const c = G.capituloDef(pid, n);
    const p = estado.personagens[pid];
    return !!c && p.capitulo >= n && c.pontos.every((pt) => p.respostas[pt.id]);
  };

  // O que falta para entrar no próximo capítulo (lista vazia = liberado).
  G.requisitosProximoCapitulo = (estado, pid) => {
    const p = estado.personagens[pid];
    const prox = G.capituloDef(pid, p.capitulo + 1);
    if (!prox) return null;
    const faltam = [];
    if (!G.capituloConcluido(estado, pid, p.capitulo)) faltam.push('responder os diálogos do capítulo atual');
    if (G.progressoGeral(estado, pid) < prox.inicio) faltam.push(`progresso geral ${prox.inicio}%`);
    if (p.afinidade < prox.afinidadeMin) faltam.push(`afinidade ${prox.afinidadeMin}`);
    return faltam;
  };

  G.responder = (estado, pid, pontoId, tag) => {
    const p = estado.personagens[pid];
    if (p.respostas[pontoId]) return null;
    const cap = def(pid).capitulos.find((c) => c.pontos.some((pt) => pt.id === pontoId));
    if (!cap || cap.n !== p.capitulo) return null;
    const A = B().afinidade;
    let resultado;
    if (tag === cap.tagAlinhada) {
      resultado = 'alinhada';
      p.boostAtivo = true;
      p.afinidade += A.alinhada;
    } else if (tag === 'frio') {
      resultado = 'desalinhada';
      p.afinidade += A.desalinhada;
    } else {
      resultado = 'neutra';
      p.afinidade += A.neutra;
    }
    p.afinidade = Math.max(0, Math.min(A.max, p.afinidade));
    p.respostas[pontoId] = tag;
    p.contagemTags[tag]++;
    return { resultado, eventos: G.atualizarPersonagem(estado, pid) };
  };

  // Capítulo respondido mas afinidade insuficiente para seguir: o jogador pode
  // refazer os diálogos (resposta desalinhada atrasa, não trava para sempre).
  G.podeRepetirCapitulo = (estado, pid) => {
    const p = estado.personagens[pid];
    const prox = G.capituloDef(pid, p.capitulo + 1);
    return !!prox && G.capituloConcluido(estado, pid, p.capitulo) && p.afinidade < prox.afinidadeMin;
  };

  G.repetirCapitulo = (estado, pid) => {
    if (!G.podeRepetirCapitulo(estado, pid)) return false;
    const p = estado.personagens[pid];
    for (const pt of G.capituloDef(pid, p.capitulo).pontos) delete p.respostas[pt.id];
    return true;
  };

  // ---------- Mídia e celular ----------

  G.tierLiberado = (estado, pid, tier) => {
    const t = G.TIERS_MIDIA.find((x) => x.tier === tier);
    const p = estado.personagens[pid];
    if (p.afinidade < (t.afinidadeMin ?? 0)) return false;
    if (t.marco !== undefined && G.marco(p.estagios.intimidade.midia) < t.marco) return false;
    if (t.capituloConcluido && !G.capituloConcluido(estado, pid, t.capituloConcluido)) return false;
    if (t.resetDisponivel && !G.resetDisponivel(estado, pid)) return false;
    return true;
  };

  function gatilhoAtendido(estado, pid, g) {
    if (g.tipo === 'progresso') return G.progressoGeral(estado, pid) >= g.min;
    if (g.tipo === 'tierMidia') return G.tierLiberado(estado, pid, g.tier);
    if (g.tipo === 'capitulo') return estado.personagens[pid].capitulo >= g.n;
    return false;
  }

  // Avança capítulos e entrega mensagens pendentes. Retorna eventos para a UI.
  G.atualizarPersonagem = (estado, pid, agora = Date.now()) => {
    const p = estado.personagens[pid];
    const eventos = [];
    while (G.requisitosProximoCapitulo(estado, pid)?.length === 0) {
      p.capitulo++;
      p.boostAtivo = false; // o boost de resposta dura até o próximo capítulo
      eventos.push({ tipo: 'capitulo', n: p.capitulo });
    }
    const recebidas = new Set(p.mensagens.map((m) => m.id));
    for (const m of def(pid).mensagens) {
      if (!recebidas.has(m.id) && gatilhoAtendido(estado, pid, m.gatilho)) {
        p.mensagens.push({ id: m.id, em: agora });
        eventos.push({ tipo: 'mensagem', id: m.id });
      }
    }
    return eventos;
  };

  // ---------- Reset e traços ----------

  G.resetDisponivel = (estado, pid) =>
    estado.personagens[pid].capitulo >= def(pid).capitulos.length && G.progressoGeral(estado, pid) >= B().progressoMinReset;

  G.bonusDoReset = (estado, pid) => Math.sqrt(estado.personagens[pid].moedaAcumuladaTotal / B().constanteReset);

  // Traço recomendado pelo padrão de respostas acumulado (seção 9.1: influenciado, não sorteado).
  G.tracoSugerido = (estado, pid) => {
    const c = estado.personagens[pid].contagemTags;
    const tag = Object.keys(c).reduce((a, b) => (c[b] > c[a] ? b : a));
    return def(pid).tracos.find((t) => t.tagAfim === tag) ?? def(pid).tracos[0];
  };

  G.resetar = (estado, pid, tracoId) => {
    if (!G.resetDisponivel(estado, pid)) return false;
    if (!def(pid).tracos.some((t) => t.id === tracoId)) return false;
    const p = estado.personagens[pid];
    const novo = estadoPersonagem(def(pid));
    Object.assign(p, {
      estagios: novo.estagios,
      bonusPermanente: p.bonusPermanente + G.bonusDoReset(estado, pid),
      moedaAcumuladaTotal: 0,
      afinidade: 0,
      capitulo: 1,
      respostas: {},
      contagemTags: novo.contagemTags,
      boostAtivo: false,
      traco: tracoId,
      resets: p.resets + 1,
      // guardaRoupa e mensagens são permanentes
    });
    return true;
  };

  // ---------- Guarda-roupa ----------

  // Estágio exibido de uma sub-trilha de Estilo (pode ser diferente do alcançado).
  G.estagioVisual = (estado, pid, subId) => {
    const p = estado.personagens[pid];
    return p.guardaRoupa[subId]?.exibido ?? p.estagios.estilo[subId];
  };

  G.escolherVisual = (estado, pid, subId, idx) => {
    const gr = estado.personagens[pid].guardaRoupa[subId];
    if (idx !== null && (idx < 0 || idx > gr.max)) return false;
    gr.exibido = idx;
    return true;
  };
})();
