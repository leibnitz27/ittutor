// data.js -- loads and indexes all JSON data files.
// Call getData() once; subsequent calls return the cached result.

let cache = null;

export async function getData() {
    if (cache) return cache;

    const [nouns, adjectives, verbs, phrases, rules] = await Promise.all([
        fetch('./data/nouns.json').then(r => r.json()),
        fetch('./data/adjectives.json').then(r => r.json()),
        fetch('./data/verbs.json').then(r => r.json()),
        fetch('./data/phrases.json').then(r => r.json()),
        fetch('./data/rules.json').then(r => r.json()),
    ]);

    cache = {
        nouns,
        adjectives,
        verbs,
        phrases,
        rules,
        nounIndex: Object.fromEntries(nouns.map(n => [n.it, n])),
        adjIndex:  Object.fromEntries(adjectives.map(a => [a.it, a])),
        verbIndex: Object.fromEntries(verbs.map(v => [v.it, v])),
        ruleIndex: Object.fromEntries(rules.map(r => [r.id, r])),
    };

    return cache;
}
