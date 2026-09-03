// checker.js -- answer comparison and error classification
// Takes user input + an annotated exercise, returns structured feedback.
// No DOM access. No data file imports. Pure logic.

function normalize(str) {
    return str
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[.,!?;:]+$/, '');
}

function stripAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function tokenize(str) {
    return str.split(/\s+/).filter(t => t.length > 0);
}

// Words where a missing accent produces a different word entirely.
// Still treated as accentOnly (soft error) but with a richer message.
const ACCENT_WORD_PAIRS = {
    'e':  { accented: 'è', note: "'e' means 'and' -- 'è' (with accent) means 'is'" },
    'si': { accented: 'sì', note: "'si' is a reflexive pronoun -- 'sì' (with accent) means 'yes'" },
    'la': { accented: 'là', note: "'la' is an article/pronoun -- 'là' (with accent) means 'there'" },
    'li': { accented: 'lì', note: "'li' is a pronoun -- 'lì' (with accent) means 'there'" },
    'da': { accented: 'dà', note: "'da' is a preposition -- 'dà' (with accent) means 'gives'" },
    'ne': { accented: 'né', note: "'ne' is a particle -- 'né' (with accent) means 'neither/nor'" },
};

function accentMessage(got, expected) {
    const pair = ACCENT_WORD_PAIRS[got];
    if (pair && pair.accented === expected) return pair.note;
    return `Missing accent: '${got}' should be '${expected}'`;
}

// Short inline message for an incorrect token.
// context is populated by the engine when building the exercise.
function shortMessage(got, expected, role, context) {
    const noun      = context?.noun ?? '';
    const gender    = context?.gender;
    const number    = context?.number;
    const genderWord = gender === 'f' ? 'feminine' : gender === 'm' ? 'masculine' : '';
    const numberWord = number === 'plural' ? 'plural' : 'singular';

    switch (role) {
        case 'article':
            if (noun && genderWord)
                return `'${noun}' is ${genderWord} -- use '${expected}', not '${got}'`;
            return `Use '${expected}', not '${got}'`;

        case 'possessive':
            if (genderWord)
                return `Possessive must agree with the noun (${genderWord}) -- use '${expected}', not '${got}'`;
            return `Use '${expected}', not '${got}'`;

        case 'adjective': {
            const baseAdj = context?.baseForm ?? '';
            if (genderWord && number)
                return `'${baseAdj}' must agree: ${noun ? `'${noun}' is ` : ''}${genderWord} ${numberWord} -- use '${expected}'`;
            return `Adjective form wrong -- use '${expected}', not '${got}'`;
        }

        case 'verb':
            if (context?.verb && context?.pronoun)
                return `${context.verb}, ${context.pronoun} -> '${expected}', not '${got}'`;
            return `Use '${expected}', not '${got}'`;

        case 'noun':
            if (number === 'plural')
                return `Plural of '${context?.singular ?? got}' is '${expected}', not '${got}'`;
            return `Use '${expected}', not '${got}'`;

        default:
            return `Use '${expected}', not '${got}'`;
    }
}

// ---------------------------------------------------------------------------
// Main export
//
// exercise shape:
//   answer:       string
//   answerTokens: [{ token, role, ruleId, context }]
//   components:   { noun, adjective, number, definiteness, ... }
//
// Returns:
//   correct:         bool   -- true if answer acceptable (accent errors forgiven)
//   accentOnly:      bool   -- true if the only issues are missing/wrong accents
//   tokens:          array  -- one entry per expected token
//     { expected, got, correct, accentOnly, role, ruleId, message }
//   structuralError: null | { message, userCount, expectedCount }
// ---------------------------------------------------------------------------

export function check(userInput, exercise) {
    const userNorm     = normalize(userInput);
    const expectedNorm = normalize(exercise.answer);

    if (userNorm === expectedNorm) {
        return { correct: true, accentOnly: false, tokens: [], structuralError: null };
    }

    const userTokens   = tokenize(userNorm);
    const answerTokens = exercise.answerTokens;

    if (userTokens.length !== answerTokens.length) {
        return {
            correct: false,
            accentOnly: false,
            tokens: [],
            structuralError: {
                userCount:     userTokens.length,
                expectedCount: answerTokens.length,
                message: `Expected ${answerTokens.length} word${answerTokens.length !== 1 ? 's' : ''}, got ${userTokens.length}.`
            }
        };
    }

    const tokens = answerTokens.map((at, i) => {
        const got      = userTokens[i];
        const expected = at.token.toLowerCase();

        // accepted: primary form + any synonym equivalents pre-computed by engine
        const accepted        = (at.accepted ?? [at.token]).map(a => a.toLowerCase());
        const acceptedStripped = accepted.map(stripAccents);

        if (accepted.includes(got)) {
            return {
                expected: at.token, got,
                correct: true, accentOnly: false,
                role: at.role, ruleId: at.ruleId,
                message: null
            };
        }

        if (acceptedStripped.includes(stripAccents(got))) {
            // Find which accepted form they were close to for the message
            const closestIdx = acceptedStripped.indexOf(stripAccents(got));
            const closest    = (at.accepted ?? [at.token])[closestIdx];
            return {
                expected: at.token, got,
                correct: true, accentOnly: true,
                role: at.role, ruleId: at.ruleId,
                message: accentMessage(got, closest)
            };
        }

        return {
            expected: at.token, got,
            correct: false, accentOnly: false,
            role: at.role, ruleId: at.ruleId,
            message: shortMessage(got, at.token, at.role, at.context)
        };
    });

    const effectivelyCorrect = tokens.every(t => t.correct || t.accentOnly);
    const hasAccentIssue     = tokens.some(t => t.accentOnly);

    return {
        correct:         effectivelyCorrect,
        accentOnly:      effectivelyCorrect && hasAccentIssue,
        tokens,
        structuralError: null
    };
}
