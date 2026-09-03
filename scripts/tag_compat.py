"""
One-shot script: adds animate / singular_only / animate_only tags to data files.
Safe to re-run — only adds fields that are missing.
"""

import json
from pathlib import Path

DATA = Path(__file__).parent.parent / "data"

# ── Nouns ─────────────────────────────────────────────────────────────────

ANIMATE = {
    # people
    "uomo", "donna", "ragazzo", "ragazza", "studente",
    "amico", "amica", "madre", "padre",
    "moglie", "marito", "sorella", "fratello",
    "bambino", "bambina", "persona",
    "vittima", "guardia", "spia", "sentinella", "soprano",
    # animals
    "gatto", "gatta", "cane", "cagna", "pollo",
    "volpe", "cavallo", "mucca", "pesce", "uccello",
}

# Uncountable in English — no plural exercises
SINGULAR_ONLY = {
    "acqua",    # water
    "musica",   # music
    "cibo",     # food
    "erba",     # grass
    "verdura",  # vegetables (collective)
    "amore",    # love (prevents "the good loves")
}

nouns = json.loads((DATA / "nouns.json").read_text(encoding="utf-8"))
for n in nouns:
    if n["it"] in ANIMATE and "animate" not in n:
        n["animate"] = True
    if n["it"] in SINGULAR_ONLY and "singular_only" not in n:
        n["singular_only"] = True

(DATA / "nouns.json").write_text(
    json.dumps(nouns, ensure_ascii=False, indent=2), encoding="utf-8"
)
print(f"nouns.json: tagged {sum(1 for n in nouns if n.get('animate'))} animate, "
      f"{sum(1 for n in nouns if n.get('singular_only'))} singular_only")

# ── Adjectives ─────────────────────────────────────────────────────────────

# Only makes sense for living beings
ANIMATE_ONLY = {
    "malato",    # sick
    "stanco",    # tired
    "impegnato", # busy
    "furbo",     # cunning
    "astuto",    # shrewd
}

adjs = json.loads((DATA / "adjectives.json").read_text(encoding="utf-8"))
for a in adjs:
    if a["it"] in ANIMATE_ONLY and "animate_only" not in a:
        a["animate_only"] = True

(DATA / "adjectives.json").write_text(
    json.dumps(adjs, ensure_ascii=False, indent=2), encoding="utf-8"
)
print(f"adjectives.json: tagged {sum(1 for a in adjs if a.get('animate_only'))} animate_only")
