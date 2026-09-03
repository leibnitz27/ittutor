# ittutor — Implementation Plan

## Build Order

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✓ done | Data schemas |
| 2 | ✓ done | checker.js |
| 3 | ✓ done | engine.js — generation |
| 4 | ✓ done | UI shell |
| 8 | ✓ done | Data expansion (done early) |
| 5 | next   | Mutation system |
| 6 | —      | Explainer |
| 7 | —      | Steering UI |

---

## Phase 5 — Mutation System

Given a correct answer, pick one dimension to vary and generate the next exercise.
This creates a connected drill sequence rather than random hops.

### Mutation dimensions
- `number`        — singular ↔ plural (updates noun, article, adjective ending)
- `definiteness`  — definite ↔ indefinite (updates article; singular nounAdj only)
- `adjective`     — swap to a different adjective (respect animate_only constraint)
- `noun`          — swap to a different noun (may change gender → cascades to article + adj)
- `gender_swap`   — swap noun to its gendered counterpart (gatto→gatta, amico→amica)
                    Only available when noun has feminine/masculine field.
                    Cascades: article and adjective forms update to match.
                    Nouns with `warning` field: show popup on completion.
- `owner`         — swap possessive owner io↔tu (possNounPred template only)
- `template`      — switch between nounAdj / nounPred / possNounPred for the same components

### Implementation plan
- `mutateDimension(exercise, data, dimension)` → new exercise
- `pickMutation(exercise)` → dimension string (weighted; avoids repeating last mutation)
- `generateNext(exercise, data, options)` → tries mutation, falls back to fresh if no valid target

### Mutation weights (default)
- number: 3, adjective: 3, noun: 3, gender_swap: 2, definiteness: 1, owner: 1, template: 1

---

## Phase 6 — Explainer

The Explain button currently stubs to rules.json lookups via ruleId on answerTokens.
Full implementation needs:

1. **Expand rules.json** — currently 10 rules; need richer explanations and more examples
2. **explainer.js** (optional) — if rule rendering becomes complex enough to separate
3. **Warning popups** — nouns with `warning` field show a contextual note on completion
   (cagna: "cagna is correct but has strong connotations in everyday speech")

### ruleId values in use
- `article_definite` — definite article selection (il/lo/la/l'/i/gli/le)
- `article_indefinite` — indefinite article (un/uno/una/un')
- `possessive_article` — possessive construction article (always standard il/la/i/le)
- `adj_gender_agreement` — adjective agrees with noun gender
- `adj_number_agreement` — adjective agrees with noun number
- `adj_invariable` — invariable adjective (blu, rosa) — no change needed
- `noun_plural` — noun plural form

---

## Phase 7 — Steering UI

User can steer the session without losing the mutation chain.

### Steer options
- **Focus: plurals** — weight number mutation heavily
- **Focus: adjectives** — weight adjective mutation heavily  
- **Focus: gender** — weight gender_swap mutation heavily
- **Skip: colours** — exclude colour adjectives from pool
- **Tier change** — already implemented (dropdown, refreshes immediately)

### Implementation
- Steer panel (collapsible) below the main action buttons
- Steer state stored in `app.js` state object, passed to `generateNext` as options
- Steer resets on session reload

---

## Phase 5 Detail — Mutation Engine

```js
// engine.js additions

export function mutateDimension(exercise, data, dimension, options = {}) {
    const { noun, adjective, number, definiteness, possessive } = exercise.components;
    const tier = options.tier ?? 3;

    switch (dimension) {
        case 'number':
            return buildSameTemplate(exercise, data, {
                number: number === 'singular' ? 'plural' : 'singular'
            });
        case 'definiteness':
            // nounAdj only; singular only (indefinite plural uses definite)
            return buildNounAdj(noun, adjective, 'singular',
                definiteness === 'definite' ? 'indefinite' : 'definite',
                data.adjIndex);
        case 'adjective':
            const pool = byTier(data.adjectives, tier)
                .filter(a => a.it !== adjective.it && (!a.animate_only || noun.animate));
            return buildSameTemplate(exercise, data, { adjective: pick(pool) });
        case 'noun':
            const npool = byTier(data.nouns, tier).filter(n => n.it !== noun.it);
            return buildSameTemplate(exercise, data, { noun: pick(npool) });
        case 'gender_swap':
            const partner = noun.feminine
                ? data.nounIndex[noun.feminine]
                : noun.masculine ? data.nounIndex[noun.masculine] : null;
            if (!partner) return null;
            return buildSameTemplate(exercise, data, { noun: partner });
    }
}
```

---

## Data Notes

### Compatibility tags (added Phase 8)
- `noun.animate: true` — person or animal; required for animate_only adjectives
- `noun.singular_only: true` — uncountable in English; engine forces singular
- `adj.animate_only: true` — only pairs with animate nouns (malato, stanco, impegnato, furbo, astuto)

### Epicene nouns
Fixed grammatical gender regardless of referent sex. Engine shows opposing-sex hint.
- Feminine: vittima, guardia, spia, sentinella, volpe, persona
- Masculine: soprano

### Gender pairs (opt-in)
- gatto ↔ gatta
- cane ↔ cagna  (warning field on cagna)
- amico ↔ amica

### article_class for feminine nouns
`lo` class does NOT apply to feminine nouns. Only masculine nouns starting with
z, s+consonant, gn, ps, x use lo/gli. Feminine nouns always use la/le regardless
of starting letter (e.g. "la strada", not "lo strada").

### Possessive article rule
Possessive constructions always revert to standard article (il/la/i/le).
`il mio zaino` (not `lo mio zaino`); `il mio amico` (not `l'mio amico`).

### Elided article token fusion
When definite article ends with ' (l'), article+noun fuse into one token.
`l'amica` = single token, role: `article_noun`. Checker sees one unit.

---

## Exercise Object Shape

```js
{
  type:         'translate_to_it',
  template:     'nounAdj' | 'nounPred' | 'possNounPred',
  prompt:       'The red cat',                    // plain English, for checker
  promptParts:  [{ text, type: 'text'|'hint' }],  // for rendering; hints italic/muted
  hints:        [{ text, display }],              // structured hint list
  answer:       'Il gatto rosso',
  answerTokens: [
    { token, role, ruleId, context, accepted? }
  ],
  components: {
    noun, adjective, number, definiteness, possessive?
  }
}
```

### Token roles
- `article` — standalone article (il, la, lo, etc.)
- `article_noun` — fused elided article+noun (l'amica)
- `noun` — standalone noun
- `adjective` — adjective
- `verb` — verb form (è, sono)
- `possessive` — possessive adjective (mio, tua, etc.)

---

## Checker Output Shape

```js
{
  correct:         bool,
  accentOnly:      bool,
  tokens:          [{ expected, got, correct, accentOnly, role, ruleId, message }],
  structuralError: null | { message, userCount, expectedCount }
}
```
