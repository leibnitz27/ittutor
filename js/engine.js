// engine.js -- exercise generation (Phase 3: generation only, no mutation yet)
// All functions are pure -- no side effects, no DOM access.

// ── Utilities ─────────────────────────────────────────────────────────────────

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function byTier(arr, tier) {
    return arr.filter(x => x.tier <= tier);
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Simple English pluraliser -- good enough for our vocabulary set
const EN_IRREGULAR = { 'man': 'men', 'woman': 'women' };

function enPlural(word) {
    if (EN_IRREGULAR[word]) return EN_IRREGULAR[word];
    if (word.endsWith('y') && !'aeiou'.includes(word[word.length - 2]))
        return word.slice(0, -1) + 'ies';  // city -> cities
    if (/(?:s|sh|ch|x|z)$/.test(word)) return word + 'es';
    return word + 's';
}

// ── Grammar: definite articles ────────────────────────────────────────────────
//
// article_class: "standard" | "lo" | "vowel"
// Vowel-class singular returns "l'" (with apostrophe) -- triggers elision in output.

function definiteArticle(noun, number) {
    const sg = number === 'singular';
    if (noun.gender === 'm') {
        if (noun.article_class === 'standard') return sg ? 'il'  : 'i';
        if (noun.article_class === 'lo')       return sg ? 'lo'  : 'gli';
        if (noun.article_class === 'vowel')    return sg ? "l'"  : 'gli';
    } else {
        if (noun.article_class === 'standard') return sg ? 'la'  : 'le';
        if (noun.article_class === 'vowel')    return sg ? "l'"  : 'le';
    }
}

// ── Grammar: indefinite articles (singular only) ──────────────────────────────
//
// Masculine vowel-class uses "un" (not "un'") -- e.g. "un amico", not "un'amico".
// Feminine vowel-class uses "un'" -- e.g. "un'amica".

function indefiniteArticle(noun) {
    if (noun.gender === 'm') {
        return noun.article_class === 'lo' ? 'uno' : 'un';
    } else {
        return noun.article_class === 'vowel' ? "un'" : 'una';
    }
}

// ── Grammar: possessive articles ──────────────────────────────────────────────
//
// Possessive constructions always use the standard definite article (il/la/i/le)
// because the possessive adjective (mio, tua...) intervenes between article and
// noun, blocking both lo-class and vowel elision.
// e.g. "l'amico" but "il mio amico"; "lo zaino" but "il mio zaino".

function possessiveArticle(noun, number) {
    const sg = number === 'singular';
    return noun.gender === 'm' ? (sg ? 'il' : 'i') : (sg ? 'la' : 'le');
}

// ── Grammar: noun and adjective forms ─────────────────────────────────────────

function nounForm(noun, number) {
    return number === 'singular' ? noun.it : noun.plural;
}

// key: ms | fs | mp | fp -- works for 4-form, 2-form, and invariable
function adjForm(adj, gender, number) {
    return adj.forms[`${gender}${number === 'singular' ? 's' : 'p'}`];
}

// essere: è (singular) | sono (plural)
function essereForm(number) {
    return number === 'singular' ? 'è' : 'sono';
}

// ── Grammar: possessive adjectives ───────────────────────────────────────────

const POSSESSIVES = {
    io: { ms: 'mio', fs: 'mia', mp: 'miei', fp: 'mie', en: 'My'   },
    tu: { ms: 'tuo', fs: 'tua', mp: 'tuoi', fp: 'tue', en: 'Your' },
};

function possessiveAdj(owner, gender, number) {
    const p = POSSESSIVES[owner];
    return p ? p[`${gender}${number === 'singular' ? 's' : 'p'}`] : null;
}

// ── Hint detection ────────────────────────────────────────────────────────────
//
// A gender hint is added when the noun is a gendered variant (feminine or
// masculine) so the learner knows which form to produce.

// Only hint when noun IS the gendered variant (has a masculine counterpart).
// Masculine nouns that happen to have a feminine form get no hint.
function genderHint(noun) {
    if (noun.masculine) return '(female)';
    return null;
}

// Epicene nouns have fixed grammatical gender regardless of biological sex.
// Show the opposing biological sex as a hint to challenge the learner's assumption.
function epiceneHint(noun) {
    if (!noun.epicene) return null;
    return noun.gender === 'f' ? '(male)' : '(female)';
}

// ── Token builders ────────────────────────────────────────────────────────────
//
// When the article is elided (ends with "'"), the article and noun are fused
// into a single token: "l'" + "amica" -> "l'amica". The checker sees this as
// one token and tests both article choice and noun form together.

function articleNounTokens(article, nounIt, noun, number, definiteness) {
    const ruleId = definiteness === 'definite' ? 'article_definite' : 'article_indefinite';
    const ctx    = { gender: noun.gender, number, noun: nounIt, article_class: noun.article_class };
    const nounCtx = { gender: noun.gender, number, singular: noun.it };

    if (article.endsWith("'")) {
        return [{
            token:   article + nounIt,
            role:    'article_noun',
            ruleId,
            context: ctx
        }];
    }

    return [
        { token: article, role: 'article', ruleId, context: ctx },
        { token: nounIt,  role: 'noun',    ruleId: number === 'plural' ? 'noun_plural' : null, context: nounCtx }
    ];
}

// Pre-compute all accepted forms for an adjective slot, including synonyms.
// Stored on the token so the checker can accept any of them.
function computeAccepted(adj, gender, number, adjIndex) {
    const forms = [adjForm(adj, gender, number)];
    for (const synIt of (adj.synonyms ?? [])) {
        const syn = adjIndex?.[synIt];
        if (syn) forms.push(adjForm(syn, gender, number));
    }
    return forms;
}

function adjToken(adjIt, adj, noun, number, adjIndex) {
    const ruleId = adj.agreement === 'invariable' ? 'adj_invariable'
        : number === 'plural' ? 'adj_number_agreement'
        : 'adj_gender_agreement';

    return {
        token:    adjIt,
        role:     'adjective',
        ruleId,
        accepted: computeAccepted(adj, noun.gender, number, adjIndex),
        context:  { gender: noun.gender, number, noun: nounForm(noun, number), baseForm: adj.it }
    };
}

function verbToken(form, verb, pronoun) {
    return { token: form, role: 'verb', ruleId: null, context: { verb, pronoun } };
}

// ── Prompt builders ───────────────────────────────────────────────────────────
//
// promptParts is an array of { text, type } where type is "text" or "hint".
// The UI renders hints in italic/muted colour. The plain `prompt` field strips
// hints and is used by the checker for answer validation.

function buildPromptParts(segments) {
    return segments;
}

// ── Exercise templates ────────────────────────────────────────────────────────

// "The red cat" | "A red cat" -> "Il gatto rosso" | "Un gatto rosso"
function buildNounAdj(noun, adj, number, definiteness, adjIndex) {
    const article = definiteness === 'definite'
        ? definiteArticle(noun, number)
        : indefiniteArticle(noun);
    const nounIt  = nounForm(noun, number);
    const adjIt   = adjForm(adj, noun.gender, number);

    const atTokens = articleNounTokens(article, nounIt, noun, number, definiteness);
    const tokens   = [...atTokens, adjToken(adjIt, adj, noun, number, adjIndex)];

    const nounEn = number === 'singular' ? noun.en[0] : enPlural(noun.en[0]);
    const artEn  = definiteness === 'definite' ? 'The' : (number === 'singular' ? 'A' : '');
    const prompt = `${artEn ? artEn + ' ' : ''}${adj.en[0]} ${nounEn}`.trim();

    tokens[0].token = capitalize(tokens[0].token);
    const answer = tokens.map(t => t.token).join(' ');
    tokens[0].token = capitalize(tokens[0].token);  // ensure capitalised in stored token too

    return {
        type: 'translate_to_it', template: 'nounAdj',
        prompt,
        promptParts: buildPromptParts([{ text: prompt, type: 'text' }]),
        hints: [],
        answer,
        answerTokens: tokens,
        components: { noun, adjective: adj, number, definiteness }
    };
}

// "The cat is sick" | "The cats are sick" -> "Il gatto e malato" | "I gatti sono malati"
function buildNounPred(noun, adj, number, adjIndex) {
    const article  = definiteArticle(noun, number);
    const nounIt   = nounForm(noun, number);
    const adjIt    = adjForm(adj, noun.gender, number);
    const essereFm = essereForm(number);
    const pronoun  = number === 'singular' ? 'lui/lei' : 'loro';

    const atTokens = articleNounTokens(article, nounIt, noun, number, 'definite');
    const tokens   = [
        ...atTokens,
        verbToken(essereFm, 'essere', pronoun),
        adjToken(adjIt, adj, noun, number, adjIndex),
    ];

    const hint   = epiceneHint(noun);
    const nounEn = number === 'singular' ? noun.en[0] : enPlural(noun.en[0]);
    const verbEn = number === 'singular' ? 'is' : 'are';
    const prompt = `The ${nounEn} ${verbEn} ${adj.en[0]}`;

    tokens[0].token = capitalize(tokens[0].token);
    const answer = tokens.map(t => t.token).join(' ');

    const promptParts = hint
        ? [{ text: 'The ', type: 'text' }, { text: hint, type: 'hint' }, { text: ` ${nounEn} ${verbEn} ${adj.en[0]}`, type: 'text' }]
        : [{ text: prompt, type: 'text' }];

    return {
        type: 'translate_to_it', template: 'nounPred',
        prompt,
        promptParts,
        hints: hint ? [{ text: hint, display: 'italic-muted' }] : [],
        answer,
        answerTokens: tokens,
        components: { noun, adjective: adj, number, definiteness: 'definite' }
    };
}

// "My dog is sick" | "My (female) dog is tired" -> "Il mio cane e malato" | "La mia cagna e stanca"
function buildPossNounPred(noun, adj, number, owner = 'io', adjIndex) {
    const possArt  = possessiveArticle(noun, number);
    const poss     = possessiveAdj(owner, noun.gender, number);
    const nounIt   = nounForm(noun, number);
    const adjIt    = adjForm(adj, noun.gender, number);
    const essereFm = essereForm(number);
    const pronoun  = number === 'singular' ? 'lui/lei' : 'loro';
    const ownerEn  = POSSESSIVES[owner]?.en ?? 'My';

    const tokens = [
        { token: capitalize(possArt), role: 'article',    ruleId: 'possessive_article', context: { gender: noun.gender, number, noun: nounIt } },
        { token: poss,                role: 'possessive', ruleId: 'possessive_article', context: { gender: noun.gender, number, noun: nounIt } },
        { token: nounIt,              role: 'noun',       ruleId: number === 'plural' ? 'noun_plural' : null, context: { gender: noun.gender, number, singular: noun.it } },
        verbToken(essereFm, 'essere', pronoun),
        adjToken(adjIt, adj, noun, number, adjIndex),
    ];

    const answer = tokens.map(t => t.token).join(' ');

    const hint    = genderHint(noun);
    const baseEn  = noun.en_base ?? noun.en[0];
    const nounEn  = number === 'singular' ? baseEn : enPlural(baseEn);
    const verbEn  = number === 'singular' ? 'is' : 'are';
    const prompt  = `${ownerEn} ${nounEn} ${verbEn} ${adj.en[0]}`;

    const promptParts = hint
        ? [
            { text: `${ownerEn} `, type: 'text' },
            { text: hint,          type: 'hint' },
            { text: ` ${nounEn} ${verbEn} ${adj.en[0]}`, type: 'text' }
          ]
        : [{ text: prompt, type: 'text' }];

    return {
        type: 'translate_to_it', template: 'possNounPred',
        prompt,
        promptParts,
        hints: hint ? [{ text: hint, display: 'italic-muted' }] : [],
        answer,
        answerTokens: tokens,
        components: { noun, adjective: adj, number, definiteness: 'definite', possessive: owner }
    };
}

// ── Main export ───────────────────────────────────────────────────────────────

const TEMPLATES = ['nounAdj', 'nounPred', 'possNounPred'];

// generateExercise(data, options) -> exercise
//
// options:
//   tier        1 | 2 | 3  (default 3 -- all vocabulary)
//   template    'nounAdj' | 'nounPred' | 'possNounPred' (default: random)
//   number      'singular' | 'plural' (default: random)
//   definiteness 'definite' | 'indefinite' (for nounAdj only, default: random)
//   owner       'io' | 'tu' (for possNounPred, default: 'io')
//   noun        noun entry (default: random from tier)
//   adjective   adjective entry (default: random from tier)

export function generateExercise(data, options = {}) {
    const tier         = options.tier         ?? 3;
    const template     = options.template     ?? pick(TEMPLATES);
    const definiteness = options.definiteness ?? pick(['definite', 'indefinite']);
    const owner        = options.owner        ?? 'io';

    const nouns = byTier(data.nouns, tier);
    const adjs  = byTier(data.adjectives, tier);

    const noun = options.noun ?? pick(nouns);

    // Animate-only adjectives (sick, tired, busy…) only pair with animate nouns.
    const compatAdjs = adjs.filter(a => !a.animate_only || noun.animate);
    const adj  = options.adjective ?? pick(compatAdjs.length ? compatAdjs : adjs);

    // Uncountable nouns (water, music…) stay singular in English exercises.
    const number = options.number ?? (noun.singular_only ? 'singular' : pick(['singular', 'plural']));

    const adjIndex = data.adjIndex;

    switch (template) {
        case 'nounAdj':
            return buildNounAdj(noun, adj, number, number === 'plural' ? 'definite' : definiteness, adjIndex);
        case 'nounPred':
            return buildNounPred(noun, adj, number, adjIndex);
        case 'possNounPred':
            return buildPossNounPred(noun, adj, number, owner, adjIndex);
        default:
            return buildNounPred(noun, adj, number, adjIndex);
    }
}

// Exported for use by the mutation engine (Phase 5)
export { buildNounAdj, buildNounPred, buildPossNounPred, definiteArticle, indefiniteArticle, possessiveArticle, nounForm, adjForm, essereForm, possessiveAdj, genderHint, POSSESSIVES };
