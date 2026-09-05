// ui.js -- all DOM access. No game logic, no data imports.

const el = id => document.getElementById(id);

// ── Init ───────────────────────────────────────────────────────────────────

export function init({ onCheck, onNext, onTierChange, onSkip }) {
    el('check-btn').addEventListener('click', () => {
        if (el('check-btn').dataset.mode === 'next') onNext();
        else onCheck();
    });

    el('answer-input').addEventListener('input', syncCheckBtn);

    el('answer-input').addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        if (el('check-btn').dataset.mode === 'next') onNext();
        else onCheck();
    });

    el('tier-select').addEventListener('change', e => {
        onTierChange(Number(e.target.value));
    });

    el('skip-btn').addEventListener('click', onSkip);

    document.querySelectorAll('.accent-btn').forEach(btn => {
        btn.addEventListener('mousedown', e => {
            e.preventDefault(); // keep focus on input
            insertAccent(btn.dataset.char);
        });
    });

    el('explain-btn').addEventListener('click', toggleExplain);
    el('hint-btn').addEventListener('click', toggleHint);
}

// ── Accent insertion ───────────────────────────────────────────────────────

function syncCheckBtn() {
    const btn = el('check-btn');
    if (btn.dataset.mode === 'next') return;
    btn.disabled = !el('answer-input').value.trim();
}

function insertAccent(ch) {
    const input = el('answer-input');
    const start = input.selectionStart ?? input.value.length;
    const end   = input.selectionEnd   ?? input.value.length;
    input.setRangeText(ch, start, end, 'end');
    input.focus();
    syncCheckBtn();
}

// ── Exercise display ───────────────────────────────────────────────────────

export function showExercise(exercise) {
    const promptEl = el('prompt');
    promptEl.innerHTML = '';

    for (const part of exercise.promptParts) {
        const span = document.createElement('span');
        span.textContent = part.text;
        if (part.type === 'hint') span.className = 'hint-text';
        promptEl.appendChild(span);
    }

    const input = el('answer-input');
    input.value    = '';
    input.disabled = false;
    input.classList.remove('is-valid', 'is-invalid');
    input.focus();

    el('check-btn').textContent    = 'Check';
    el('check-btn').dataset.mode   = 'check';
    el('check-btn').className      = 'btn btn-primary px-4';
    el('check-btn').disabled       = true;
    el('feedback').innerHTML       = '';
    el('hint-panel').classList.add('d-none');
    el('explainer').classList.add('d-none');
}

export function getInput() {
    return el('answer-input').value;
}

// ── Feedback ───────────────────────────────────────────────────────────────

function lockInput(valid) {
    const input = el('answer-input');
    input.disabled = true;
    input.classList.toggle('is-valid',   valid);
    input.classList.toggle('is-invalid', !valid);

    el('check-btn').textContent  = 'Next →';
    el('check-btn').dataset.mode = 'next';
    el('check-btn').className    = 'btn btn-outline-secondary px-4';
    el('check-btn').disabled     = false;
}

export function showCorrect(result, exercise) {
    lockInput(true);

    let html = '<div class="alert alert-success mb-0">';
    if (result.accentOnly) {
        html += '<strong>✓ Correct!</strong> Watch your accents:';
        html += '<ul class="mb-0 mt-1 small">';
        for (const t of result.tokens.filter(t => t.accentOnly)) {
            html += `<li>${escHtml(t.message)}</li>`;
        }
        html += '</ul>';
    } else {
        html += `<strong>✓ Correct!</strong>`;
    }
    html += '</div>';

    el('feedback').innerHTML = html;
}

export function showIncorrect(result, exercise) {
    lockInput(false);

    let html = '<div class="alert alert-danger mb-0">';

    if (result.structuralError) {
        html += `<strong>✗</strong> ${escHtml(result.structuralError.message)}`;
        html += `<div class="mt-2">Correct answer: <strong>${escHtml(exercise.answer)}</strong></div>`;
    } else {
        html += '<strong>✗ Not quite.</strong>';
        html += `<div class="mt-2 answer-tokens">${renderTokens(result.tokens)}</div>`;

        const errors = result.tokens.filter(t => !t.correct && !t.accentOnly);
        if (errors.length) {
            html += '<ul class="mb-0 mt-2 small">';
            for (const t of errors) html += `<li>${escHtml(t.message)}</li>`;
            html += '</ul>';
        }

        const adjError  = errors.find(t => t.role === 'adjective');
        const possError = errors.find(t => t.role === 'possessive');
        const artError  = errors.find(t => t.role === 'article');
        const adj   = adjError  ? exercise.components?.adjective : null;
        const owner = possError ? exercise.components?.possessive : null;
        const noun  = artError  ? exercise.components?.noun      : null;
        if (noun)  html += buildArticleParadigm(noun, artError?.ruleId === 'possessive_article');
        if (owner) html += buildPossessiveParadigm(owner);
        if (adj)   html += buildAdjectiveParadigm(adj);
    }

    html += '</div>';
    el('feedback').innerHTML = html;
}

