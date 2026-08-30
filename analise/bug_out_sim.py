"""
Monte Carlo do ataque Bug Out (Pitch Black / Delta Reign).

Texto do ataque:
  Revele as 7 cartas de baixo do seu deck. Este ataque causa 50 de dano para cada
  Pokemon revelado que tenha o ataque Bug Out. Depois, embaralhe os Pokemon
  revelados de volta no deck e descarte as demais cartas reveladas.

Consequencia estrutural (o ponto central do deck):
  - Pokemon revelados VOLTAM pro deck  -> dilucao PERMANENTE
  - Nao-Pokemon revelados sao DESCARTADOS -> dilucao TEMPORARIA (o deck se auto-afina)
Logo: cada Pokemon que NAO tem Bug Out e um imposto permanente no dano.
"""
import random
from dataclasses import dataclass

BUG, POKE, OTHER = "BUG", "POKE", "OTHER"
DMG_POR_BUG = 50


@dataclass
class Resultado:
    dano_por_turno: list
    deckout_turno: int | None


def simular_partida(n_bug, n_poke, n_other, turnos, cartas_por_turno=2, rng=random):
    """cartas_por_turno = compra do turno + busca/supporter media (sai do deck)."""
    deck = [BUG] * n_bug + [POKE] * n_poke + [OTHER] * n_other
    rng.shuffle(deck)

    # 7 prizes + 7 de mao inicial saem do deck antes do turno 1
    for _ in range(14):
        if deck:
            deck.pop()

    dano = []
    deckout = None
    for t in range(1, turnos + 1):
        # compra do turno
        for _ in range(cartas_por_turno):
            if not deck:
                deckout = t
                break
            deck.pop()
        if deckout:
            break

        # Bug Out: revela as 7 de baixo (indices 0..6 = fundo)
        reveladas = deck[:7]
        n_hits = sum(1 for c in reveladas if c == BUG)
        dano.append(n_hits * DMG_POR_BUG)

        # Pokemon voltam (reembaralhados), nao-Pokemon sao descartados
        volta = [c for c in reveladas if c in (BUG, POKE)]
        deck = deck[len(reveladas):] + volta
        rng.shuffle(deck)

    return Resultado(dano, deckout)


def avaliar(n_bug, n_poke, n_other, turnos=8, n=20000):
    rng = random.Random(0xB09)
    soma = [0.0] * turnos
    contagem = [0] * turnos
    deckouts = 0
    for _ in range(n):
        r = simular_partida(n_bug, n_poke, n_other, turnos, rng=rng)
        if r.deckout_turno:
            deckouts += 1
        for i, d in enumerate(r.dano_por_turno):
            soma[i] += d
            contagem[i] += 1
    medias = [soma[i] / contagem[i] if contagem[i] else float("nan") for i in range(turnos)]
    return medias, deckouts / n


CONFIGS = [
    ("So Sizzlipede (hoje, pre-Delta Reign)",  4, 8, 48),
    ("16 Bug Out + linha de suporte gorda",   16, 12, 32),
    ("16 Bug Out + suporte enxuto",           16,  6, 38),
    ("16 Bug Out + ZERO outros Pokemon",      16,  0, 44),
    ("12 Bug Out + zero outros Pokemon",      12,  0, 48),
]

print(f"{'Composicao':<42} {'T1':>6} {'T2':>6} {'T3':>6} {'T4':>6} {'T5':>6} {'T6':>6} {'Deckout':>8}")
print("-" * 96)
for nome, b, p, o in CONFIGS:
    assert b + p + o == 60, (nome, b + p + o)
    medias, do = avaliar(b, p, o)
    linha = " ".join(f"{m:6.0f}" for m in medias[:6])
    print(f"{nome:<42} {linha} {do:7.1%}")

print()
print("Dano medio por turno = 350 x (fracao do deck que tem Bug Out).")
print("Teto teorico = 350 (as 7 de baixo todas com Bug Out).")
