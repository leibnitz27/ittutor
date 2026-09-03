# ittutor — Requirements Document

## 1. Purpose

A personal, web-based Italian language tutor designed to complement Duolingo (DL). Non-commercial.

**Learner goal**: become minimally conversational in Italian.

**This tool's role**: DL is flashcard-based — it drills recognition and rearrangement, not production. Learners can pass DL exercises without being able to generate a single sentence unprompted. This tool fills that gap by forcing genuine recall and drilling the grammar DL glosses over.

This tool does not replace DL. It makes what DL teaches actually stick and be usable in conversation.

---

## 2. Core Design Principle

**No word banks. No choices. No reordering.**

Every exercise presents a prompt and a blank input. The learner types the answer in full. This tests recall, not recognition.

---

## 3. Exercise Types

### 3.1 Translation — Production (primary)
- Prompt in English, learner types Italian.
- Example: "The chicken is good" → learner types "Il pollo è buono"
- Full sentence required, not individual words.

### 3.2 Translation — Recognition
- Prompt in Italian, learner types English.
- Less critical but useful for comprehension.

### 3.3 Conjugation in Context
- Not isolated single-slot drills ("viaggiare, voi → ?") — these are mechanical and unproductive.
- Conjugations are tested within full sentences so the form has grammatical context.
- The verb bank is large and includes irregulars stored explicitly (not inferred from rules).

---

## 4. The Mutation System

### 4.1 Concept
When a learner answers correctly, the system mutates the exercise to test a related grammatical concept. This creates a progressive drill without requiring the learner to select difficulty or navigate menus.

### 4.2 Example Progression
1. "A blue rucksack" → "uno zaino blu" ✓
2. Mutation: "The blue rucksacks" → "gli zaini blu"
   - Tests: plural definite article before z, invariable adjective unchanged in plural
3. Mutation: "A red rucksack" → "uno zaino rosso"
   - Tests: 4-form adjective (-o) agreeing with masculine singular noun
4. Mutation: "The red rucksacks" → "gli zaini rossi"
   - Tests: 4-form adjective agreeing with masculine plural

### 4.3 What Can Be Mutated
- Number: singular → plural (or reverse)
- Definiteness: indefinite → definite article (or reverse)
- Gender: swap noun to reveal gendered adjective agreement
- Adjective type: invariable (blu, rosa) vs. 4-form (rosso) vs. 2-form (verde)
- Verb tense or subject pronoun
- Sentence structure

### 4.4 Steering
The system chooses mutations autonomously to avoid decision fatigue. However, the learner can nudge the direction — e.g., "keep testing plurals", "move on from colours", "focus on verbs". The system respects the steer but remains in control of the specific exercise.

---

## 5. Feedback and Explanations

### 5.1 On Correct Answer
- Confirm correct.
- If accent was missing, soft flag: "Correct — watch your accents" (not marked wrong).
- Present mutation.

### 5.2 On Incorrect Answer
- Show the correct answer.
- Identify the specific error type and explain the rule.
- Example: learner types "Il mio gatto è impegnati"
  - System detects: "impegnato" is a 4-form adjective; "gatto" is masculine singular; learner used masculine plural ending "-i"
  - Explanation: "Adjectives must agree with the noun in both gender and number. 'Gatto' is masculine singular, so 'impegnato' takes the -o ending, not the plural -i."
- No mutation after an incorrect answer — repeat or closely related exercise instead.

### 5.3 Explanation on Demand
- At any point the learner can request a detailed explanation ("explain this").
- The system serves a pre-written, rule-based explanation for the relevant grammar point.
- **No runtime API calls.** All explanations are encoded in the grammar rule database at build time.
- An incorrect explanation is treated as a serious defect — worse than no explanation. The system will not explain a rule it cannot explain correctly.

---

## 6. Accent Handling

### 6.1 On-screen Accent Buttons
- A row of buttons below the input field for common Italian accented characters: à, è, é, ì, ò, ù (and uppercase variants).
- Clicking a button inserts the character at the current cursor position.
- Priority: è and à (most frequent in Italian).

