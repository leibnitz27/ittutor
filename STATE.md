# ittutor — Project State

## What this is
A personal web-based Italian language tutor to supplement DL (Duolingo). Non-commercial.
Goal: minimally conversational Italian, drilling genuine recall (blank input, no word banks).

## Status
**Phase 5 complete + significant bugfixes and UX improvements.**
Next: fix 2-form adjective error messages and explanations (adj_2form ruleId).

## Tech Stack
- Plain JavaScript ES modules — no build step, runs directly in browser
- Bootstrap 5.3 via CDN
- JSON data files, loaded with fetch() and cached in data.js
- Python — validation and data scripts only
- `scripts/serve.py` — custom HTTP server (sets text/javascript MIME for .js ES modules)
- Run: `python scripts/serve.py` → http://localhost:8000

## File Structure
```
ittutor/
├── index.html              main app
├── css/app.css
├── js/
│   ├── app.js              entry point — state, retry queue, event wiring
│   ├── data.js             loads + indexes all JSON; call getData()
│   ├── engine.js           exercise generation; generateExercise(data, options)
│   ├── checker.js          answer checking; check(userInput, exercise)
│   └── ui.js               all DOM access; showExercise / showCorrect / showIncorrect
├── data/
│   ├── nouns.json          109 entries
│   ├── adjectives.json     53 entries
│   ├── verbs.json          39 entries
│   ├── phrases.json        5 entries
│   └── rules.json          10 entries
└── scripts/
    ├── validate.py         schema + cross-reference validation
    ├── serve.py            dev HTTP server
    └── tag_compat.py       one-shot script — added animate/singular_only/animate_only tags
```

## Phase Completion
- [x] Phase 1 — Data schemas defined
- [x] Phase 2 — checker.js
- [x] Phase 3 — engine.js (generation, no mutation yet)
- [x] Phase 4 — UI shell (index.html, app.js, ui.js, css/app.css)
- [x] Phase 8 — Data expansion (done early: 109 nouns, 53 adj, 39 verbs)
- [x] Phase 5 — Mutation system
- [ ] Phase 6 — Explainer (rules.json expansion + explainer.js)
  - Next up: adj_2form ruleId — 2-form adjectives need separate rule, error message, and explanation
    (current adj_gender_agreement message misleadingly implies gender change when form is invariant)
- [ ] Phase 7 — Steering UI

## UI Features (Phase 4)
- Prompt area with inline hints rendered italic/muted (promptParts system)
- Text input + Check button; Enter key works throughout
- Accent buttons: à è é ì ò ù — insert at cursor, no focus steal (mousedown + preventDefault)
- Feedback: per-token colour coding (green/red/orange), error messages per wrong token
- Hint button: shows base dictionary form of noun + adjective (e.g. "boat = barca")
- Explain button: shows grammar rule from rules.json for current exercise
- Retry queue: failed exercises return after 3 successes
- Streak + queue-length badge
- Vocabulary tier selector (Essential/Common/Full); changing tier refreshes exercise

## Key Design Decisions
- Retry queue: N=3 successes before reinserting failed exercise
- Partial credit: checker identifies correct and wrong tokens separately
- Vocabulary tiers: tier 1 ≈ top 100, tier 2 ≈ top 500, tier 3 ≈ top 1000 content words
- Noun/adjective compatibility: animate_only adjectives (malato, stanco, impegnato, furbo, astuto)
  only pair with animate nouns; singular_only nouns (acqua, musica, cibo, amore, erba, verdura)
  never get plural exercises
- Gender pairs: opt-in via noun.feminine / noun.masculine fields (gatto/gatta, cane/cagna, amico/amica)
- en_base: feminine-variant nouns use base English word in prompt (cagna.en_base = "dog")
- Epicene nouns: fixed grammatical gender regardless of referent's sex
  — feminine: vittima, guardia, spia, sentinella, volpe, persona
  — masculine: soprano
- Elided articles fused with noun into one token (l'amica = single token, role: article_noun)
- Possessive constructions always use standard article (il/la/i/le), not lo/l'
- Synonyms: engine pre-computes accepted[] and acceptedBases[] on adjective tokens; checker accepts
  any synonym form and reports errors against the closest synonym (Levenshtein distance)
- Gender hint: hint box shows noun + adjective base forms; secondary "show gender" link (right-aligned)
  reveals (feminine)/(masculine) on demand
- Mutation system: after correct answer, next exercise varies one dimension (number, adjective, noun,
  gender_swap, definiteness, owner, template); wrong answer or skip breaks the chain
- No-cache headers on dev server (scripts/serve.py) — normal refresh always gets fresh files
- Test files: test_checker.html, test_engine.html — run in browser at localhost:8000

## Data Schema Notes
- nouns.json fields: it, en, en_base?, gender, plural, article_class, tier,
  masculine?, feminine?, epicene?, animate?, singular_only?, warning?, notes?
- adjectives.json fields: it, en, agreement, forms{ms,fs,mp,fp}, position, tier,
  synonyms?, animate_only?, notes?
- verbs.json fields: it, en, class, irregular, present{io,tu,lui,noi,voi,loro}, tier, notes?
- article_class: "standard" | "lo" (masc only: z, s+cons, gn…) | "vowel" (starts with vowel)
- agreement: "4form" | "2form" | "invariable"
- verb class: "are" | "are_iare" | "ere" | "ire" | "ire_isc" | "irregular"
