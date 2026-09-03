// app.js -- entry point: wires data, engine, checker, and UI together.

import { getData }         from './data.js';
import { generateExercise } from './engine.js';
import { check }           from './checker.js';
import * as ui             from './ui.js';

// ── State ──────────────────────────────────────────────────────────────────

const state = {
    data:       null,
    exercise:   null,
    checked:    false,
    streak:     0,
    retryQueue: [],   // [{ exercise, delay }]  delay = successes needed before reinsertion
    tier:       3,
};

// ── Retry queue ────────────────────────────────────────────────────────────

const RETRY_DELAY = 3;

function enqueue(exercise) {
    state.retryQueue.push({ exercise, delay: RETRY_DELAY });
}

function tickQueue() {
    for (const item of state.retryQueue) item.delay--;
}

function dequeueReady() {
    const idx = state.retryQueue.findIndex(item => item.delay <= 0);
    if (idx === -1) return null;
    return state.retryQueue.splice(idx, 1)[0].exercise;
}

// ── Exercise loop ──────────────────────────────────────────────────────────

function nextExercise() {
    const retry   = dequeueReady();
    const exercise = retry ?? generateExercise(state.data, { tier: state.tier });

    state.exercise = exercise;
    state.checked  = false;

    ui.setExplainerContext(exercise, state.data.ruleIndex);
    ui.setHintContext(exercise);
    ui.showExercise(exercise);
    ui.updateStreak(state.streak, state.retryQueue.length);
}

function handleCheck() {
    if (state.checked) return;

    const input  = ui.getInput();
    const result = check(input, state.exercise);
    state.checked = true;

    if (result.correct) {
        state.streak++;
        tickQueue();
        ui.showCorrect(result, state.exercise);
    } else {
        state.streak = 0;
        enqueue(state.exercise);
        ui.showIncorrect(result, state.exercise);
    }

    ui.updateStreak(state.streak, state.retryQueue.length);
}

function handleNext() {
    nextExercise();
}

function handleSkip() {
    nextExercise();
}

function handleTierChange(tier) {
    state.tier = tier;
    nextExercise();
}

// ── Boot ───────────────────────────────────────────────────────────────────

async function init() {
    state.data = await getData();
    ui.init({
        onCheck:      handleCheck,
        onNext:       handleNext,
        onSkip:       handleSkip,
        onTierChange: handleTierChange,
    });
    nextExercise();
}

init().catch(err => {
    document.getElementById('app').innerHTML =
        `<div class="alert alert-danger mt-4">Failed to load: ${err.message}</div>`;
});
