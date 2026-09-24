// Personagem-piloto: Aika (tema academia).
// Os nomes de estágio são provisórios — substituir pelas tabelas finais do design.
// Textos de diálogo e mensagens ficam null de propósito: conteúdo é produzido à parte.
(() => {
  const G = (globalThis.IdleGame ??= {});

  G.registrarPersonagem({
    id: 'aika',
    nome: 'Aika',
    tema: 'academia',
    trilhas: {
      ambiente: {
        nome: 'Ambiente — Home Gym',
        custoBase: 25,
        subtrilhas: [
          ['chao', 'Chão', ['Concreto cru', 'Tapete de EVA', 'Piso emborrachado', 'Piso de academia', 'Piso assinado']],
          ['parede', 'Parede', ['Reboco cru', 'Pintura simples', 'Espelho pequeno', 'Parede de espelhos', 'Parede de estúdio']],
          ['iluminacao', 'Iluminação', ['Lâmpada pendurada', 'Luminária', 'Luz branca', 'Fita de LED', 'Iluminação cênica']],
          ['mobilia', 'Mobília', ['Caixotes', 'Banco dobrável', 'Prateleiras', 'Móveis planejados', 'Mobiliário de design']],
          ['decoracao', 'Decoração', ['Nada', 'Pôster', 'Plantas', 'Troféus e fotos', 'Decoração assinada']],
          ['vista', 'Vista/Janela', ['Sem janela', 'Janela pequena', 'Janela com cortina', 'Janelão', 'Vista panorâmica']],
        ],
      },
      equipamento: {
        nome: 'Equipamento',
        custoBase: 60,
        subtrilhas: [
          ['pesos', 'Pesos livres', ['Garrafas de água', 'Halteres de vinil', 'Halteres ajustáveis', 'Kit de anilhas', 'Linha de competição']],
          ['cardio', 'Cardio', ['Corda velha', 'Corda nova', 'Bike ergométrica', 'Esteira', 'Setup de cardio pro']],
          ['rack', 'Rack/Barra', ['Barra de porta', 'Barra fixa', 'Suporte simples', 'Power rack', 'Rack profissional']],
          ['acessorios', 'Acessórios de treino', ['Toalha', 'Elásticos', 'Luvas e cinto', 'Kit completo', 'Acessórios de patrocínio']],
          ['suplementacao', 'Suplementação', ['Café', 'Whey básico', 'Rotina de suplementos', 'Nutricionista', 'Linha própria']],
          ['tecnologia', 'Tecnologia', ['Celular no chão', 'Relógio fitness', 'Balança smart', 'Sensores', 'Estúdio de gravação']],
        ],
      },
      estilo: {
        nome: 'Estilo',
        custoBase: 20,
        subtrilhas: [
          ['cabelo', 'Cabelo', ['Preso às pressas', 'Rabo de cavalo', 'Corte novo', 'Penteado de salão', 'Capa de revista']],
          ['roupaCima', 'Roupa de cima', ['Camiseta surrada', 'Regata básica', 'Top esportivo', 'Conjunto de marca', 'Peça de editorial']],
          ['roupaBaixo', 'Roupa de baixo', ['Moletom velho', 'Short básico', 'Legging', 'Legging de marca', 'Peça de editorial']],
          ['calcado', 'Calçado', ['Chinelo', 'Tênis gasto', 'Tênis de treino', 'Tênis de performance', 'Edição limitada']],
          ['acessorios', 'Acessórios', ['Nenhum', 'Elástico de cabelo', 'Boné', 'Relógio e brincos', 'Acessórios de grife']],
          ['roupaIntima', 'Roupa íntima', ['Básica', 'Esportiva', 'Coordenada', 'Premium', 'Assinada']],
          ['maquiagem', 'Maquiagem', ['Sem maquiagem', 'Protetor e brilho', 'Básica', 'Produzida', 'Capa de revista']],
        ],
      },
      habilidade: {
        nome: 'Habilidade',
        custoBase: 100,
        subtrilhas: [
          ['forca', 'Força', ['Iniciante', 'Aprendiz', 'Intermediária', 'Avançada', 'Elite']],
          ['resistencia', 'Resistência', ['Iniciante', 'Aprendiz', 'Intermediária', 'Avançada', 'Elite']],
          ['tecnica', 'Técnica/Postura', ['Iniciante', 'Aprendiz', 'Intermediária', 'Avançada', 'Referência']],
          ['flexibilidade', 'Flexibilidade', ['Iniciante', 'Aprendiz', 'Intermediária', 'Avançada', 'Elite']],
          ['disciplina', 'Disciplina', ['Irregular', 'Tentando', 'Constante', 'Rígida', 'Inabalável']],
          ['performance', 'Performance', ['Tímida', 'Esforçada', 'Segura', 'Carismática', 'Referência']],
        ],
      },
      intimidade: {
        nome: 'Intimidade',
        custoBase: 40,
        subtrilhas: [
          ['confianca', 'Confiança', ['Reservada', 'À vontade', 'Se abre', 'Confia', 'Confiança plena']],
          ['vulnerabilidade', 'Vulnerabilidade', ['Fachada', 'Escapes', 'Admite', 'Se mostra', 'Sem máscaras']],
          ['carinho', 'Carinho', ['Formal', 'Simpática', 'Afetuosa', 'Carinhosa', 'Dedicada']],
          ['ciume', 'Ciúme/Apego', ['Indiferente', 'Curiosa', 'Atenta', 'Apegada', 'Inseparável']],
          ['midia', 'Mensagens/Mídia', ['Sem contato', 'Mensagens', 'Fotos', 'Chamadas', 'Canal próprio']],
        ],
      },
    },

    // Três traços por personagem (seção 5). `tagAfim` define qual padrão de
    // respostas recomenda o traço no Ponto de Escolha.
    tracos: [
      {
        id: 'confiante',
        nome: 'Confiante de verdade',
        descricao: 'Arco de superação da ansiedade. Trilha Habilidade 20% mais barata.',
        tagAfim: 'acolhedor',
        efeito: { tipo: 'custoTrilha', trilha: 'habilidade', mult: 0.8 },
      },
      {
        id: 'carente',
        nome: 'Carente',
        descricao: 'Mais doce e grudenta. Trilha Intimidade 30% mais barata.',
        tagAfim: 'frio',
        efeito: { tipo: 'custoTrilha', trilha: 'intimidade', mult: 0.7 },
      },
      {
        id: 'possessiva',
        nome: 'Possessiva',
        descricao: 'Ciumenta em tom leve e cômico. +5% de renda para as outras personagens enquanto ela está em foco.',
        tagAfim: 'brincalhao',
        efeito: { tipo: 'buffRosterEmFoco', mult: 1.05 },
      },
    ],

    // Capítulos lineares por % de progresso geral (seção 9.1).
    // `afinidadeMin` é exigida para ENTRAR no capítulo; `tagAlinhada` é a resposta
    // que combina com o momento emocional.
    capitulos: [
      { titulo: 'A Instrutora', inicio: 0, afinidadeMin: 0, tagAlinhada: 'brincalhao', pontos: 2 },
      { titulo: 'Fora do Treino', inicio: 10, afinidadeMin: 0, tagAlinhada: 'brincalhao', pontos: 2 },
      { titulo: 'Rachaduras', inicio: 25, afinidadeMin: 5, tagAlinhada: 'acolhedor', pontos: 2 },
      { titulo: 'A Confissão', inicio: 40, afinidadeMin: 15, tagAlinhada: 'acolhedor', pontos: 2 },
      { titulo: 'Apoio', inicio: 55, afinidadeMin: 30, tagAlinhada: 'acolhedor', pontos: 2 },
      { titulo: 'Apego', inicio: 70, afinidadeMin: 45, tagAlinhada: 'acolhedor', pontos: 2 },
      { titulo: 'Ponto de Escolha', inicio: 85, afinidadeMin: 60, tagAlinhada: 'acolhedor', pontos: 2 },
    ],

    // Textos por ponto de diálogo: { c1p1: { fala: '...', acolhedor: '...', brincalhao: '...', frio: '...' } }
    textos: {},

    // Mensagens do celular (seção 8). `conteudo` null → placeholder.
    mensagens: [
      { id: 'prog-5', gatilho: { tipo: 'progresso', min: 5 }, tipo: 'texto', conteudo: null },
      { id: 'tier-1', gatilho: { tipo: 'tierMidia', tier: 1 }, tipo: 'foto', conteudo: null },
      { id: 'prog-30', gatilho: { tipo: 'progresso', min: 30 }, tipo: 'texto', conteudo: null },
      { id: 'tier-2', gatilho: { tipo: 'tierMidia', tier: 2 }, tipo: 'foto', conteudo: null },
      { id: 'prog-60', gatilho: { tipo: 'progresso', min: 60 }, tipo: 'texto', conteudo: null },
      { id: 'tier-3', gatilho: { tipo: 'tierMidia', tier: 3 }, tipo: 'foto', conteudo: null },
      { id: 'tier-4', gatilho: { tipo: 'tierMidia', tier: 4 }, tipo: 'video', conteudo: null },
      { id: 'prog-100', gatilho: { tipo: 'progresso', min: 100 }, tipo: 'texto', conteudo: null },
      { id: 'tier-5', gatilho: { tipo: 'tierMidia', tier: 5 }, tipo: 'video', conteudo: null },
    ],
  });
})();