function renderTokens(tokens) {
    return tokens.map(t => {
        const word = escHtml(t.expected);
        if (t.correct && !t.accentOnly) return `<span class="token-ok">${word}</span>`;
        if (t.accentOnly)               return `<span class="token-accent" title="${escHtml(t.message)}">${word}</span>`;
        return `<span class="token-err" title="${escHtml(t.message)}">${word}</span>`;
    }).join(' ');
}

// ── Streak ─────────────────────────────────────────────────────────────────

export function updateStreak(n, queueLen) {
    const badge = el('streak-badge');
    if (n === 0 && queueLen === 0) { badge.textContent = ''; return; }
    let parts = [];
    if (n > 0)        parts.push(`${n} in a row`);
    if (queueLen > 0) parts.push(`${queueLen} to revisit`);
    badge.textContent = parts.join(' · ');
}

// ── Hint ───────────────────────────────────────────────────────────────────

let _hintExercise = null;

export function setHintContext(exercise) {
    _hintExercise = exercise;
    el('hint-panel').classList.add('d-none');
}

function toggleHint() {
    const panel = el('hint-panel');
    if (!panel.classList.contains('d-none')) {
        panel.classList.add('d-none');
        return;
    }
    el('hint-content').innerHTML = buildHint(_hintExercise);
    panel.classList.remove('d-none');
}

function buildHint(exercise) {
    if (!exercise) return '';
    const { noun, adjective } = exercise.components;
    const parts = [];

    if (noun) {
        const en     = noun.en_base ?? noun.en[0];
        const gender = noun.gender === 'f' ? 'feminine' : 'masculine';
        parts.push(
            `<div class="d-flex justify-content-between align-items-baseline">` +
            `<span><strong>${escHtml(en)}</strong> = ${escHtml(noun.it)}</span>` +
            `<span>` +
            `<span id="hint-gender" class="d-none text-muted small">(${gender})</span>` +
            `<a href="#" id="hint-gender-btn" class="ms-2 small"` +
            ` onclick="document.getElementById('hint-gender').classList.remove('d-none');this.remove();return false;">show gender</a>` +
            `</span>` +
            `</div>`
        );
    }
    if (adjective) {
        parts.push(`<div><strong>${escHtml(adjective.en[0])}</strong> = ${escHtml(adjective.it)}</div>`);
    }

    return parts.length
        ? parts.join('')
        : '<em class="text-muted">No vocabulary hints for this exercise.</em>';
}

// ── Explainer ──────────────────────────────────────────────────────────────

let _currentExercise = null;
let _ruleIndex       = null;

export function setExplainerContext(exercise, ruleIndex) {
    _currentExercise = exercise;
    _ruleIndex       = ruleIndex;
    el('explainer').classList.add('d-none');
}

function toggleExplain() {
    const panel = el('explainer');
    if (!panel.classList.contains('d-none')) {
        panel.classList.add('d-none');
        return;
    }
    el('explainer-content').innerHTML = buildExplainer();
    panel.classList.remove('d-none');
}

const POSSESSIVE_FORMS = {
    io: { ms: 'mio', fs: 'mia', mp: 'miei', fp: 'mie' },
    tu: { ms: 'tuo', fs: 'tua', mp: 'tuoi', fp: 'tue' },
};

function buildPossessiveParadigm(owner) {
    const p = POSSESSIVE_FORMS[owner];
    if (!p) return '';
    const label = owner === 'io' ? 'mio (my)' : 'tuo (your)';
    const rows =
        `<tr><td class="text-muted pe-3">masculine</td>` +
        `<td class="pe-3">${p.ms}</td><td>${p.mp}</td></tr>` +
        `<tr><td class="text-muted pe-3">feminine</td>` +
        `<td class="pe-3">${p.fs}</td><td>${p.fp}</td></tr>`;
    return `
        <details class="small mt-2 mb-3">
            <summary class="text-muted" style="cursor:pointer">All forms of <em>${label}</em></summary>
            <table class="mt-2 ms-2">
                <thead><tr>
                    <th></th>
                    <th class="pe-3 fw-normal text-muted">singular</th>
                    <th class="fw-normal text-muted">plural</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </details>`;
}

