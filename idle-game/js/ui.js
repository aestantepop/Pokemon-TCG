// Interface: renderiza as telas a partir do estado e traduz toques em chamadas da engine.
(() => {
  const G = (globalThis.IdleGame ??= {});

  const ABAS = [
    { id: 'personagem', icone: '★', nome: 'Personagem' },
    { id: 'trilhas', icone: '▲', nome: 'Trilhas' },
    { id: 'historia', icone: '❝', nome: 'História' },
    { id: 'celular', icone: '✉', nome: 'Celular' },
    { id: 'guarda', icone: '◈', nome: 'Visual' },
    { id: 'roster', icone: '♥', nome: 'Roster' },
  ];

  const ui = { aba: 'personagem', trilha: 'ambiente' };
  let estado;
  let $tela, $abas, $toasts;

  // ---------- Utilidades ----------

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  const SUFIXOS = ['', 'mil', 'mi', 'bi', 'tri', 'qua', 'qui', 'sx', 'sp'];
  G.fmt = (n) => {
    if (!Number.isFinite(n)) return '∞';
    if (n < 1000) return n.toLocaleString('pt-BR', { maximumFractionDigits: n < 10 ? 1 : 0 });
    const e = Math.min(Math.floor(Math.log10(n) / 3), SUFIXOS.length - 1);
    return `${(n / 1000 ** e).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${SUFIXOS[e]}`;
  };
  const rs = (n) => `R$ ${G.fmt(n)}`;
  const pct = (n) => `${Math.floor(n)}%`;

  const hue = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

  // Placeholder (ou imagem, se houver asset) de uma camada visual.
  function camada(pid, trilha, subId, idx, classe) {
    const sub = G.subtrilhaDef(pid, trilha, subId);
    const marco = G.marco(idx);
    const src = G.asset(`${pid}.${trilha}.${subId}.${marco}`);
    const legenda = `${sub.nome} — estágio ${marco}`; // formato do design doc (seção 11)
    if (src) return `<img class="camada ${classe}" src="${esc(src)}" alt="${esc(legenda)}">`;
    return `<div class="camada placeholder ${classe}" style="--hue:${hue(subId)};--nivel:${idx}" title="${esc(`${legenda}: ${sub.estagios[idx].nomeVisual}`)}">
      <b>${esc(sub.nome)}</b><span>estágio ${marco}</span><small>${esc(sub.estagios[idx].nomeVisual)}</small></div>`;
  }

  function barra(valor, max = 100, classe = '') {
    return `<div class="barra ${classe}"><i style="width:${Math.min(100, (valor / max) * 100)}%"></i></div>`;
  }

  function toast(texto) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = texto;
    $toasts.append(el);
    setTimeout(() => el.remove(), 3200);
  }
  G.toast = (t) => toast(t);

  function anunciar(eventos = []) {
    for (const ev of eventos) {
      const pid = estado.foco;
      if (ev.tipo === 'capitulo') toast(`Capítulo ${ev.n}: ${G.capituloDef(pid, ev.n).titulo}`);
      if (ev.tipo === 'mensagem') toast(`Nova mensagem de ${G.PERSONAGENS[pid].nome}`);
    }
  }

  // ---------- Telas ----------

  function telaPersonagem() {
    const pid = estado.foco;
    const d = G.PERSONAGENS[pid];
    const p = estado.personagens[pid];
    const est = (s) => p.estagios.ambiente[s];
    const eq = d.trilhas.equipamento.subtrilhas;
    const traco = G.tracoAtual(estado, pid);
    const vis = (s) => G.estagioVisual(estado, pid, s);

    return `
      <div class="perfil">
        <div>
          <h2>${esc(d.nome)} <span class="tema">${esc(d.tema)}</span></h2>
          <div class="sub">Cap. ${p.capitulo} — ${esc(G.capituloDef(pid, p.capitulo).titulo)}
            ${traco ? `<span class="selo">${esc(traco.nome)}</span>` : ''}
            ${p.boostAtivo ? `<span class="selo boost">+${G.BALANCO.boostRespostaAlinhada * 100}% resposta</span>` : ''}</div>
        </div>
        <div class="progresso-geral"><span>${pct(G.progressoGeral(estado, pid))}</span>${barra(G.progressoGeral(estado, pid))}</div>
      </div>
      <button class="palco" data-acao="clicar" aria-label="Tocar para ganhar">
        ${camada(pid, 'ambiente', 'parede', est('parede'), 'l-parede')}
        ${camada(pid, 'ambiente', 'iluminacao', est('iluminacao'), 'l-luz')}
        ${camada(pid, 'ambiente', 'vista', est('vista'), 'l-vista')}
        ${camada(pid, 'ambiente', 'decoracao', est('decoracao'), 'l-deco')}
        ${camada(pid, 'ambiente', 'chao', est('chao'), 'l-chao')}
        ${camada(pid, 'ambiente', 'mobilia', est('mobilia'), 'l-mobilia')}
        <div class="equipamentos">
          ${eq.map((s) => camada(pid, 'equipamento', s.id, p.estagios.equipamento[s.id], 'l-equip')).join('')}
        </div>
        <div class="boneca">
          ${camada(pid, 'estilo', 'cabelo', vis('cabelo'), 'l-cabelo')}
          ${camada(pid, 'estilo', 'maquiagem', vis('maquiagem'), 'l-maquiagem')}
          ${camada(pid, 'estilo', 'acessorios', vis('acessorios'), 'l-acessorios')}
          ${camada(pid, 'estilo', 'roupaCima', vis('roupaCima'), 'l-cima')}
          ${camada(pid, 'estilo', 'roupaIntima', vis('roupaIntima'), 'l-intima')}
          ${camada(pid, 'estilo', 'roupaBaixo', vis('roupaBaixo'), 'l-baixo')}
          ${camada(pid, 'estilo', 'calcado', vis('calcado'), 'l-calcado')}
        </div>
        <div class="dica">Toque para ganhar <b data-vivo="clique"></b></div>
      </button>
      <div class="niveis">
        ${G.TRILHAS.map((t) => `
          <button class="nivel" data-acao="irTrilha" data-trilha="${t}">
            <span>${esc(d.trilhas[t].nome.split(' — ')[0])}</span>
            ${barra(G.nivelTrilha(estado, pid, t))}
            <small>${pct(G.nivelTrilha(estado, pid, t))}</small>
          </button>`).join('')}
      </div>`;
  }

  function telaTrilhas() {
    const pid = estado.foco;
    const d = G.PERSONAGENS[pid];
    const p = estado.personagens[pid];
    const t = d.trilhas[ui.trilha];
    const peso = G.BALANCO.pesos[ui.trilha];
    const efeito = ui.trilha === 'intimidade'
      ? 'Sem bônus numérico — libera história, falas e mensagens. Exige afinidade.'
      : `Pesa ${peso.clique >= peso.segundo ? 'mais em R$/clique' : 'mais em R$/segundo'}`;

    return `
      <div class="segmentos">
        ${G.TRILHAS.map((id) => `
          <button class="${id === ui.trilha ? 'ativo' : ''}" data-acao="trilha" data-trilha="${id}">
            ${esc(d.trilhas[id].nome.split(' — ')[0])}<small>${pct(G.nivelTrilha(estado, pid, id))}</small>
          </button>`).join('')}
      </div>
      <div class="cabecalho-trilha">
        <h3>${esc(t.nome)}</h3>
        <p>${efeito}${ui.trilha === 'intimidade' ? ` · Afinidade atual: <b>${p.afinidade}</b>` : ''}</p>
      </div>
      <div class="lista">
        ${t.subtrilhas.map((s) => {
          const idx = p.estagios[ui.trilha][s.id];
          const prox = s.estagios[idx + 1];
          return `
            <div class="cartao-sub">
              <div class="info">
                <b>${esc(s.nome)}</b>
                <span>${esc(s.estagios[idx].nomeVisual)} · marco ${G.marco(idx)}</span>
                <div class="pips">${G.MARCOS.slice(1).map((_, i) => `<i class="${i < idx ? 'on' : ''}"></i>`).join('')}</div>
              </div>
              ${prox
                ? `<button class="comprar" data-acao="comprar" data-comprar="${ui.trilha}.${s.id}">
                     <small>→ ${esc(prox.nomeVisual)}</small>
                     <b data-custo></b>
                   </button>`
                : '<span class="maximo">Completo</span>'}
            </div>`;
        }).join('')}
      </div>`;
  }

  function telaHistoria() {
    const pid = estado.foco;
    const d = G.PERSONAGENS[pid];
    const p = estado.personagens[pid];
    const atual = G.capituloDef(pid, p.capitulo);
    const faltam = G.requisitosProximoCapitulo(estado, pid);
    const B = G.BALANCO;

    const ponto = (pt) => {
      const resp = p.respostas[pt.id];
      return `
        <div class="dialogo">
          <p class="fala">${pt.fala ? esc(pt.fala) : `<span class="vazio">[Fala ${pt.id} — texto a escrever]</span>`}</p>
          <div class="opcoes">
            ${pt.opcoes.map((o) => `
              <button class="opcao tag-${o.tag} ${resp === o.tag ? 'escolhida' : ''}" ${resp ? 'disabled' : ''}
                data-acao="responder" data-ponto="${pt.id}" data-tag="${o.tag}">
                <small>${esc(G.TAGS[o.tag])}</small>
                ${o.texto ? esc(o.texto) : '<span class="vazio">[resposta a escrever]</span>'}
              </button>`).join('')}
          </div>
        </div>`;
    };

    return `
      <div class="afinidade">
        <span>Afinidade Emocional</span><b>${p.afinidade} / ${B.afinidade.max}</b>
        ${barra(p.afinidade, B.afinidade.max, 'rosa')}
      </div>
      <ol class="capitulos">
        ${d.capitulos.map((c) => `
          <li class="${c.n < p.capitulo ? 'feito' : c.n === p.capitulo ? 'atual' : 'bloqueado'}">
            <b>${c.n}. ${esc(c.titulo)}</b><small>${c.inicio}%+${c.afinidadeMin ? ` · afinidade ${c.afinidadeMin}` : ''}</small>
          </li>`).join('')}
      </ol>
      <div class="capitulo-atual">
        <h3>Capítulo ${atual.n} — ${esc(atual.titulo)}</h3>
        <p class="nota">Resposta alinhada com o momento: +${B.boostRespostaAlinhada * 100}% de renda até o próximo capítulo e +${B.afinidade.alinhada} de afinidade.
          Fria: ${B.afinidade.desalinhada} de afinidade.</p>
        ${atual.pontos.map(ponto).join('')}
        ${faltam === null
          ? '<p class="requisitos">Último capítulo.</p>'
          : faltam.length ? `<p class="requisitos">Próximo capítulo: falta ${faltam.map(esc).join(', ')}.</p>` : ''}
        ${G.podeRepetirCapitulo(estado, pid) ? '<button class="botao" data-acao="repetir">Conversar de novo</button>' : ''}
        ${G.resetDisponivel(estado, pid) ? '<button class="botao destaque" data-acao="aba" data-aba="roster">Ponto de Escolha liberado →</button>' : ''}
      </div>`;
  }

  function telaCelular() {
    const pid = estado.foco;
    const d = G.PERSONAGENS[pid];
    const p = estado.personagens[pid];
    p.mensagensLidas = p.mensagens.length;
    const icone = { texto: '✉', foto: '▣', video: '▶' };

    const bolha = (rec) => {
      const m = d.mensagens.find((x) => x.id === rec.id);
      if (!m) return '';
      const src = G.asset(`${pid}.mensagem.${m.id}`);
      const tier = m.gatilho.tipo === 'tierMidia' ? G.TIERS_MIDIA.find((t) => t.tier === m.gatilho.tier) : null;
      const corpo = src
        ? `<img src="${esc(src)}" alt="">`
        : m.conteudo
          ? esc(m.conteudo)
          : `<span class="vazio">[${icone[m.tipo]} ${m.tipo}${tier ? ` · Tier ${tier.tier}: ${esc(tier.nome)}` : ''} — conteúdo a produzir]</span>`;
      return `<div class="bolha">${corpo}<time>${new Date(rec.em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time></div>`;
    };

    return `
      <div class="celular">
        <div class="celular-topo"><span class="avatar" style="--hue:${hue(pid)}">${esc(d.nome[0])}</span><b>${esc(d.nome)}</b></div>
        <div class="conversa">
          ${p.mensagens.length ? p.mensagens.map(bolha).join('') : '<p class="vazio centro">Nenhuma mensagem ainda. Elas chegam com o progresso e a trilha Mensagens/Mídia.</p>'}
        </div>
        <div class="tiers">
          ${G.TIERS_MIDIA.map((t) => `<span class="${G.tierLiberado(estado, pid, t.tier) ? 'on' : ''}">T${t.tier} ${esc(t.nome)}</span>`).join('')}
        </div>
      </div>`;
  }

  function telaGuardaRoupa() {
    const pid = estado.foco;
    const d = G.PERSONAGENS[pid];
    const p = estado.personagens[pid];
    return `
      <p class="nota">Estágios de Estilo já alcançados ficam salvos para sempre, inclusive após o reset.
        Trocar o visual não muda o bônus: ele vem do estágio real.</p>
      <div class="lista">
        ${d.trilhas.estilo.subtrilhas.map((s) => {
          const gr = p.guardaRoupa[s.id];
          return `
            <div class="guarda">
              <b>${esc(s.nome)}</b>
              <div class="chips">
                <button class="${gr.exibido === null ? 'ativo' : ''}" data-acao="visual" data-sub="${s.id}" data-idx="">Atual</button>
                ${s.estagios.map((e, i) => `
                  <button class="${gr.exibido === i ? 'ativo' : ''}" ${i > gr.max ? 'disabled' : ''}
                    data-acao="visual" data-sub="${s.id}" data-idx="${i}">${i > gr.max ? '🔒 ' : ''}${esc(e.nomeVisual)}</button>`).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }

  function telaRoster() {
    const pid = estado.foco;
    const d = G.PERSONAGENS[pid];
    const p = estado.personagens[pid];
    const sugerido = G.tracoSugerido(estado, pid);
    const disponivel = G.resetDisponivel(estado, pid);

    return `
      <div class="lista">
        ${Object.entries(estado.personagens).map(([id, pp]) => `
          <div class="cartao-roster ${id === estado.foco ? 'foco' : ''}">
            <span class="avatar" style="--hue:${hue(id)}">${esc(G.PERSONAGENS[id].nome[0])}</span>
            <div class="info">
              <b>${esc(G.PERSONAGENS[id].nome)}</b>
              <span>${pct(G.progressoGeral(estado, id))} · ${rs(G.rendaSegundoPersonagem(estado, id))}/s · ${pp.resets} reset(s)</span>
            </div>
            ${id === estado.foco ? '<span class="selo">Em foco</span>' : `<button class="botao" data-acao="foco" data-pid="${id}">Focar</button>`}
          </div>`).join('')}
      </div>
      <div class="multiplicadores">
        <h3>Multiplicadores</h3>
        <dl>
          <dt>Sinergia do roster</dt><dd>×${G.multiplicadorSinergia(estado).toFixed(3)}</dd>
          <dt>${esc(d.nome)}: personagem (reset, boost, bônus cruzado)</dt><dd>×${G.multiplicadorPersonagem(estado, pid).toFixed(3)}</dd>
          <dt>Bônus permanente acumulado</dt><dd>+${p.bonusPermanente.toFixed(1)}%</dd>
          <dt>Moeda investida desde o último reset</dt><dd>${rs(p.moedaAcumuladaTotal)}</dd>
        </dl>
      </div>
      <div class="reset">
        <h3>Ponto de Escolha — reset de ${esc(d.nome)}</h3>
        ${disponivel
          ? `<p>O reset zera trilhas, capítulos e afinidade de ${esc(d.nome)} e dá <b>+${G.bonusDoReset(estado, pid).toFixed(1)}%</b> de renda permanente.
               O dinheiro do roster, o guarda-roupa e as mensagens ficam. Escolha o traço:</p>
             <div class="tracos">
               ${d.tracos.map((t) => `
                 <button class="traco" data-acao="resetar" data-traco="${t.id}">
                   ${t.id === sugerido.id ? '<span class="selo">Sugerido pelas suas respostas</span>' : ''}
                   <b>${esc(t.nome)}</b><small>${esc(t.descricao)}</small>
                 </button>`).join('')}
             </div>`
          : `<p class="nota">Libera no capítulo ${d.capitulos.length} com ${G.BALANCO.progressoMinReset}% de progresso geral
               (agora: cap. ${p.capitulo}, ${pct(G.progressoGeral(estado, pid))}).</p>`}
      </div>
      <button class="botao perigo" data-acao="apagar">Apagar save</button>`;
  }

  const TELAS = {
    personagem: telaPersonagem,
    trilhas: telaTrilhas,
    historia: telaHistoria,
    celular: telaCelular,
    guarda: telaGuardaRoupa,
    roster: telaRoster,
  };

  // ---------- Render ----------

  function render() {
    const rolagem = ui.ultimaAba === ui.aba ? $tela.scrollTop : 0;
    $tela.className = `tela-${ui.aba}`;
    $tela.innerHTML = TELAS[ui.aba]();
    $tela.scrollTop = rolagem;
    ui.ultimaAba = ui.aba;
    renderAbas();
    atualizarVivo();
  }

  function renderAbas() {
    const p = estado.personagens[estado.foco];
    const naoLidas = p.mensagens.length - p.mensagensLidas;
    $abas.innerHTML = ABAS.map((a) => `
      <button class="${a.id === ui.aba ? 'ativo' : ''}" data-acao="aba" data-aba="${a.id}">
        <span class="icone">${a.icone}</span>${a.nome}
        ${a.id === 'celular' && naoLidas > 0 ? `<span class="badge">${naoLidas}</span>` : ''}
      </button>`).join('');
  }

  // Atualiza só números e botões (chamado várias vezes por segundo, sem refazer o DOM).
  function atualizarVivo() {
    document.getElementById('moeda').textContent = rs(estado.moeda);
    document.getElementById('renda-clique').textContent = `${rs(G.rendaClique(estado))}/toque`;
    document.getElementById('renda-seg').textContent = `${rs(G.rendaSegundo(estado))}/s`;
    const clique = $tela.querySelector('[data-vivo="clique"]');
    if (clique) clique.textContent = rs(G.rendaClique(estado));
    for (const btn of $tela.querySelectorAll('[data-comprar]')) {
      const [trilha, sub] = btn.dataset.comprar.split('.');
      const r = G.podeComprar(estado, estado.foco, trilha, sub);
      btn.disabled = !r.ok;
      btn.querySelector('[data-custo]').textContent =
        r.motivo === 'afinidade' ? `Afinidade ${r.requisito}` : rs(r.custo);
    }
  }

  // ---------- Ações ----------

  function flutuar(ev, texto) {
    const el = document.createElement('span');
    el.className = 'flutuante';
    el.textContent = texto;
    const caixa = document.getElementById('app').getBoundingClientRect();
    el.style.left = `${ev.clientX - caixa.left}px`;
    el.style.top = `${ev.clientY - caixa.top}px`;
    document.getElementById('app').append(el);
    setTimeout(() => el.remove(), 900);
  }

  function aoTocar(ev) {
    const alvo = ev.target.closest('[data-acao]');
    if (!alvo || alvo.disabled) return;
    const pid = estado.foco;
    const ds = alvo.dataset;
    switch (ds.acao) {
      case 'clicar':
        flutuar(ev, `+${rs(G.clicar(estado))}`);
        atualizarVivo();
        return;
      case 'aba':
        ui.aba = ds.aba;
        break;
      case 'irTrilha':
        ui.aba = 'trilhas';
        ui.trilha = ds.trilha;
        break;
      case 'trilha':
        ui.trilha = ds.trilha;
        break;
      case 'comprar': {
        const [trilha, sub] = ds.comprar.split('.');
        anunciar(G.comprar(estado, pid, trilha, sub).eventos);
        break;
      }
      case 'responder': {
        const r = G.responder(estado, pid, ds.ponto, ds.tag);
        if (r) {
          toast({ alinhada: 'Ela gostou da resposta. Boost ativo!', neutra: 'Ok, nada demais.', desalinhada: 'Ela ficou mais distante.' }[r.resultado]);
          anunciar(r.eventos);
        }
        break;
      }
      case 'repetir':
        G.repetirCapitulo(estado, pid);
        break;
      case 'visual':
        G.escolherVisual(estado, pid, ds.sub, ds.idx === '' ? null : Number(ds.idx));
        break;
      case 'foco':
        estado.foco = ds.pid;
        break;
      case 'resetar': {
        const t = G.PERSONAGENS[pid].tracos.find((x) => x.id === ds.traco);
        if (!confirm(`Resetar ${G.PERSONAGENS[pid].nome} com o traço "${t.nome}"?`)) return;
        G.resetar(estado, pid, ds.traco);
        toast(`${G.PERSONAGENS[pid].nome} agora é: ${t.nome}`);
        ui.aba = 'personagem';
        break;
      }
      case 'apagar':
        if (!confirm('Apagar todo o progresso?')) return;
        G.apagarSave();
        G.substituirEstado(G.criarEstado());
        break;
      default:
        return;
    }
    G.salvar(estado);
    render();
  }

  G.iniciarUI = (e) => {
    estado = e;
    $tela = document.getElementById('tela');
    $abas = document.getElementById('abas');
    $toasts = document.getElementById('toasts');
    document.getElementById('app').addEventListener('click', aoTocar);
    render();
  };

  G.definirEstadoUI = (e) => {
    estado = e;
  };
  G.render = render;
  G.atualizarVivo = atualizarVivo;
})();
