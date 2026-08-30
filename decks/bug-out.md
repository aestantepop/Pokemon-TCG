# Bug Out — deck de densidade (Pitch Black + Delta Reign)

> Competitivo, rogue. A construção deste deck é **contraintuitiva** e a razão está na §3.

---

## 1. O ataque

**Bug Out** (JP: *Bug Panic*):

> Revele as **7 cartas de baixo** do seu deck. Este ataque causa **50 de dano para cada
> Pokémon revelado que tenha o ataque Bug Out**. Depois, embaralhe os Pokémon revelados
> de volta no deck e descarte as demais cartas reveladas.

- Teto teórico: **350** (as 7 de baixo todas com Bug Out).
- **Ruling (PokeGym FAQ, ME: Pitch Black):** **todos** os Pokémon revelados voltam pro
  deck, tenham ou não o ataque Bug Out. Só as cartas **não-Pokémon** (Trainer/Energia)
  vão pro descarte. ✅ Guarde isso — é o eixo do deck inteiro.

## 2. As cartas com Bug Out

| Carta | Set | Tipo/Estágio | Custo do Bug Out |
|---|---|---|---|
| **Sizzlipede** | Pitch Black (ME05) | Basic | ⚠️ a confirmar (uma das versões é `CCC`) |
| **Masquerain** | Delta Reign (Storm Emeralda #3) | Grass, **Stage 1** | **1 Energia Grass** ✅ |
| **Combee** | Delta Reign | Basic | ⚠️ a confirmar |
| **Spinarak** | Delta Reign | Basic | ⚠️ a confirmar |

**4 espécies × 4 cópias = 16 cartas com Bug Out.** Antes de Delta Reign eram só 4
(Sizzlipede). É por isso que o deck só existe de verdade a partir de novembro.

O **Masquerain atacando por 1 Energia Grass** é o que torna o deck jogável — Bug Out
online no turno 1-2 sem nenhuma aceleração.

---

## 3. A ideia central: dilua com Trainers, nunca com Pokémon

Repare na assimetria do ataque:

- Pokémon revelados → **voltam pro deck**. Ficam lá pra sempre, diluindo todos os
  Bug Out futuros. **Imposto permanente.**
- Não-Pokémon revelados → **são descartados**. Sumem do deck. **Imposto temporário.**

Ou seja: **o deck se auto-afina em direção a Pokémon a cada ataque**, e o dano do Bug Out
sobe sozinho turno a turno. Mas qualquer Pokémon *sem* Bug Out trava essa subida
permanentemente.

> **Regra de construção:** dano médio = `350 × (fração do deck que tem Bug Out)`.
> Trainer é imposto que se paga sozinho. Pokémon sem Bug Out é imposto vitalício.

Isso inverte a intuição normal de deckbuilding: aqui você quer o deck **pesado de
Trainer e magro de Pokémon**.

---

## 4. Simulação (Monte Carlo, 20.000 partidas por linha)

Script reproduzível: [`analise/bug_out_sim.py`](../analise/bug_out_sim.py).
Modelo: 7 prizes + 7 de mão saem do deck; 2 cartas saem do deck por turno
(compra + supporter); Bug Out todo turno.

Dano **médio** por turno:

| Composição (Bug Out / outros Pokémon / não-Pokémon) | T1 | T2 | T3 | T4 | T5 | T6 | Deckout |
|---|---:|---:|---:|---:|---:|---:|---:|
| 4 / 8 / 48 — só Sizzlipede, hoje | 23 | 27 | 31 | 38 | 48 | 65 | 13% |
| 16 / 12 / 32 — suporte gordo | 93 | 103 | 112 | 124 | 137 | 151 | 0% |
| 16 / 6 / 38 — suporte enxuto | 93 | 104 | 117 | 133 | 153 | 178 | 0% |
| **16 / 0 / 44 — zero Pokémon extra** | **93** | **106** | **122** | **144** | **175** | **220** | 1% |
| 12 / 0 / 48 | 70 | 80 | 94 | 115 | 146 | 194 | 13% |

### O que a tabela prova

1. **Hoje o deck não existe.** Com só Sizzlipede: 23 de dano no T1. Delta Reign
   multiplica isso por **4×**.
2. **Cortar os 12 Pokémon de suporte vale +69 de dano no T6** (151 → 220). É o maior
   ganho isolado do deck inteiro, e é de graça.
3. **O deck acelera sozinho.** 93 → 220 sem jogar nada: é o auto-afinamento.
4. **Os 16 Bug Out são obrigatórios.** Cair pra 12 custa dano *e* multiplica o deckout
   por 13× (o deck afina mais devagar e você compra até o fim).

---

## 5. A decisão de construção: Masquerain custa Surskit

Masquerain é **Stage 1** — precisa de **Surskit**, que é um Pokémon **sem** Bug Out,
ou seja, imposto permanente. Aí está a tensão real do deck:

**Build A — "puro" (16/0/44):** só os Basics (Sizzlipede, Combee, Spinarak).
Dano máximo, zero diluição. Depende do custo de Energia dos três Basics — se for `CCC`,
o deck é lento demais nos primeiros turnos.

**Build B — "Masquerain" (16/4/40):** +4 Surskit pra habilitar o ataque de 1 Energia.
Custa ~25 de dano no late em troca de estar atacando no turno 1-2.

⚠️ **A escolha depende do custo do Bug Out do Combee e do Spinarak.** Se algum deles
atacar barato, Build A vence e o Surskit sai. É o dado nº 1 que falta.

---

## 6. A tech que ninguém vai jogar: empilhar o fundo

Qualquer efeito que coloque **uma carta da sua mão no fundo do deck** vale
**+50 de dano garantido** se a carta for um Bug Out — e converte dano *médio* em dano
*determinístico*, que é o que separa um deck rogue de um deck de torneio.

O ataque embaralha depois de revelar, então o empilhamento não persiste entre turnos —
mas funciona perfeitamente para o ataque daquele turno.

⚠️ Preciso levantar quais cartas H/I/J fazem "put on the bottom of your deck". É o dado
nº 2 que falta, e é o de maior potencial de upside do deck.

---

## 7. Esqueleto (Build A)

```
POKÉMON (16)
 4  Masquerain      — se Build B, +4 Surskit
 4  Sizzlipede
 4  Combee
 4  Spinarak

TRAINER + ENERGIA (44)
    Motor de busca de Basic  (quanto mais, melhor — Trainer é imposto que se paga)
    Draw supporter
    Bottom-stack tech  (ver §6)
    Energia Grass  — contagem depende dos custos da §5
```

**Por que 44 de Trainer não é exagero aqui:** num deck normal isso seria absurdo. Neste,
cada Trainer que o Bug Out revela é permanentemente removido do deck, aumentando a
densidade de Bug Out. O suporte literalmente vira dano.

---

## 8. Avaliação honesta pra torneio

**A favor:**
- Atacantes de **1 prize**. O oponente precisa de 6 KOs; você troca barato.
- Ignora completamente o eixo de HP/defesa: 220 de dano mata qualquer Mega ex (340 HP)
  em dois ataques, e o dano **não** depende de Energia acumulada.
- É invisível pro meta. Ninguém tem plano contra isso.

**Contra:**
- **A rampa é o problema.** T1-T3 você faz 93-122, que não nocauteia quase nada
  relevante. Você está trocando prizes em desvantagem enquanto o motor não engata.
- **Mega Lucario ex** ganha a corrida de prizes ("nocauteia um turno antes") — esse
  matchup é ruim por construção.
- **Descarte forçado.** Você mina seus próprios recursos ~4-5 por turno. Contra decks
  de controle (Magnezone ex, campeão do EUIC) o deckout é um risco real, não teórico.

**Veredito:** é um deck rogue legítimo, com um motor matemático que realmente funciona,
não um meme. Mas o teto competitivo depende inteiramente dos dois dados em aberto
(§5 e §6). Com uma boa tech de bottom-stack, vira torneável de verdade.

---

## Fontes
- [The Pokémon TCG's Delta Reign expansion will provide more support for the game's buggiest archetype — Wargamer](https://www.wargamer.com/pokemon-trading-card-game/bug-out)
- [ME: Pitch Black FAQs — The PokeGym](https://pokegym.net/2026/07/03/me-pitch-black-faqs/)
- [Masquerain (Storm Emeralda 3) — Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Masquerain_(Storm_Emeralda_3))
- ["Storm Emeralda" All 76 Main Set Cards Revealed! — PokéBeach](https://www.pokebeach.com/2026/07/storm-emeralda-all-76-main-set-cards-revealed)
- [Full Card List from M6 "Storm Emeralda" Revealed! — PokemonCard](https://pokemoncard.io/article/full-card-list-from-m6-storm-emeralda-revealed)
