"""
Validates all data files in ../data/ for schema compliance and internal consistency.
Run from the scripts/ directory or project root.
A clean run prints "All checks passed." — any errors are printed with file and entry context.
"""

import json
import sys
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
errors = []

def err(file, context, message):
    errors.append(f"[{file}] {context}: {message}")

def load(filename):
    path = DATA_DIR / filename
    if not path.exists():
        err(filename, "file", "File not found")
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)

# ── Nouns ────────────────────────────────────────────────────────────────────

VALID_GENDERS       = {"m", "f"}
VALID_ARTICLE_CLASS = {"standard", "lo", "vowel"}
VALID_TIERS         = {1, 2, 3}

def validate_nouns(data):
    seen = set()
    for i, noun in enumerate(data):
        ctx = f"noun[{i}] '{noun.get('it', '?')}'"

        for field in ("it", "en", "gender", "plural", "article_class", "tier"):
            if field not in noun:
                err("nouns.json", ctx, f"Missing field '{field}'")

        if noun.get("gender") not in VALID_GENDERS:
            err("nouns.json", ctx, f"Invalid gender '{noun.get('gender')}' — must be m or f")

        if noun.get("article_class") not in VALID_ARTICLE_CLASS:
            err("nouns.json", ctx, f"Invalid article_class '{noun.get('article_class')}'")

        if not isinstance(noun.get("en"), list) or len(noun["en"]) == 0:
            err("nouns.json", ctx, "Field 'en' must be a non-empty list")

        if noun.get("tier") not in VALID_TIERS:
            err("nouns.json", ctx, f"Invalid tier '{noun.get('tier')}' — must be 1, 2, or 3")

        # article_class consistency: lo-class nouns must be masculine
        if noun.get("article_class") == "lo" and noun.get("gender") != "m":
            err("nouns.json", ctx, "article_class 'lo' only applies to masculine nouns")

        # warn if italian word appears twice
        it = noun.get("it")
        if it in seen:
            err("nouns.json", ctx, f"Duplicate entry for '{it}'")
        seen.add(it)

# ── Adjectives ───────────────────────────────────────────────────────────────

VALID_AGREEMENT = {"4form", "2form", "invariable"}
VALID_POSITION  = {"post", "pre", "either"}
FORM_KEYS       = {"ms", "fs", "mp", "fp"}

def validate_adjectives(data):
    seen = set()
    for i, adj in enumerate(data):
        ctx = f"adjective[{i}] '{adj.get('it', '?')}'"

        for field in ("it", "en", "agreement", "forms", "position", "tier"):
            if field not in adj:
                err("adjectives.json", ctx, f"Missing field '{field}'")

        if adj.get("agreement") not in VALID_AGREEMENT:
            err("adjectives.json", ctx, f"Invalid agreement '{adj.get('agreement')}'")

        if adj.get("position") not in VALID_POSITION:
            err("adjectives.json", ctx, f"Invalid position '{adj.get('position')}'")

        if not isinstance(adj.get("en"), list) or len(adj["en"]) == 0:
            err("adjectives.json", ctx, "Field 'en' must be a non-empty list")

        if adj.get("tier") not in VALID_TIERS:
            err("adjectives.json", ctx, f"Invalid tier '{adj.get('tier')}'")

        forms = adj.get("forms", {})
        if not isinstance(forms, dict):
            err("adjectives.json", ctx, "Field 'forms' must be an object")
        else:
            missing = FORM_KEYS - forms.keys()
            if missing:
                err("adjectives.json", ctx, f"Missing form keys: {missing}")

            agreement = adj.get("agreement")
            if agreement == "invariable":
                unique = set(forms.values())
                if len(unique) != 1:
                    err("adjectives.json", ctx, "Invariable adjective should have identical forms for all keys")
            elif agreement == "2form":
                if forms.get("ms") != forms.get("fs"):
                    err("adjectives.json", ctx, "2-form adjective: ms and fs should be identical")
                if forms.get("mp") != forms.get("fp"):
                    err("adjectives.json", ctx, "2-form adjective: mp and fp should be identical")

        # Synonyms must reference existing adjective entries (checked post-load in main)
        synonyms = adj.get("synonyms", [])
        if not isinstance(synonyms, list):
            err("adjectives.json", ctx, "Field 'synonyms' must be a list")

        it = adj.get("it")
        if it in seen:
            err("adjectives.json", ctx, f"Duplicate entry for '{it}'")
        seen.add(it)

# ── Verbs ────────────────────────────────────────────────────────────────────