function artPair(noun, forPossessive) {
    if (forPossessive) {
        return noun.gender === 'f' ? { sg: 'la', pl: 'le' } : { sg: 'il', pl: 'i' };
    }
    const g = noun.gender, ac = noun.article_class;
    if (g === 'm') {
        if (ac === 'lo')    return { sg: 'lo',  pl: 'gli' };
        if (ac === 'vowel') return { sg: "l'",  pl: 'gli' };
        return                     { sg: 'il',  pl: 'i'   };
    } else {
        if (ac === 'vowel') return { sg: "l'",  pl: 'le'  };
        return                     { sg: 'la',  pl: 'le'  };
    }
}

function buildArticleParadigm(noun, forPossessive = false) {
    const { sg, pl } = artPair(noun, forPossessive);
    const genderWord  = noun.gender === 'f' ? 'feminine' : 'masculine';
    const sgForm = sg.endsWith("'") ? sg + noun.it : sg + ' ' + noun.it;
    const plForm = noun.plural ? pl + ' ' + noun.plural : null;

    let rows = `<tr><td class="text-muted pe-3">singular</td><td>${escHtml(sgForm)}</td></tr>`;
    if (plForm) rows += `<tr><td class="text-muted pe-3">plural</td><td>${escHtml(plForm)}</td></tr>`;

    return `
        <details class="small mt-2 mb-3">
            <summary class="text-muted" style="cursor:pointer"><em>${escHtml(noun.it)}</em> (${genderWord})</summary>
            <table class="mt-2 ms-2">
                <tbody>${rows}</tbody>
            </table>
        </details>`;
}

function buildAdjectiveParadigm(adj) {
    const f = adj.forms;
    const name = escHtml(adj.it);
    let rows;

    if (adj.agreement === 'invariable') {
        rows = `<tr><td class="text-muted pe-3">all</td><td colspan="2">${escHtml(f.ms)}</td></tr>`;
    } else if (adj.agreement === '2form') {
        rows =
            `<tr><td class="text-muted pe-3">m / f</td>` +
            `<td class="pe-3">${escHtml(f.ms)}</td>` +
            `<td>${escHtml(f.mp)}</td></tr>`;
    } else {
        rows =
            `<tr><td class="text-muted pe-3">masculine</td>` +
            `<td class="pe-3">${escHtml(f.ms)}</td>` +
            `<td>${escHtml(f.mp)}</td></tr>` +
            `<tr><td class="text-muted pe-3">feminine</td>` +
            `<td class="pe-3">${escHtml(f.fs)}</td>` +
            `<td>${escHtml(f.fp)}</td></tr>`;
    }

    const noteHtml = adj.note
        ? `<p class="text-muted mt-2 mb-0" style="font-style:italic">${escHtml(adj.note)}</p>`
        : '';

    return `
        <details class="small mt-2 mb-3">
            <summary class="text-muted" style="cursor:pointer">All forms of <em>${name}</em></summary>
            <table class="mt-2 ms-2">
                <thead><tr>
                    <th></th>
                    <th class="pe-3 fw-normal text-muted">singular</th>
                    <th class="fw-normal text-muted">plural</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
            ${noteHtml}
        </details>`;
}

function buildExplainer() {
    if (!_currentExercise || !_ruleIndex) return '<p class="mb-0 text-muted">No exercise loaded.</p>';

    const tokens  = _currentExercise.answerTokens ?? [];
    const ruleIds = [...new Set(tokens.map(t => t.ruleId).filter(Boolean))];

    if (ruleIds.length === 0) return '<p class="mb-0 text-muted">No grammar notes for this exercise.</p>';

    return ruleIds.map(id => {
        const rule = _ruleIndex[id];
        if (!rule) return '';
        const examples = rule.examples.map(ex =>
            `<li><em>${escHtml(ex.it)}</em> — ${escHtml(ex.en)}</li>`
        ).join('');
        return `
            <h6 class="fw-semibold">${escHtml(rule.title)}</h6>
            <p class="small mb-2">${escHtml(rule.explanation)}</p>
            <ul class="small mb-3">${examples}</ul>
        `;
    }).join('<hr class="my-2">');
}

// ── Utility ────────────────────────────────────────────────────────────────

function escHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
