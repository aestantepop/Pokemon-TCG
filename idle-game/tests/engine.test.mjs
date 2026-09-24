import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../js/config.js');
await import('../js/personagens.js');
await import('../js/data/aika.js');
await import('../js/engine.js');
const G = globalThis.IdleGame;

const novo = () => G.criarEstado(0);
const maximizar = (e, pid, trilhas = G.TRILHAS) => {
  for (const t of trilhas) for (const s of Object.keys(e.personagens[pid].estagios[t])) e.personagens[pid].estagios[t][s] = 4;
};

test('estrutura da Aika segue o design doc', () => {
  const d = G.PERSONAGENS.aika;
  const qtd = Object.fromEntries(G.TRILHAS.map((t) => [t, d.trilhas[t].subtrilhas.length]));
  assert.deepEqual(qtd, { ambiente: 6, equipamento: 6, estilo: 7, habilidade: 6, intimidade: 5 });
  for (const t of G.TRILHAS) for (const s of d.trilhas[t].subtrilhas) assert.equal(s.estagios.length, 5);
  assert.equal(d.capitulos.length, 7);
  assert.equal(d.tracos.length, 3);
});

test('custo = custoBase × 1.25^índice', () => {
  const s = G.subtrilhaDef('aika', 'ambiente', 'chao');
  assert.deepEqual(s.estagios.map((e) => e.custo), [25, 31, 39, 49, 61]);
  const e = novo();
  assert.equal(G.custoProximo(e, 'aika', 'ambiente', 'chao'), 31);
});

test('comprar desconta moeda, avança marco e acumula para o reset', () => {
  const e = novo();
  e.moeda = 100;
  const r = G.comprar(e, 'aika', 'ambiente', 'chao');
  assert.ok(r.ok);
  assert.equal(e.moeda, 69);
  assert.equal(e.personagens.aika.estagios.ambiente.chao, 1);
  assert.equal(e.personagens.aika.moedaAcumuladaTotal, 31);
  assert.equal(G.podeComprar(e, 'aika', 'habilidade', 'performance').motivo, 'moeda');
});

test('nível e progresso geral são médias', () => {
  const e = novo();
  e.personagens.aika.estagios.estilo.cabelo = 4;
  assert.equal(G.nivelTrilha(e, 'aika', 'estilo'), 100 / 7);
  assert.equal(G.progressoGeral(e, 'aika'), 100 / 7 / 5);
});

test('Estilo pesa mais no clique, Habilidade no segundo, Intimidade em nada', () => {
  const base = novo();
  const clique0 = G.rendaClique(base);
  const seg0 = G.rendaSegundo(base);

  const est = novo();
  est.personagens.aika.estagios.estilo.cabelo = 4;
  const hab = novo();
  hab.personagens.aika.estagios.habilidade.forca = 4;
  // sinergia muda igual nos dois (mesmo progresso), então dá para comparar as razões
  assert.ok(G.rendaClique(est) / clique0 > G.rendaClique(hab) / clique0);
  assert.ok(G.rendaSegundo(hab) / seg0 > G.rendaSegundo(est) / seg0);

  const int = novo();
  int.personagens.aika.estagios.intimidade.carinho = 4;
  int.personagens.aika.afinidade = 100;
  const sinergia = G.multiplicadorSinergia(int);
  assert.equal(G.rendaClique(int), clique0 * sinergia);
});

test('Intimidade exige afinidade além de moeda', () => {
  const e = novo();
  e.moeda = 1e9;
  assert.equal(G.podeComprar(e, 'aika', 'intimidade', 'carinho').motivo, 'afinidade');
  e.personagens.aika.afinidade = 10;
  assert.ok(G.comprar(e, 'aika', 'intimidade', 'carinho').ok);
});

test('resposta alinhada dá boost até o próximo capítulo; fria tira afinidade', () => {
  const e = novo();
  const p = e.personagens.aika;
  assert.equal(G.responder(e, 'aika', 'c1p1', 'brincalhao').resultado, 'alinhada');
  assert.ok(p.boostAtivo);
  assert.equal(p.afinidade, 10);
  const antes = G.rendaClique(e);
  p.boostAtivo = false;
  assert.ok(Math.abs(antes / G.rendaClique(e) - 1.15) < 1e-9);
  p.boostAtivo = true;

  assert.equal(G.responder(e, 'aika', 'c1p2', 'frio').resultado, 'desalinhada');
  assert.equal(p.afinidade, 5);
  assert.equal(G.responder(e, 'aika', 'c1p2', 'acolhedor'), null, 'não responde duas vezes');

  // capítulo 2 exige progresso 10%
  assert.equal(p.capitulo, 1);
  maximizar(e, 'aika', ['ambiente']);
  G.atualizarPersonagem(e, 'aika');
  assert.equal(p.capitulo, 2);
  assert.equal(p.boostAtivo, false);
});

