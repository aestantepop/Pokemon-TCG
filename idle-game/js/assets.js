// Mapa de arte: chave → caminho da imagem (relativo a index.html).
// Enquanto uma chave não existir, o jogo desenha um placeholder com legenda.
//
// Chaves:
//   camadas visuais  → "<personagem>.<trilha>.<subtrilha>.<marco>"   ex.: "aika.estilo.cabelo.50"
//   mensagens/mídia  → "<personagem>.mensagem.<id da mensagem>"      ex.: "aika.mensagem.tier-1"
//
// Exemplo (descomente quando o arquivo existir):
//   'aika.estilo.cabelo.50': 'assets/aika/estilo/cabelo-50.png',
(() => {
  const G = (globalThis.IdleGame ??= {});

  G.ASSETS = {};

  G.asset = (chave) => G.ASSETS[chave] ?? null;
})();
