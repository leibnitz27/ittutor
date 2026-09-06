# Interrogami

**[Live version](https://leibnitz27.github.io/ittutor/)**

A personal Italian drilling tool that forces genuine recall — no word banks, no multiple choice.

## Motivation

Duolingo is fun, but its exercises almost always offer a small list of options where most are obviously wrong. You can bluff through most of them with minimal knowledge, which means the grammar never really sticks. This is particularly true for noun/adjective agreement: gender, number, articles, possessives.

Interrogami fixes that by making you type the full Italian answer from scratch.

## What it drills

- Definite and indefinite articles (*il / la / lo / l' / i / le / gli / un / una / un'*)
- Noun plurals, including irregulars
- Adjective agreement in gender and number (4-form, 2-form, and invariable)
- Possessives (*mio / mia / miei / mie*, *tuo / tua / tuoi / tue*)
- Nuclear family constructions (*mio padre*, not *il mio padre*)
- Predicative and attributive positions (*il gatto rosso* vs *il gatto è rosso*)
- Elision before vowels (*l'amico*, *l'uva*, *un'amica*)

## Features

- **Blank input** — no hints unless you ask for them
- **Per-token feedback** — each word is marked correct, accent-only, or wrong, with a specific explanation
- **Expandable paradigm tables** — article, possessive, and adjective forms shown on error
- **Retry queue** — wrong answers return after 3 correct answers
- **Mutation system** — after a correct answer, the next exercise varies one dimension (number, gender, adjective, owner, template) to build on what you just did
- **Vocabulary tiers** — Essential / Common / Full; change at any time
- **Accent buttons** — à è é ì ò ù, inserted at cursor without stealing focus
- **Grammar notes** — on-demand rule explanations with examples

## Tech

Plain JavaScript ES modules, no build step, no framework. Bootstrap 5.3 via CDN for layout. Data in JSON files. Runs entirely in the browser.

```
python scripts/serve.py   # → http://localhost:8000
```

Tests: open `test_checker.html` or `test_engine.html` in the browser.

## Status

Active personal project. Vocabulary covers ~124 nouns and ~54 adjectives across three tiers. Verb conjugation and more sentence templates are planned.

## Vibe-coding note

This project has been built entirely with Claude Code — Claude handles the linguistic accuracy as well as the code. There have been a few errors along the way, but it's been a pretty good collaborator for both.