### 6.2 Soft Accent Forgiveness
- Answers missing accents but otherwise correct are marked correct.
- A non-blocking notice is shown: "Correct — remember the accent on 'è'."
- Answers with wrong accent type (e.g., é instead of è) are treated the same way — soft flag, not failure.

---

## 7. Grammar Coverage

The following areas are in scope. The system must handle them correctly, including exceptions.

### 7.1 Articles
- Definite: il, lo, la, l', i, gli, le
- Indefinite: un, uno, una, un'
- Rules: lo/gli before s+consonant, z, ps, gn, x, y; l'/un' before vowels
- Partitive articles (del, della, etc.) — lower priority, included in data but may be deferred

### 7.2 Nouns
- Gender (masculine/feminine) stored explicitly per noun
- Plural forms stored explicitly (not inferred) — covers irregular plurals (uomo→uomini, mano→mani, braccio→braccia)
- Article behaviour flagged per noun (e.g., nouns beginning with z or s+consonant)

### 7.3 Adjectives
- Tagged by agreement pattern:
  - **4-form**: -o / -a / -i / -e (e.g., rosso, rossa, rossi, rosse)
  - **2-form**: -e / -i regardless of gender (e.g., verde/verdi)
  - **Invariable**: no change for gender or number (e.g., blu, rosa, viola)
- Position: most adjectives follow the noun; common exceptions (bello, buono, grande, etc.) noted
- Adjectives with irregular forms before nouns (bel/bell'/bello, buon/buono) handled explicitly

### 7.4 Verbs
- Large verb bank
- Regular patterns: -are, -ere, -ire (including isc- subgroup)
- Irregular verbs stored with full conjugation tables (essere, avere, andare, fare, dare, stare, etc.)
- Tenses in scope (initial): present indicative
- Additional tenses (passato prossimo, imperfetto, futuro, congiuntivo) are deferred but the data model must treat tense as a first-class dimension so they can be added without structural changes
- Subject pronouns: io, tu, lui/lei, noi, voi, loro
- Pronoun optionality: "Visitiamo Roma" and "Noi visitiamo Roma" both accepted

### 7.5 Possessives
- Require definite article: il mio, la mia, i miei, le mie, etc.
- Exception: singular unmodified family members drop the article (mio padre, not il mio padre)
- Exception does not apply with loro (il loro padre)

### 7.6 Key Constructions
- "Ci sono / C'è" (there is / there are)
- "Anche" (also/too) and word order
- "Ogni" + singular noun (ogni anno, ogni estate)

---

## 8. Data Architecture

### 8.1 Principle
The system is entirely self-contained — no runtime API calls. All content and explanations are encoded in a structured data set at build time.

### 8.2 Data Sources
- Generated using LLM API calls during the design/build phase
- Cross-checked against authoritative references (Treccani, WordReference)
- Reviewed by the learner before inclusion — any uncertain entry is excluded
- Uncertain or low-confidence entries are flagged in the data and withheld from exercises until verified

### 8.3 Scale
Estimated coverage: fewer than 100,000 concrete exercise instances, generated from a smaller set of vocabulary entries + grammar rules.

### 8.4 Data Components
- **Noun dictionary**: word, gender, plural, article class, English translation(s)
- **Adjective dictionary**: word, agreement pattern, English translation(s), position notes
- **Verb dictionary**: infinitive, regularity class, full present-tense conjugation, English translation(s)
- **Grammar rules**: typed rules with pre-written learner-facing explanations and concrete examples
- **Exercise templates**: sentence patterns that can be instantiated from dictionary entries
- **Mutation rules**: which grammatical dimensions can be varied on a given exercise, and how

---

## 9. Quality Standard

- A wrong correction (telling the learner they are wrong when they are right, or explaining a rule incorrectly) is a **critical defect**.
- The system must not attempt to explain a rule it cannot explain correctly — silence is preferable to a confident wrong explanation.
- Data generation at build time uses API calls and human review; runtime behaviour is fully deterministic.

---

## 10. Out of Scope (for now)

- Audio / listening exercises
- Speaking / pronunciation
- Reading graded texts
- Importing DL progress or vocabulary
- Multi-user / accounts
- Mobile app (web only, but mobile-browser friendly for accent buttons)
- Any tense other than present indicative (initial release — extensible by design, not abandoned)