VALID_CLASSES   = {"are", "are_iare", "ere", "ire", "ire_isc", "irregular"}
PRONOUN_KEYS    = {"io", "tu", "lui", "noi", "voi", "loro"}

def validate_verbs(data):
    seen = set()
    for i, verb in enumerate(data):
        ctx = f"verb[{i}] '{verb.get('it', '?')}'"

        for field in ("it", "en", "class", "irregular", "present", "tier"):
            if field not in verb:
                err("verbs.json", ctx, f"Missing field '{field}'")

        if verb.get("class") not in VALID_CLASSES:
            err("verbs.json", ctx, f"Invalid class '{verb.get('class')}'")

        if not isinstance(verb.get("irregular"), bool):
            err("verbs.json", ctx, "Field 'irregular' must be a boolean")

        if not isinstance(verb.get("en"), list) or len(verb["en"]) == 0:
            err("verbs.json", ctx, "Field 'en' must be a non-empty list")

        if verb.get("tier") not in VALID_TIERS:
            err("verbs.json", ctx, f"Invalid tier '{verb.get('tier')}'")

        present = verb.get("present", {})
        if not isinstance(present, dict):
            err("verbs.json", ctx, "Field 'present' must be an object")
        else:
            missing = PRONOUN_KEYS - present.keys()
            if missing:
                err("verbs.json", ctx, f"Missing pronoun keys: {missing}")
            for pronoun, form in present.items():
                if not isinstance(form, str) or not form.strip():
                    err("verbs.json", ctx, f"Empty or invalid form for '{pronoun}'")

        # consistency: irregular=True should have class="irregular" (or be flagged)
        if verb.get("irregular") and verb.get("class") not in ("irregular",):
            err("verbs.json", ctx, "irregular=true but class is not 'irregular'")

        it = verb.get("it")
        if it in seen:
            err("verbs.json", ctx, f"Duplicate entry for '{it}'")
        seen.add(it)

# ── Phrases ──────────────────────────────────────────────────────────────────

def validate_phrases(data):
    seen = set()
    for i, phrase in enumerate(data):
        ctx = f"phrase[{i}] '{phrase.get('it', '?')}'"

        for field in ("it", "en"):
            if field not in phrase:
                err("phrases.json", ctx, f"Missing field '{field}'")

        if not isinstance(phrase.get("en"), list) or len(phrase["en"]) == 0:
            err("phrases.json", ctx, "Field 'en' must be a non-empty list")

        it = phrase.get("it")
        if it in seen:
            err("phrases.json", ctx, f"Duplicate entry for '{it}'")
        seen.add(it)

# ── Rules ────────────────────────────────────────────────────────────────────

def validate_rules(data):
    seen_ids = set()
    for i, rule in enumerate(data):
        ctx = f"rule[{i}] '{rule.get('id', '?')}'"

        for field in ("id", "title", "explanation", "examples"):
            if field not in rule:
                err("rules.json", ctx, f"Missing field '{field}'")

        rule_id = rule.get("id")
        if rule_id in seen_ids:
            err("rules.json", ctx, f"Duplicate rule id '{rule_id}'")
        seen_ids.add(rule_id)

        examples = rule.get("examples", [])
        if not isinstance(examples, list) or len(examples) == 0:
            err("rules.json", ctx, "Field 'examples' must be a non-empty list")
        else:
            for j, ex in enumerate(examples):
                if "it" not in ex or "en" not in ex:
                    err("rules.json", ctx, f"Example[{j}] missing 'it' or 'en'")

# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    runners = [
        ("nouns.json",      validate_nouns),
        ("adjectives.json", validate_adjectives),
        ("verbs.json",      validate_verbs),
        ("phrases.json",    validate_phrases),
        ("rules.json",      validate_rules),
    ]

    for filename, validator in runners:
        data = load(filename)
        if data is not None:
            validator(data)

    # Cross-reference: adjective synonyms must point to existing entries
    adjs = load("adjectives.json")
    if adjs:
        adj_words = {a["it"] for a in adjs}
        for adj in adjs:
            for syn in adj.get("synonyms", []):
                if syn not in adj_words:
                    err("adjectives.json", f"adjective '{adj['it']}'", f"Synonym '{syn}' not found in adjectives.json")

    if errors:
        print(f"Found {len(errors)} error(s):\n")
        for e in errors:
            print(f"  {e}")
        sys.exit(1)
    else:
        counts = {}
        for filename, _ in runners:
            data = load(filename)
            counts[filename] = len(data) if data else 0
        print("All checks passed.")
        for filename, count in counts.items():
            print(f"  {filename}: {count} entries")

if __name__ == "__main__":
    main()