test('capítulo fica travado sem afinidade suficiente', () => {
  const e = novo();
  const p = e.personagens.aika;
  maximizar(e, 'aika');
  for (const c of G.PERSONAGENS.aika.capitulos) for (const pt of c.pontos) {
    G.atualizarPersonagem(e, 'aika');
    G.responder(e, 'aika', pt.id, 'frio');
  }
  assert.equal(p.capitulo, 2, 'cap. 3 exige afinidade 5 e respostas frias zeram');
  assert.ok(G.requisitosProximoCapitulo(e, 'aika').includes('afinidade 5'));

  // não trava para sempre: dá para refazer o capítulo
  assert.ok(G.repetirCapitulo(e, 'aika'));
  G.responder(e, 'aika', 'c2p1', 'brincalhao');
  G.responder(e, 'aika', 'c2p2', 'brincalhao');
  assert.equal(p.capitulo, 3);
  assert.ok(!G.repetirCapitulo(e, 'aika'));
});

test('tiers de mídia exigem marco + afinidade + capítulo', () => {
  const e = novo();
  const p = e.personagens.aika;
  p.estagios.intimidade.midia = 1;
  assert.ok(G.tierLiberado(e, 'aika', 1));
  p.estagios.intimidade.midia = 2;
  assert.ok(!G.tierLiberado(e, 'aika', 2), 'falta afinidade');
  p.afinidade = 25;
  assert.ok(G.tierLiberado(e, 'aika', 2));
  p.estagios.intimidade.midia = 3;
  p.afinidade = 50;
  assert.ok(!G.tierLiberado(e, 'aika', 3), 'falta concluir capítulo 5');
});

function zerarHistoria(e) {
  maximizar(e, 'aika');
  for (const c of G.PERSONAGENS.aika.capitulos) for (const pt of c.pontos) {
    G.atualizarPersonagem(e, 'aika');
    G.responder(e, 'aika', pt.id, c.tagAlinhada);
  }
  G.atualizarPersonagem(e, 'aika');
}

test('história completa libera reset, sugere traço e entrega mensagens', () => {
  const e = novo();
  zerarHistoria(e);
  const p = e.personagens.aika;
  assert.equal(p.capitulo, 7);
  assert.ok(G.resetDisponivel(e, 'aika'));
  assert.equal(G.tracoSugerido(e, 'aika').id, 'confiante'); // maioria acolhedor
  assert.equal(p.afinidade, 100);
  assert.ok(G.tierLiberado(e, 'aika', 5));
  assert.equal(p.mensagens.length, G.PERSONAGENS.aika.mensagens.length);
});

test('reset: bônus √(acumulado/K), traço aplicado, guarda-roupa mantido', () => {
  const e = novo();
  zerarHistoria(e);
  const p = e.personagens.aika;
  p.moedaAcumuladaTotal = 1_000_000;
  p.guardaRoupa.cabelo.max = 4;
  assert.ok(!G.resetar(e, 'aika', 'inexistente'));
  assert.ok(G.resetar(e, 'aika', 'confiante'));
  assert.ok(Math.abs(p.bonusPermanente - Math.sqrt(1000)) < 1e-9);
  assert.equal(G.progressoGeral(e, 'aika'), 0);
  assert.equal(p.capitulo, 1);
  assert.equal(p.guardaRoupa.cabelo.max, 4);
  const cheio = G.subtrilhaDef('aika', 'habilidade', 'forca').estagios[1].custo;
  assert.equal(G.custoProximo(e, 'aika', 'habilidade', 'forca'), Math.ceil(cheio * 0.8));
  assert.ok(G.rendaClique(e) > G.rendaClique(novo()));
});

test('guarda-roupa só exibe estágios já desbloqueados', () => {
  const e = novo();
  e.moeda = 1e6;
  G.comprar(e, 'aika', 'estilo', 'cabelo');
  G.comprar(e, 'aika', 'estilo', 'cabelo');
  assert.equal(G.estagioVisual(e, 'aika', 'cabelo'), 2);
  assert.ok(G.escolherVisual(e, 'aika', 'cabelo', 0));
  assert.equal(G.estagioVisual(e, 'aika', 'cabelo'), 0);
  assert.ok(!G.escolherVisual(e, 'aika', 'cabelo', 3));
  assert.ok(G.escolherVisual(e, 'aika', 'cabelo', null));
  assert.equal(G.estagioVisual(e, 'aika', 'cabelo'), 2);
});

test('tick e offline (com teto)', () => {
  const e = novo();
  G.tick(e, 10_000);
  assert.ok(Math.abs(e.moeda - 10 * G.rendaSegundo(e)) < 1e-9);
  const off = G.aplicarOffline(e, 10_000 + 24 * 3600 * 1000);
  assert.equal(off.segundos, G.BALANCO.offlineMaxSegundos);
});

test('migrarEstado completa campos que faltam', () => {
  const e = novo();
  delete e.personagens.aika.estagios.estilo.maquiagem;
  delete e.personagens.aika.guardaRoupa;
  const m = G.migrarEstado(JSON.parse(JSON.stringify(e)));
  assert.equal(m.personagens.aika.estagios.estilo.maquiagem, 0);
  assert.ok(m.personagens.aika.guardaRoupa.cabelo);
});
