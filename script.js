// ============================================================
//  CALCULUS ARCADE
//  Nine cabinets. One per AP Calc AB CED unit, plus a final boss.
//  Score ≥ 8/10 in each to "clear" the cabinet.
//  Clear all nine to escape the arcade.
// ============================================================

const STORAGE_KEY = 'calc-arcade-progress-v1';

const GAMES = [
  { id: 'limits', name: 'LIMIT LANDER',         topic: 'Unit 1 · Limits & Continuity',         color: 'cyan',   icon: '▲' },
  { id: 'deriv',  name: 'DERIVATIVE DASH',      topic: 'Unit 2 · Differentiation Rules',       color: 'pink',   icon: '●' },
  { id: 'chain',  name: 'CHAIN REACTION',       topic: 'Unit 3 · Chain · Implicit · Inverse',  color: 'red',    icon: '⛓' },
  { id: 'rates',  name: 'RATE RUSH',            topic: 'Unit 4 · Contextual Applications',     color: 'orange', icon: '⟲' },
  { id: 'optim',  name: 'OPTIMIZATION OASIS',   topic: 'Unit 5 · Analytical Applications',     color: 'purple', icon: '∿' },
  { id: 'integ',  name: 'INTEGRAL INVADERS',    topic: 'Unit 6 · Integration & Accumulation',  color: 'green',  icon: '👾' },
  { id: 'slope',  name: 'SLOPE FIELD SHOWDOWN', topic: 'Unit 7 · Differential Equations',      color: 'blue',   icon: '╱' },
  { id: 'area',   name: 'AREA ARENA',           topic: 'Unit 8 · Applications of Integration', color: 'mint',   icon: '∮' },
  { id: 'ftc',    name: 'FTC FORTRESS',         topic: 'FINAL BOSS · All Units',               color: 'yellow', icon: '∫' },
];

// ---------- State ----------
const state = {
  current: 'title',
  game: null,
  round: 0,
  score: 0,
  lives: 3,
  problems: [],
  progress: loadProgress(),
};

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      // Make sure all current games have a record (handles new games added in updates)
      GAMES.forEach(g => { if (!saved[g.id]) saved[g.id] = { best: 0, attempts: 0, cleared: false }; });
      return saved;
    }
  } catch {}
  const init = {};
  GAMES.forEach(g => init[g.id] = { best: 0, attempts: 0, cleared: false });
  return init;
}
function saveProgress() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress)); } catch {}
}

// ---------- Screen routing ----------
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
  state.current = id;
}

// ---------- Title -> Entrance -> Lobby ----------
document.getElementById('btn-insert-coin').addEventListener('click', () => {
  playBeep(440, 0.08);
  showScreen('entrance');
  const scene = document.querySelector('.entrance-scene');
  setTimeout(() => scene.classList.add('open'), 200);
  setTimeout(() => { showScreen('lobby'); renderLobby(); }, 2600);
});

// ---------- Lobby ----------
function renderLobby() {
  const grid = document.getElementById('cabinets-grid');
  grid.innerHTML = '';
  GAMES.forEach(g => {
    const p = state.progress[g.id];
    const pct = Math.round((p.best / 10) * 100);
    const div = document.createElement('button');
    div.className = `cabinet ${g.color}` + (p.cleared ? ' mastered' : '');
    div.innerHTML = `
      <div class="cabinet-screen">
        <div>
          <div class="cabinet-name">${g.name}</div>
          <div class="cabinet-topic">${g.topic}</div>
        </div>
      </div>
      <div class="cabinet-mastery">
        <div class="mastery-bar"><div class="mastery-fill" style="width:${pct}%"></div></div>
        <div class="mastery-pct">${pct}%</div>
      </div>
    `;
    div.addEventListener('click', () => startGame(g.id));
    grid.appendChild(div);
  });

  const cleared = GAMES.filter(g => state.progress[g.id].cleared).length;
  document.getElementById('games-cleared').textContent = `CLEARED ${cleared} / ${GAMES.length}`;
  const overall = Math.round(
    GAMES.reduce((a, g) => a + state.progress[g.id].best, 0) / (GAMES.length * 10) * 100
  );
  document.getElementById('mastery-overall').textContent = `MASTERY ${overall}%`;

  if (cleared === GAMES.length && state.current === 'lobby') {
    setTimeout(() => showScreen('victory'), 700);
  }
}

document.getElementById('btn-stats').addEventListener('click', () => { renderStats(); showScreen('stats'); });
document.getElementById('btn-stats-back').addEventListener('click', () => showScreen('lobby'));
document.getElementById('btn-victory-back').addEventListener('click', () => showScreen('lobby'));
document.getElementById('btn-back-lobby').addEventListener('click', () => { showScreen('lobby'); renderLobby(); });

document.getElementById('btn-stats-reset').addEventListener('click', () => {
  if (!confirm('Reset all arcade progress?')) return;
  GAMES.forEach(g => state.progress[g.id] = { best: 0, attempts: 0, cleared: false });
  saveProgress(); renderStats(); renderLobby();
});

// ---------- Stats ----------
function renderStats() {
  const list = document.getElementById('stats-list');
  list.innerHTML = '';
  GAMES.forEach(g => {
    const p = state.progress[g.id];
    const pct = Math.round((p.best / 10) * 100);
    const row = document.createElement('div');
    row.className = `stat-row ${g.color}${p.cleared ? ' cleared' : ''}`;
    row.style.color = `var(--${g.color})`;
    row.innerHTML = `
      <span class="stat-name">${g.name}</span>
      <div class="stat-bar"><div class="stat-fill" style="width:${pct}%"></div></div>
      <span class="stat-pct">${p.best}/10 · ${p.attempts} runs</span>
    `;
    list.appendChild(row);
  });
}

// ============================================================
//  GAME RUNNER
// ============================================================
function startGame(id) {
  state.game = id;
  state.round = 0;
  state.score = 0;
  state.lives = 3;
  const game = GAMES.find(g => g.id === id);

  document.getElementById('game-title').textContent = '▮ ' + game.name + ' ▮';
  document.getElementById('game-title').style.color = `var(--${game.color})`;
  updateHUD();

  state.problems = problemGenerators[id]();

  showScreen('game');
  renderProblem();
}

function updateHUD() {
  document.getElementById('hud-round').textContent = `ROUND ${Math.min(state.round + 1, 10)}/10`;
  document.getElementById('hud-score').textContent = `SCORE ${state.score}`;
  document.getElementById('hud-lives').textContent = '♥'.repeat(Math.max(state.lives, 0));
}

function renderProblem() {
  updateHUD();
  const stage = document.getElementById('game-stage');
  document.getElementById('game-message').textContent = '';
  document.getElementById('game-message').className = 'game-message';
  if (state.round >= 10) return endGame();
  renderers[state.game](stage, state.problems[state.round]);
  renderMath(stage);
}

function answerChosen(correct, chosenEl, allBtns) {
  if (correct) {
    state.score++;
    setMsg('CORRECT! ' + randomPraise(), 'correct');
    playBeep(880, 0.1);
    if (chosenEl) chosenEl.classList.add('correct');
  } else {
    state.lives--;
    const ex = state.problems[state.round].explain || '';
    setMsgHTML('WRONG. ' + ex, 'wrong');
    playBeep(160, 0.18);
    if (chosenEl) chosenEl.classList.add('wrong');
  }
  if (allBtns) allBtns.forEach(b => b.disabled = true);

  if (state.lives <= 0) {
    setTimeout(() => endGame(true), 1300);
    return;
  }
  setTimeout(() => {
    state.round++;
    renderProblem();
  }, 1300);
}

function setMsg(text, kind = 'info') {
  const m = document.getElementById('game-message');
  m.textContent = text;
  m.className = 'game-message ' + kind;
}
function setMsgHTML(html, kind = 'info') {
  const m = document.getElementById('game-message');
  m.innerHTML = html;
  m.className = 'game-message ' + kind;
  renderMath(m);
}

function endGame(gameOver = false) {
  const id = state.game;
  const p = state.progress[id];
  p.attempts++;
  if (state.score > p.best) p.best = state.score;
  if (state.score >= 8) p.cleared = true;
  saveProgress();

  const stage = document.getElementById('game-stage');
  const mastered = state.score >= 8;
  stage.innerHTML = `
    <div class="problem-panel">
      <div class="problem-prompt">${gameOver ? 'GAME OVER' : 'RUN COMPLETE'}</div>
      <div class="problem-expr">${state.score} / 10</div>
      <p class="problem-prompt">${mastered
        ? 'MASTERY ACHIEVED. CABINET CLEARED. ✓'
        : 'YOU NEED 8 OR MORE TO CLEAR THIS CABINET.'}</p>
      <div class="answer-grid" style="grid-template-columns: 1fr 1fr; max-width: 480px;">
        <button class="primary-btn" id="btn-retry">PLAY AGAIN</button>
        <button class="primary-btn" id="btn-exit" style="background:var(--cyan); border-color:var(--cyan); box-shadow:0 0 12px var(--cyan); color:#002e30;">EXIT</button>
      </div>
    </div>
  `;
  document.getElementById('btn-retry').addEventListener('click', () => startGame(id));
  document.getElementById('btn-exit').addEventListener('click', () => { showScreen('lobby'); renderLobby(); });
}

// ============================================================
//  AUDIO
// ============================================================
let audioCtx = null;
function playBeep(freq, dur = 0.08) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.value = 0.05;
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.stop(audioCtx.currentTime + dur);
  } catch {}
}

// ============================================================
//  HELPERS
// ============================================================
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(p => p[1]);
function randomPraise() { return pick(['NICE!', 'GREAT WORK!', 'YOU GOT IT!', '+1 MASTERY!', 'SHARP!', 'PERFECT!']); }

function renderMath(root, attemptsLeft = 30) {
  if (typeof window === 'undefined') return;
  if (window.renderMathInElement) {
    try {
      window.renderMathInElement(root, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$',  right: '$',  display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true },
        ],
        throwOnError: false,
        strict: 'ignore',
      });
    } catch (e) {
      console.warn('[calc-arcade] KaTeX render error:', e);
    }
    return;
  }
  // Auto-render hasn't loaded yet — retry up to ~3s in case of a slow CDN/font load.
  if (attemptsLeft > 0 && root && root.isConnected !== false) {
    setTimeout(() => renderMath(root, attemptsLeft - 1), 100);
  } else if (attemptsLeft === 0) {
    console.warn('[calc-arcade] KaTeX auto-render never loaded; math will display as raw LaTeX.');
  }
}

function fmt(n) {
  if (n === Infinity) return '\\infty';
  if (n === -Infinity) return '-\\infty';
  if (Number.isNaN(n)) return '\\text{DNE}';
  if (Number.isInteger(n)) return String(n);
  return (Math.round(n * 100) / 100).toString();
}

// Make a multiple-choice button whose option string is canonical LaTeX (no $ delimiters).
function makeOpt(opt, className = 'answer-btn') {
  const b = document.createElement('button');
  b.className = className;
  b.dataset.value = opt;
  b.innerHTML = `$${opt}$`;
  return b;
}

// Make a "plain text" option button (not wrapped in math). For options like "always increasing".
function makeOptText(opt, className = 'answer-btn') {
  const b = document.createElement('button');
  b.className = className;
  b.dataset.value = opt;
  b.textContent = opt;
  return b;
}

function bindOptions(buttons, p) {
  buttons.forEach(b => {
    b.addEventListener('click', () => {
      const correct = b.dataset.value === p.answer;
      answerChosen(correct, b, buttons);
    });
  });
}

// Number distractors (returns 4 LaTeX-ready strings)
function distractors(n) {
  const seen = new Set([fmt(n)]);
  const pool = [n + 1, n - 1, n + 2, n - 2, n + 3, -n, n * 2, n / 2];
  for (const x of shuffle(pool)) {
    if (seen.size >= 4) break;
    if (Number.isFinite(x)) seen.add(fmt(x));
  }
  while (seen.size < 4) seen.add(fmt(Math.floor(Math.random() * 20) - 10));
  return shuffle(Array.from(seen));
}

// ============================================================
//  PROBLEM GENERATORS
// ============================================================
const problemGenerators = {
  limits: () => Array.from({ length: 10 }, () => makeLimitProblem()),
  deriv:  () => Array.from({ length: 10 }, () => makeDerivProblem()),
  chain:  () => Array.from({ length: 10 }, () => makeChainProblem()),
  rates:  () => shuffle(rateRushBank()).slice(0, 10),
  optim:  () => buildOptimSet(),
  integ:  () => Array.from({ length: 10 }, () => makeIntegProblem()),
  slope:  () => Array.from({ length: 10 }, () => makeSlopeProblem()),
  area:   () => Array.from({ length: 10 }, () => makeAreaProblem()),
  ftc:    () => Array.from({ length: 10 }, () => makeFTCProblem()),
};

// ============================================================
//  UNIT 1 · LIMITS
// ============================================================
function makeLimitProblem() {
  const kind = pick(['poly', 'factor', 'piecewise', 'trig', 'atInf', 'continuity', 'ivt', 'squeeze']);

  if (kind === 'poly') {
    const a = pick([1, 2, -1, 3, -2]), b = pick([1, -1, 2, -2, 3]), c = pick([0, 1, 2, -1]);
    const x = pick([0, 1, 2, -1, 3]);
    const ans = a * x * x + b * x + c;
    return {
      expr: `\\lim_{x \\to ${x}}\\bigl(${a}x^2 ${b >= 0 ? '+' : '-'} ${Math.abs(b)}x ${c >= 0 ? '+' : '-'} ${Math.abs(c)}\\bigr)`,
      answer: fmt(ans),
      options: distractors(ans),
      explain: `Polynomials are continuous, so plug in: $${ans}$.`,
    };
  }

  if (kind === 'factor') {
    const a = pick([1, 2, 3, 4, 5]);
    const ans = 2 * a;
    return {
      expr: `\\lim_{x \\to ${a}}\\,\\dfrac{x^2 - ${a * a}}{x - ${a}}`,
      answer: fmt(ans),
      options: distractors(ans),
      explain: `Factor numerator $(x-${a})(x+${a})$, cancel, plug in: $${ans}$.`,
    };
  }

  if (kind === 'piecewise') {
    const a = pick([1, 2, 3]);
    const L = a * a, R = 2 * a + 1;
    const equal = L === R;
    const opts = Array.from(new Set([fmt(L), fmt(R), '\\text{DNE}', fmt(a)]));
    while (opts.length < 4) opts.push(fmt(Math.floor(Math.random() * 10)));
    return {
      expr: `\\lim_{x \\to ${a}} f(x), \\ \\ f(x)=\\begin{cases}x^2 & x<${a}\\\\ 2x+1 & x\\geq ${a}\\end{cases}`,
      answer: equal ? fmt(L) : '\\text{DNE}',
      options: shuffle(opts).slice(0, 4),
      explain: equal
        ? `Both sides equal $${L}$, so the limit exists.`
        : `Left limit $${L}$ ≠ right limit $${R}$, so DNE.`,
    };
  }

  if (kind === 'trig') {
    const choice = pick(['sinx', 'cos1', 'sin3x']);
    if (choice === 'sinx') return {
      expr: `\\lim_{x \\to 0}\\,\\dfrac{\\sin x}{x}`,
      answer: '1',
      options: ['0', '1', '\\infty', '\\text{DNE}'],
      explain: `Famous limit: $\\dfrac{\\sin x}{x} \\to 1$.`,
    };
    if (choice === 'cos1') return {
      expr: `\\lim_{x \\to 0}\\,\\dfrac{1 - \\cos x}{x}`,
      answer: '0',
      options: ['0', '1', '\\tfrac{1}{2}', '\\text{DNE}'],
      explain: `$\\dfrac{1-\\cos x}{x} \\to 0$.`,
    };
    return {
      expr: `\\lim_{x \\to 0}\\,\\dfrac{\\sin(3x)}{x}`,
      answer: '3',
      options: ['1', '3', '0', '\\text{DNE}'],
      explain: `Multiply and divide by 3: $\\dfrac{\\sin 3x}{3x}\\cdot 3 \\to 3$.`,
    };
  }

  if (kind === 'atInf') {
    // Limit of rational at infinity by degree comparison
    const kinds = [
      { e: '\\lim_{x \\to \\infty}\\,\\dfrac{3x^2 + 5}{2x^2 - 7}', a: '\\tfrac{3}{2}',
        opts: ['\\tfrac{3}{2}', '0', '\\infty', '\\tfrac{2}{3}'],
        why: 'Same degree → ratio of leading coeffs.' },
      { e: '\\lim_{x \\to \\infty}\\,\\dfrac{4x + 1}{x^2 - 3}', a: '0',
        opts: ['0', '4', '\\infty', '1'],
        why: 'Denominator dominates.' },
      { e: '\\lim_{x \\to \\infty}\\,\\dfrac{x^3}{2x^2 + 1}', a: '\\infty',
        opts: ['\\infty', '0', '\\tfrac{1}{2}', '\\text{DNE}'],
        why: 'Numerator degree larger → grows without bound.' },
      { e: '\\lim_{x \\to -\\infty}\\,\\dfrac{2x + 1}{\\sqrt{x^2 + 1}}', a: '-2',
        opts: ['-2', '2', '0', '\\text{DNE}'],
        why: 'As $x \\to -\\infty$, $\\sqrt{x^2+1}\\sim |x|=-x$, so ratio $\\to -2$.' },
    ];
    const c = pick(kinds);
    return { expr: c.e, answer: c.a, options: shuffle(c.opts), explain: c.why };
  }

  if (kind === 'continuity') {
    // f(x) = (x²-4)/(x-2) for x≠2, k for x=2. For continuity, k = 4.
    const a = pick([2, 3, 4]);
    return {
      expr: `\\text{For } f(x)=\\begin{cases}\\dfrac{x^2-${a * a}}{x-${a}} & x\\neq ${a}\\\\ k & x=${a}\\end{cases}\\text{, find } k \\text{ so } f \\text{ is continuous at } x=${a}.`,
      answer: fmt(2 * a),
      options: distractors(2 * a),
      explain: `Need $\\lim_{x\\to ${a}}f(x) = f(${a})$. Limit is $${2 * a}$, so $k=${2 * a}$.`,
    };
  }

  if (kind === 'ivt') {
    return {
      expr: `\\text{Does } f(x)=x^3 - x - 1 \\text{ have a root in } [1, 2] \\text{ by the IVT?}`,
      answer: '\\text{Yes}',
      options: ['\\text{Yes}', '\\text{No}', '\\text{Only at } x=1', '\\text{Only at } x=2'],
      explain: `$f$ is continuous, $f(1)=-1<0$, $f(2)=5>0$, so IVT guarantees a root.`,
    };
  }

  // squeeze
  return {
    expr: `\\lim_{x \\to 0}\\,x^2 \\sin\\!\\left(\\dfrac{1}{x}\\right)`,
    answer: '0',
    options: ['0', '1', '\\infty', '\\text{DNE}'],
    explain: `Since $-x^2 \\le x^2\\sin(1/x) \\le x^2$ and both bounds $\\to 0$, the limit is $0$ by Squeeze.`,
  };
}

// ============================================================
//  UNIT 2 · DERIVATIVES
// ============================================================
function makeDerivProblem() {
  const kind = pick(['power', 'sum', 'product', 'quotient', 'trig', 'exp', 'log', 'definition']);

  if (kind === 'power') {
    const n = pick([2, 3, 4, 5, 6]);
    return {
      expr: `\\dfrac{d}{dx}\\!\\left[x^{${n}}\\right]`,
      answer: `${n}x^{${n - 1}}`,
      options: shuffle([`${n}x^{${n - 1}}`, `${n - 1}x^{${n}}`, `x^{${n - 1}}`, `${n}x^{${n}}`]),
      explain: `Power rule: bring down $${n}$, drop exponent by 1.`,
    };
  }

  if (kind === 'sum') {
    const a = pick([2, 3, 4]), b = pick([1, 2, 3]);
    return {
      expr: `\\dfrac{d}{dx}\\!\\left[${a}x^2 + ${b}x - 7\\right]`,
      answer: `${2 * a}x + ${b}`,
      options: shuffle([`${2 * a}x + ${b}`, `${a}x + ${b}`, `${2 * a}x - 7`, `${2 * a}x + ${b} - 7`]),
      explain: `Differentiate each term; constants vanish.`,
    };
  }

  if (kind === 'product') {
    return {
      expr: `\\dfrac{d}{dx}\\!\\left[x \\cdot \\sin x\\right]`,
      answer: '\\sin x + x\\cos x',
      options: shuffle(['\\sin x + x\\cos x', '\\cos x', 'x\\cos x', '1 \\cdot \\sin x']),
      explain: `Product rule: $(fg)' = f'g + fg'$.`,
    };
  }

  if (kind === 'quotient') {
    return {
      expr: `\\dfrac{d}{dx}\\!\\left[\\dfrac{x}{x+1}\\right]`,
      answer: '\\dfrac{1}{(x+1)^2}',
      options: shuffle(['\\dfrac{1}{(x+1)^2}', '\\dfrac{-1}{(x+1)^2}', '\\dfrac{x}{(x+1)^2}', '1']),
      explain: `Quotient rule: $\\dfrac{(1)(x+1) - x(1)}{(x+1)^2} = \\dfrac{1}{(x+1)^2}$.`,
    };
  }

  if (kind === 'trig') {
    const t = pick([
      { e: '\\cos x',  a: '-\\sin x',          d: ['\\sin x', '-\\cos x', '\\tan x'] },
      { e: '\\tan x',  a: '\\sec^2 x',         d: ['-\\sec^2 x', '\\sec x \\tan x', '\\cot x'] },
      { e: '\\sec x',  a: '\\sec x \\tan x',   d: ['-\\sec x', '\\tan x', '\\sec^2 x'] },
      { e: '\\csc x',  a: '-\\csc x \\cot x',  d: ['\\csc x \\cot x', '-\\csc^2 x', '\\cot x'] },
      { e: '\\cot x',  a: '-\\csc^2 x',        d: ['\\csc^2 x', '-\\sec^2 x', '-\\tan x'] },
    ]);
    return {
      expr: `\\dfrac{d}{dx}\\!\\left[${t.e}\\right]`,
      answer: t.a,
      options: shuffle([t.a, ...t.d]),
      explain: `Standard trig derivative.`,
    };
  }

  if (kind === 'exp') {
    const k = pick([2, 3, 5]);
    return {
      expr: `\\dfrac{d}{dx}\\!\\left[e^{${k}x}\\right]`,
      answer: `${k}e^{${k}x}`,
      options: shuffle([`${k}e^{${k}x}`, `e^{${k}x}`, `${k}xe^{${k}x}`, `${k - 1}e^{${k}x}`]),
      explain: `Chain rule: derivative of inner ($${k}$) times $e^{${k}x}$.`,
    };
  }

  if (kind === 'log') {
    return {
      expr: `\\dfrac{d}{dx}\\!\\left[\\ln x\\right]`,
      answer: '\\dfrac{1}{x}',
      options: shuffle(['\\dfrac{1}{x}', '\\dfrac{-1}{x^2}', 'x', '\\ln x']),
      explain: `$\\dfrac{d}{dx}\\ln x = \\dfrac{1}{x}$.`,
    };
  }

  // definition of derivative (limit form)
  return {
    expr: `\\lim_{h \\to 0}\\,\\dfrac{(x+h)^2 - x^2}{h}`,
    answer: '2x',
    options: shuffle(['2x', 'x', 'x^2', '0']),
    explain: `Expand numerator: $2xh + h^2$. Divide by $h$: $2x+h \\to 2x$.`,
  };
}

// ============================================================
//  UNIT 3 · CHAIN REACTION
// ============================================================
function makeChainProblem() {
  const kind = pick(['chainTrig', 'chainExp', 'chainPow', 'implicit', 'inverseTrig', 'inverseFn']);

  if (kind === 'chainTrig') {
    const k = pick([2, 3, 4, 5]);
    const inner = pick([
      { e: `${k}x`, d: `${k}` },
      { e: `x^2 + ${k}`, d: `2x` },
      { e: `${k}x^2`, d: `${2 * k}x` },
    ]);
    const which = pick(['sin', 'cos']);
    return {
      layers: [`\\${which}(\\cdot)`, inner.e],
      expr: `\\dfrac{d}{dx}\\!\\left[\\${which}\\!\\left(${inner.e}\\right)\\right]`,
      answer: which === 'sin'
        ? `${inner.d} \\cdot \\cos\\!\\left(${inner.e}\\right)`
        : `-${inner.d} \\cdot \\sin\\!\\left(${inner.e}\\right)`,
      options: shuffle([
        which === 'sin'
          ? `${inner.d} \\cdot \\cos\\!\\left(${inner.e}\\right)`
          : `-${inner.d} \\cdot \\sin\\!\\left(${inner.e}\\right)`,
        `\\${which}\\!\\left(${inner.d}\\right)`,
        which === 'sin' ? `\\cos\\!\\left(${inner.e}\\right)` : `\\sin\\!\\left(${inner.e}\\right)`,
        which === 'sin'
          ? `-${inner.d} \\cdot \\cos\\!\\left(${inner.e}\\right)`
          : `${inner.d} \\cdot \\sin\\!\\left(${inner.e}\\right)`,
      ]),
      explain: `Chain rule: derivative of outer at inner, times derivative of inner.`,
    };
  }

  if (kind === 'chainExp') {
    const inner = pick([
      { e: `3x^2`, d: `6x` },
      { e: `x^2 + 1`, d: `2x` },
      { e: `\\sin x`, d: `\\cos x` },
    ]);
    return {
      layers: [`e^{(\\cdot)}`, inner.e],
      expr: `\\dfrac{d}{dx}\\!\\left[e^{${inner.e}}\\right]`,
      answer: `${inner.d} \\cdot e^{${inner.e}}`,
      options: shuffle([
        `${inner.d} \\cdot e^{${inner.e}}`,
        `e^{${inner.e}}`,
        `${inner.d}`,
        `e^{${inner.d}}`,
      ]),
      explain: `$\\dfrac{d}{dx}\\,e^{g(x)} = g'(x)\\,e^{g(x)}$.`,
    };
  }

  if (kind === 'chainPow') {
    const n = pick([3, 4, 5]);
    const inner = pick([
      { e: `2x + 1`, d: `2` },
      { e: `x^2 - 3`, d: `2x` },
    ]);
    return {
      layers: [`(\\cdot)^{${n}}`, inner.e],
      expr: `\\dfrac{d}{dx}\\!\\left[(${inner.e})^{${n}}\\right]`,
      answer: `${n}(${inner.e})^{${n - 1}} \\cdot ${inner.d}`,
      options: shuffle([
        `${n}(${inner.e})^{${n - 1}} \\cdot ${inner.d}`,
        `${n}(${inner.e})^{${n - 1}}`,
        `${n}(${inner.d})^{${n - 1}}`,
        `(${inner.e})^{${n - 1}} \\cdot ${inner.d}`,
      ]),
      explain: `Power-chain rule: $n\\,(g(x))^{n-1}\\,g'(x)$.`,
    };
  }

  if (kind === 'implicit') {
    // x² + y² = 25, find dy/dx
    const c = pick([9, 16, 25, 36]);
    return {
      expr: `x^2 + y^2 = ${c}, \\quad \\dfrac{dy}{dx} = ?`,
      answer: '-\\dfrac{x}{y}',
      options: shuffle(['-\\dfrac{x}{y}', '\\dfrac{x}{y}', '-\\dfrac{y}{x}', '\\dfrac{-2x}{2y}']),
      explain: `Implicit: $2x + 2y\\,y' = 0 \\Rightarrow y' = -x/y$.`,
    };
  }

  if (kind === 'inverseTrig') {
    const t = pick([
      { e: '\\arcsin x', a: '\\dfrac{1}{\\sqrt{1-x^2}}', d: ['\\dfrac{-1}{\\sqrt{1-x^2}}', '\\dfrac{1}{1+x^2}', '\\dfrac{1}{x\\sqrt{x^2-1}}'] },
      { e: '\\arccos x', a: '\\dfrac{-1}{\\sqrt{1-x^2}}', d: ['\\dfrac{1}{\\sqrt{1-x^2}}', '\\dfrac{-1}{1+x^2}', '\\sin x'] },
      { e: '\\arctan x', a: '\\dfrac{1}{1+x^2}', d: ['\\dfrac{1}{\\sqrt{1-x^2}}', '\\dfrac{-1}{1+x^2}', '\\sec^2 x'] },
    ]);
    return {
      expr: `\\dfrac{d}{dx}\\!\\left[${t.e}\\right]`,
      answer: t.a,
      options: shuffle([t.a, ...t.d]),
      explain: `Memorize the inverse trig derivative.`,
    };
  }

  // inverse function: if f(2)=5 and f'(2)=4, then (f⁻¹)'(5)=1/4
  const a = pick([2, 3, 5]);
  const b = pick([2, 3, 4, 5]);
  const fp = pick([2, 3, 4, 5]);
  return {
    expr: `\\text{If } f(${a})=${b} \\text{ and } f'(${a})=${fp}, \\text{ then } (f^{-1})'(${b}) = ?`,
    answer: `\\dfrac{1}{${fp}}`,
    options: shuffle([`\\dfrac{1}{${fp}}`, `${fp}`, `\\dfrac{1}{${a}}`, `\\dfrac{1}{${b}}`]),
    explain: `$(f^{-1})'(b) = \\dfrac{1}{f'(a)}$ where $f(a)=b$.`,
  };
}

// ============================================================
//  UNIT 4 · RATE RUSH
// ============================================================
function rateRushBank() {
  return [
    // ---- Related rates (anim variants kept for visual variety)
    {
      scene: 'balloon',
      scenario: `A spherical balloon inflates at $12\\,\\text{cm}^3/\\text{s}$. Find $\\dfrac{dr}{dt}$ when $r=5\\,\\text{cm}$. (Use $V=\\tfrac{4}{3}\\pi r^3$.)`,
      answer: '\\dfrac{12}{100\\pi}\\,\\text{cm/s}',
      options: ['\\dfrac{12}{100\\pi}\\,\\text{cm/s}', '\\dfrac{12\\pi}{100}\\,\\text{cm/s}', '\\dfrac{12}{25\\pi}\\,\\text{cm/s}', '12 \\cdot 4\\pi \\cdot 25\\,\\text{cm/s}'],
      explain: `$\\dfrac{dV}{dt} = 4\\pi r^2 \\dfrac{dr}{dt} \\Rightarrow 12 = 100\\pi \\dfrac{dr}{dt}$.`,
    },
    {
      scene: 'ladder',
      scenario: `A 10-ft ladder slides down a wall. The bottom moves out at $2\\,\\text{ft/s}$. How fast is the top moving when the bottom is $6\\,\\text{ft}$ from the wall?`,
      answer: '-\\tfrac{3}{2}\\,\\text{ft/s}',
      options: ['-\\tfrac{3}{2}\\,\\text{ft/s}', '\\tfrac{3}{2}\\,\\text{ft/s}', '-2\\,\\text{ft/s}', '-\\tfrac{5}{2}\\,\\text{ft/s}'],
      explain: `$x^2+y^2=100$. At $x=6$, $y=8$. $2x x'+2y y'=0 \\Rightarrow y'=-12/8 = -1.5$.`,
    },
    {
      scene: 'cone',
      scenario: `Water drains from a cone with $r = h/2$. Volume decreases at $4\\,\\text{cm}^3/\\text{s}$. Find $\\dfrac{dh}{dt}$ when $h=6\\,\\text{cm}$.`,
      answer: '-\\dfrac{4}{9\\pi}\\,\\text{cm/s}',
      options: ['-\\dfrac{4}{9\\pi}\\,\\text{cm/s}', '-\\dfrac{4\\pi}{9}\\,\\text{cm/s}', '-\\dfrac{4}{3\\pi}\\,\\text{cm/s}', '-\\dfrac{4}{9}\\,\\text{cm/s}'],
      explain: `$V = \\dfrac{\\pi h^3}{12}$, so $\\dfrac{dV}{dt} = \\dfrac{\\pi h^2}{4}\\dfrac{dh}{dt}$.`,
    },
    {
      scene: 'balloon',
      scenario: `Sphere's surface area grows at $8\\,\\text{cm}^2/\\text{s}$. Find $\\dfrac{dr}{dt}$ when $r=2$.`,
      answer: '\\dfrac{1}{2\\pi}\\,\\text{cm/s}',
      options: ['\\dfrac{1}{2\\pi}\\,\\text{cm/s}', '\\dfrac{8}{2\\pi}\\,\\text{cm/s}', '2\\pi\\,\\text{cm/s}', '\\dfrac{1}{\\pi}\\,\\text{cm/s}'],
      explain: `$S = 4\\pi r^2 \\Rightarrow \\dfrac{dS}{dt} = 8\\pi r\\dfrac{dr}{dt}$.`,
    },
    {
      scene: 'cone',
      scenario: `A 6-ft person walks away from a 15-ft lamppost at $4\\,\\text{ft/s}$. How fast is the shadow's tip moving?`,
      answer: '\\dfrac{20}{3}\\,\\text{ft/s}',
      options: ['\\dfrac{20}{3}\\,\\text{ft/s}', '4\\,\\text{ft/s}', '\\dfrac{15}{4}\\,\\text{ft/s}', '6\\,\\text{ft/s}'],
      explain: `Similar triangles: $s = \\dfrac{2x}{3}$. Tip moves at $\\dfrac{d}{dt}(x+s)=4+\\tfrac{8}{3}=\\tfrac{20}{3}$.`,
    },

    // ---- Motion problems
    {
      scene: 'ladder',
      scenario: `A particle's position is $s(t) = t^3 - 6t^2 + 9t$. Find the velocity at $t=2$.`,
      answer: '-3',
      options: ['-3', '3', '0', '6'],
      explain: `$v(t) = s'(t) = 3t^2 - 12t + 9$. At $t=2$: $12-24+9=-3$.`,
    },
    {
      scene: 'balloon',
      scenario: `Position $s(t)=t^3-6t^2+9t$. When is the particle at rest?`,
      answer: 't = 1 \\text{ or } t = 3',
      options: ['t = 1 \\text{ or } t = 3', 't = 0 \\text{ or } t = 2', 't = 2 \\text{ only}', 't = 0 \\text{ only}'],
      explain: `Rest ⇔ $v=0 \\Rightarrow 3(t-1)(t-3)=0$.`,
    },
    {
      scene: 'cone',
      scenario: `If $s(t) = -16t^2 + 64t$, what is the maximum height of the projectile?`,
      answer: '64\\,\\text{ft}',
      options: ['64\\,\\text{ft}', '32\\,\\text{ft}', '128\\,\\text{ft}', '16\\,\\text{ft}'],
      explain: `Max when $v=0$: $-32t+64=0 \\Rightarrow t=2$. $s(2)=64$.`,
    },

    // ---- L'Hôpital
    {
      scene: 'balloon',
      scenario: `Use L'Hôpital: $\\lim_{x \\to 0}\\dfrac{\\sin x}{x}$`,
      answer: '1',
      options: ['1', '0', '\\infty', '\\text{DNE}'],
      explain: `Form $0/0$: derivatives give $\\dfrac{\\cos x}{1} \\to 1$.`,
    },
    {
      scene: 'cone',
      scenario: `Use L'Hôpital: $\\lim_{x \\to 0}\\dfrac{e^x - 1 - x}{x^2}$`,
      answer: '\\tfrac{1}{2}',
      options: ['\\tfrac{1}{2}', '1', '0', '\\infty'],
      explain: `Apply twice: $\\dfrac{e^x - 1}{2x} \\to \\dfrac{e^x}{2} \\to \\tfrac{1}{2}$.`,
    },
    {
      scene: 'ladder',
      scenario: `Use L'Hôpital: $\\lim_{x \\to \\infty}\\dfrac{\\ln x}{x}$`,
      answer: '0',
      options: ['0', '1', '\\infty', '\\tfrac{1}{2}'],
      explain: `$\\dfrac{1/x}{1} = \\dfrac{1}{x} \\to 0$.`,
    },

    // ---- Linear approximation
    {
      scene: 'balloon',
      scenario: `Use the tangent line to $f(x)=\\sqrt{x}$ at $x=9$ to approximate $\\sqrt{9.2}$.`,
      answer: '\\approx 3.0333',
      options: ['\\approx 3.0333', '\\approx 3.1623', '\\approx 3.0500', '\\approx 2.9667'],
      explain: `$L(x) = 3 + \\tfrac{1}{6}(x-9)$. $L(9.2) = 3 + 0.2/6 \\approx 3.0333$.`,
    },
    {
      scene: 'ladder',
      scenario: `If $f(2)=5$ and $f'(2)=-3$, estimate $f(2.1)$ using a linear approximation.`,
      answer: '4.7',
      options: ['4.7', '5.3', '4.97', '2.7'],
      explain: `$L(2.1) = 5 + (-3)(0.1) = 4.7$.`,
    },
  ];
}

// ============================================================
//  UNIT 5 · OPTIMIZATION OASIS
//  (Mix of slider-style optimization + multiple-choice MVT/curve sketching)
// ============================================================
function buildOptimSet() {
  // 5 slider problems + 5 multiple-choice
  const slider = shuffle(optimSliderBank()).slice(0, 5).map(p => ({ ...p, ui: 'slider' }));
  const mc     = shuffle(optimMCBank()).slice(0, 5).map(p => ({ ...p, ui: 'mc' }));
  return shuffle(slider.concat(mc));
}

function optimSliderBank() {
  return [
    {
      title: 'BOX BUILDER',
      desc: `You have $120\\,\\text{in}^2$ of cardboard. Open-top, square-base box: $V = s^2 h$ with $4sh + s^2 = 120$, so $h = \\dfrac{120 - s^2}{4s}$. Find $s$ that maximizes $V$.`,
      f: s => (s * s) * ((120 - s * s) / (4 * s)),
      min: 0.5, max: 10, step: 0.1,
      best: Math.sqrt(40), tol: 0.4,
      readout: s => `s = ${s.toFixed(2)},  V = ${((s * s) * ((120 - s * s) / (4 * s))).toFixed(2)} in³`,
      explain: `$\\dfrac{dV}{ds} = 0 \\Rightarrow 3s^2 = 120 \\Rightarrow s = \\sqrt{40} \\approx 6.32$.`,
    },
    {
      title: 'FENCED FIELD',
      desc: `Fence a rectangle along a river (only 3 sides): $2x + y = 200$. Maximize area $A = xy$.`,
      f: x => x * (200 - 2 * x),
      min: 1, max: 99, step: 1,
      best: 50, tol: 3,
      readout: x => `x = ${x},  y = ${200 - 2 * x},  A = ${(x * (200 - 2 * x)).toFixed(0)} ft²`,
      explain: `$A' = 200 - 4x = 0 \\Rightarrow x = 50$, $A = 5000$.`,
    },
    {
      title: 'CAN DESIGNER',
      desc: `Cylindrical can holds $355\\,\\text{cm}^3$. Minimize $S = 2\\pi r^2 + 2\\pi r h$ with $\\pi r^2 h = 355$.`,
      f: r => 2 * Math.PI * r * r + 2 * 355 / r,
      min: 1, max: 8, step: 0.1,
      best: Math.cbrt(355 / (2 * Math.PI)), tol: 0.3,
      readout: r => `r = ${r.toFixed(2)},  S = ${(2 * Math.PI * r * r + 2 * 355 / r).toFixed(1)} cm²`,
      explain: `$\\dfrac{dS}{dr} = 4\\pi r - \\dfrac{710}{r^2} = 0 \\Rightarrow r^3 = \\dfrac{355}{2\\pi}$.`,
    },
    {
      title: 'TICKET PRICING',
      desc: `At $\\$10$, you sell 200 tickets. Each $\\$0.50$ raise loses 5 tickets. Maximize revenue $R(p) = (10 + 0.5p)(200 - 5p)$.`,
      f: p => (10 + 0.5 * p) * (200 - 5 * p),
      min: 0, max: 30, step: 1,
      best: 10, tol: 1.5,
      readout: p => `raises = ${p},  price = $${(10 + 0.5 * p).toFixed(2)},  R = $${((10 + 0.5 * p) * (200 - 5 * p)).toFixed(0)}`,
      explain: `$R' = 50 - 5p = 0 \\Rightarrow p = 10$.`,
    },
    {
      title: 'CLOSEST POINT',
      desc: `Find $x \\ge 0$ on $y = x^2$ closest to $(0, 1)$. Minimize $D^2(x) = x^2 + (x^2 - 1)^2$.`,
      f: x => x * x + Math.pow(x * x - 1, 2),
      min: 0, max: 2, step: 0.05,
      best: Math.sqrt(0.5), tol: 0.15,
      readout: x => `x = ${x.toFixed(2)},  D² = ${(x * x + Math.pow(x * x - 1, 2)).toFixed(3)}`,
      explain: `$\\dfrac{d(D^2)}{dx} = 2x(2x^2 - 1) = 0 \\Rightarrow x = \\dfrac{1}{\\sqrt{2}}$.`,
    },
    {
      title: 'INSCRIBED RECT',
      desc: `Maximize area of a rectangle under $y = 9 - x^2$ (x ≥ 0): $A(x) = 2x(9 - x^2)$.`,
      f: x => 2 * x * (9 - x * x),
      min: 0, max: 3, step: 0.05,
      best: Math.sqrt(3), tol: 0.2,
      readout: x => `x = ${x.toFixed(2)},  A = ${(2 * x * (9 - x * x)).toFixed(2)}`,
      explain: `$A' = 18 - 6x^2 = 0 \\Rightarrow x = \\sqrt{3}$.`,
    },
    {
      title: 'WIRE CUT',
      desc: `Cut 20 in of wire: $x$ in becomes a square, rest becomes a circle. Minimize total area.`,
      f: x => Math.pow(x / 4, 2) + Math.pow((20 - x) / (2 * Math.PI), 2) * Math.PI,
      min: 0, max: 20, step: 0.2,
      best: 80 / (Math.PI + 4), tol: 0.6,
      readout: x => `square = ${x.toFixed(1)} in,  total A = ${(Math.pow(x / 4, 2) + Math.pow((20 - x) / (2 * Math.PI), 2) * Math.PI).toFixed(2)}`,
      explain: `Set $A'(x)=0 \\Rightarrow x = \\dfrac{80}{\\pi + 4}\\approx 11.2$.`,
    },
  ];
}

function optimMCBank() {
  return [
    {
      expr: `\\text{MVT: } f(x) = x^2 \\text{ on } [1, 3]. \\text{ Find } c \\text{ where } f'(c) = \\dfrac{f(3) - f(1)}{3 - 1}.`,
      answer: '2',
      options: ['2', '1', '3', '\\sqrt{2}'],
      explain: `$\\dfrac{9 - 1}{2} = 4$. $f'(c) = 2c = 4 \\Rightarrow c = 2$.`,
    },
    {
      expr: `\\text{Where is } f(x) = x^3 - 3x \\text{ increasing?}`,
      answer: 'x < -1 \\text{ or } x > 1',
      options: ['x < -1 \\text{ or } x > 1', '-1 < x < 1', 'x > 0', 'x < 0'],
      explain: `$f'(x) = 3x^2 - 3 > 0$ when $|x| > 1$.`,
    },
    {
      expr: `\\text{Find the inflection point of } f(x) = x^3 - 6x^2 + 5.`,
      answer: 'x = 2',
      options: ['x = 2', 'x = 0', 'x = -2', 'x = 4'],
      explain: `$f''(x) = 6x - 12 = 0 \\Rightarrow x = 2$, sign changes there.`,
    },
    {
      expr: `\\text{EVT: max of } f(x) = x^3 - 3x \\text{ on } [-2, 2]?`,
      answer: '2',
      options: ['2', '-2', '0', '4'],
      explain: `Critical points $x = \\pm 1$. Compare $f(-2)=-2, f(-1)=2, f(1)=-2, f(2)=2$. Max is $2$.`,
    },
    {
      expr: `\\text{Where is } f(x) = x^3 - 6x^2 + 9x \\text{ concave up?}`,
      answer: 'x > 2',
      options: ['x > 2', 'x < 2', 'x > 1', 'x < 1'],
      explain: `$f''(x) = 6x - 12 > 0 \\Rightarrow x > 2$.`,
    },
    {
      expr: `\\text{At a local max of a smooth } f, \\text{ which is true?}`,
      answer: "f'(c) = 0 \\text{ and } f''(c) \\le 0",
      options: ["f'(c) = 0 \\text{ and } f''(c) \\le 0", "f'(c) > 0", "f''(c) > 0", "f'(c) \\text{ does not exist}"],
      explain: `Necessary: $f'(c)=0$; sufficient (2nd-deriv test): $f''(c) < 0$.`,
    },
    {
      expr: `\\text{Critical points of } f(x) = x^4 - 4x^3?`,
      answer: 'x = 0, 3',
      options: ['x = 0, 3', 'x = 0, 4', 'x = 3 \\text{ only}', 'x = -3, 0'],
      explain: `$f'(x) = 4x^3 - 12x^2 = 4x^2(x - 3) = 0$.`,
    },
  ];
}

// ============================================================
//  UNIT 6 · INTEGRAL INVADERS
// ============================================================
function makeIntegProblem() {
  const kind = pick(['power', 'trig', 'exp', 'recip', 'usub', 'riemann']);

  if (kind === 'power') {
    const n = pick([2, 3, 4, 5]);
    return {
      expr: `\\int x^{${n}}\\,dx`,
      answer: `\\dfrac{x^{${n + 1}}}{${n + 1}} + C`,
      options: shuffle([
        `\\dfrac{x^{${n + 1}}}{${n + 1}} + C`,
        `${n}x^{${n - 1}} + C`,
        `x^{${n + 1}} + C`,
        `\\dfrac{x^{${n - 1}}}{${n - 1}} + C`,
      ]),
      explain: `Reverse power rule.`,
    };
  }

  if (kind === 'trig') {
    const t = pick([
      { e: '\\cos x',   a: '\\sin x + C',   d: ['-\\sin x + C', '\\cos x + C', '-\\cos x + C'] },
      { e: '\\sin x',   a: '-\\cos x + C',  d: ['\\cos x + C', '\\sin x + C', '-\\sin x + C'] },
      { e: '\\sec^2 x', a: '\\tan x + C',   d: ['\\sec x + C', '-\\tan x + C', '\\cot x + C'] },
    ]);
    return { expr: `\\int ${t.e}\\,dx`, answer: t.a, options: shuffle([t.a, ...t.d]), explain: `Reverse the trig derivative.` };
  }

  if (kind === 'exp') {
    return {
      expr: `\\int e^x\\,dx`,
      answer: 'e^x + C',
      options: shuffle(['e^x + C', 'xe^x + C', '\\dfrac{e^x}{x} + C', '\\ln x + C']),
      explain: `$e^x$ is its own antiderivative.`,
    };
  }

  if (kind === 'recip') {
    return {
      expr: `\\int \\dfrac{1}{x}\\,dx`,
      answer: '\\ln|x| + C',
      options: shuffle(['\\ln|x| + C', '\\dfrac{-1}{x^2} + C', '\\dfrac{1}{x^2} + C', 'x\\ln x + C']),
      explain: `$\\int \\tfrac{1}{x}\\,dx = \\ln|x| + C$.`,
    };
  }

  if (kind === 'usub') {
    const k = pick([2, 3, 4]);
    return {
      expr: `\\int 2x \\cdot e^{x^2}\\,dx`,
      answer: 'e^{x^2} + C',
      options: shuffle(['e^{x^2} + C', '\\dfrac{e^{x^2}}{2} + C', 'x^2 e^{x^2} + C', '2e^{x^2} + C']),
      explain: `Let $u = x^2 \\Rightarrow du = 2x\\,dx$. Integral becomes $\\int e^u\\,du = e^u + C$.`,
    };
  }

  // Riemann sum
  const choices = [
    { e: `\\text{Right Riemann sum for } f(x)=x^2 \\text{ on } [0, 2] \\text{ with } n = 2 \\text{ subintervals}`,
      a: '5', opts: ['5', '1', '4', '2'], why: `Widths 1; $f(1)+f(2)=1+4=5$.` },
    { e: `\\text{Left Riemann sum for } f(x)=x \\text{ on } [0, 4] \\text{ with } n = 4`,
      a: '6', opts: ['6', '10', '8', '4'], why: `Widths 1; $f(0)+f(1)+f(2)+f(3)=0+1+2+3=6$.` },
    { e: `\\text{Midpoint Riemann sum for } f(x)=2x \\text{ on } [0, 4] \\text{ with } n=2`,
      a: '16', opts: ['16', '8', '12', '20'], why: `Widths 2; midpoints 1, 3. $2(2)+2(6)=4+12=16$.` },
  ];
  const c = pick(choices);
  return { expr: c.e, answer: c.a, options: shuffle(c.opts), explain: c.why };
}

// ============================================================
//  UNIT 7 · SLOPE FIELD SHOWDOWN
// ============================================================
function makeSlopeProblem() {
  const kind = pick(['matchField', 'separable', 'expGrowth', 'ivp', 'identifyField']);

  if (kind === 'matchField') {
    // Show a slope field corresponding to a particular DE, multiple choice
    const choices = [
      { de: "y' = x", fn: (x, y) => x, label: "y' = x" },
      { de: "y' = y", fn: (x, y) => y, label: "y' = y" },
      { de: "y' = -y", fn: (x, y) => -y, label: "y' = -y" },
      { de: "y' = x + y", fn: (x, y) => x + y, label: "y' = x + y" },
      { de: "y' = x - y", fn: (x, y) => x - y, label: "y' = x - y" },
      { de: "y' = xy", fn: (x, y) => x * y, label: "y' = xy" },
    ];
    const c = pick(choices);
    const distrs = shuffle(choices.filter(o => o.de !== c.de)).slice(0, 3);
    return {
      kind: 'field',
      field: c.fn,
      prompt: `Which differential equation produces this slope field?`,
      answer: c.label,
      options: shuffle([c.label, ...distrs.map(o => o.label)]),
      explain: `Each slope-field segment has slope $${c.de.replace("y' =", '')}$ at $(x, y)$.`,
    };
  }

  if (kind === 'separable') {
    const choices = [
      { p: `\\dfrac{dy}{dx} = \\dfrac{x}{y}, \\ y(0) = 1`, a: 'y^2 = x^2 + 1', d: ['y = x^2 + 1', 'y^2 = x + 1', 'y = e^x'] },
      { p: `\\dfrac{dy}{dx} = ky`, a: 'y = Ce^{kx}', d: ['y = kx + C', 'y = e^{kx} + C', 'y = \\sin(kx)'] },
      { p: `\\dfrac{dy}{dx} = 2xy`, a: 'y = Ce^{x^2}', d: ['y = e^{2x} + C', 'y = x^2 + C', 'y = 2x'] },
    ];
    const c = pick(choices);
    return {
      kind: 'mc',
      prompt: `Solve the differential equation:`,
      expr: c.p,
      answer: c.a,
      options: shuffle([c.a, ...c.d]),
      explain: `Separate variables, integrate both sides, solve for the family.`,
    };
  }

  if (kind === 'expGrowth') {
    const choices = [
      { p: `\\text{A population doubles every 5 years. Initial population 100. Find } P(10).`,
        a: '400', d: ['200', '500', '800'], why: `$P(t) = 100 \\cdot 2^{t/5}$, so $P(10) = 100 \\cdot 4 = 400$.` },
      { p: `\\text{Radioactive substance halves every 10 yr. Start: 80 g. Amount after 30 yr?}`,
        a: '10\\,\\text{g}', d: ['20\\,\\text{g}', '40\\,\\text{g}', '5\\,\\text{g}'], why: `Three half-lives: $80/2/2/2 = 10$.` },
      { p: `\\text{If } \\dfrac{dy}{dt} = 0.5y \\text{ and } y(0) = 4, \\text{ find } y(2).`,
        a: '4e', d: ['4e^2', '4 + e', '2e'], why: `$y = 4e^{0.5t}$, $y(2) = 4e$.` },
    ];
    const c = pick(choices);
    return {
      kind: 'mc',
      prompt: `Exponential growth/decay:`,
      expr: c.p,
      answer: c.a,
      options: shuffle([c.a, ...c.d]),
      explain: c.why,
    };
  }

  if (kind === 'ivp') {
    return {
      kind: 'mc',
      prompt: `Solve the initial value problem:`,
      expr: `\\dfrac{dy}{dx} = 2x, \\ y(1) = 3`,
      answer: 'y = x^2 + 2',
      options: shuffle(['y = x^2 + 2', 'y = x^2 + 3', 'y = 2x + 1', 'y = x^2 - 2']),
      explain: `Integrate: $y = x^2 + C$. Use $y(1)=3$: $C = 2$.`,
    };
  }

  // identify field: given a DE, describe a feature of its slope field
  const choices = [
    { p: `\\text{For } y' = y, \\text{ the slope at } (0, 0) \\text{ is:}`,
      a: '0', d: ['1', '\\text{undefined}', '\\infty'], why: `$y' = y = 0$ at the origin.` },
    { p: `\\text{For } y' = x^2, \\text{ the slope along the } y\\text{-axis is:}`,
      a: '0', d: ['1', '\\text{depends on } y', '\\infty'], why: `$y' = 0$ when $x = 0$ regardless of $y$.` },
    { p: `\\text{For } y' = x - y, \\text{ the slope at } (1, 1) \\text{ is:}`,
      a: '0', d: ['1', '2', '-1'], why: `$y' = 1 - 1 = 0$.` },
  ];
  const c = pick(choices);
  return {
    kind: 'mc',
    prompt: `Identify the slope:`,
    expr: c.p,
    answer: c.a,
    options: shuffle([c.a, ...c.d]),
    explain: c.why,
  };
}

// ============================================================
//  UNIT 8 · AREA ARENA
// ============================================================
function makeAreaProblem() {
  const kind = pick(['between', 'disk', 'washer', 'crossSection', 'average', 'accumulation']);

  if (kind === 'between') {
    const choices = [
      { f: x => x, g: x => x * x, a: 0, b: 1, top: 'x', bot: 'x^2',
        ans: '\\dfrac{1}{6}', alt: ['\\dfrac{1}{3}', '\\dfrac{1}{2}', '1'] },
      { f: x => Math.sqrt(x), g: x => x, a: 0, b: 1, top: '\\sqrt{x}', bot: 'x',
        ans: '\\dfrac{1}{6}', alt: ['\\dfrac{1}{3}', '\\dfrac{2}{3}', '\\dfrac{1}{2}'] },
      { f: x => 4 - x * x, g: x => 0, a: -2, b: 2, top: '4 - x^2', bot: '0',
        ans: '\\dfrac{32}{3}', alt: ['16', '8', '\\dfrac{16}{3}'] },
    ];
    const c = pick(choices);
    return {
      kind: 'between',
      curves: c,
      prompt: `Find the area between $y=${c.top}$ and $y=${c.bot}$ on $[${c.a}, ${c.b}]$.`,
      answer: c.ans,
      options: shuffle([c.ans, ...c.alt]),
      explain: `$\\int_{${c.a}}^{${c.b}} (${c.top} - ${c.bot})\\,dx$.`,
    };
  }

  if (kind === 'disk') {
    const choices = [
      { p: `\\text{Rotate } y=\\sqrt{x} \\text{ on } [0, 4] \\text{ about the } x\\text{-axis. Volume?}`,
        a: '8\\pi', alt: ['16\\pi', '4\\pi', '\\dfrac{32\\pi}{3}'],
        why: `$V = \\pi\\int_0^4 x\\,dx = \\pi\\cdot 8 = 8\\pi$.` },
      { p: `\\text{Rotate } y = x \\text{ on } [0, 1] \\text{ about the } x\\text{-axis. Volume?}`,
        a: '\\dfrac{\\pi}{3}', alt: ['\\pi', '\\dfrac{\\pi}{2}', '\\dfrac{2\\pi}{3}'],
        why: `$V = \\pi\\int_0^1 x^2\\,dx = \\dfrac{\\pi}{3}$.` },
    ];
    const c = pick(choices);
    return {
      kind: 'volume',
      flavor: 'disk',
      prompt: c.p,
      answer: c.a,
      options: shuffle([c.a, ...c.alt]),
      explain: c.why,
    };
  }

  if (kind === 'washer') {
    return {
      kind: 'volume',
      flavor: 'washer',
      prompt: `Rotate the region between $y=x$ and $y=x^2$ on $[0,1]$ about the $x$-axis. Volume?`,
      answer: '\\dfrac{2\\pi}{15}',
      options: shuffle(['\\dfrac{2\\pi}{15}', '\\dfrac{\\pi}{6}', '\\dfrac{\\pi}{15}', '\\dfrac{\\pi}{3}']),
      explain: `$V = \\pi\\int_0^1 (x^2 - x^4)\\,dx = \\pi\\left(\\tfrac{1}{3} - \\tfrac{1}{5}\\right) = \\tfrac{2\\pi}{15}$.`,
    };
  }

  if (kind === 'crossSection') {
    return {
      kind: 'volume',
      flavor: 'square',
      prompt: `Region: between $y=\\sqrt{x}$ and $y=0$ on $[0,4]$. Cross sections perpendicular to $x$-axis are squares. Find volume.`,
      answer: '8',
      options: shuffle(['8', '4', '16', '32']),
      explain: `Each square has side $\\sqrt{x}$, area $x$. $V = \\int_0^4 x\\,dx = 8$.`,
    };
  }

  if (kind === 'average') {
    const choices = [
      { p: `\\text{Average value of } f(x) = x^2 \\text{ on } [0, 3].`,
        a: '3', alt: ['9', '\\dfrac{27}{3}', '\\dfrac{9}{2}'],
        why: `$\\dfrac{1}{3}\\int_0^3 x^2\\,dx = \\dfrac{1}{3}\\cdot 9 = 3$.` },
      { p: `\\text{Average value of } f(x) = \\sin x \\text{ on } [0, \\pi].`,
        a: '\\dfrac{2}{\\pi}', alt: ['\\dfrac{1}{\\pi}', '0', '1'],
        why: `$\\dfrac{1}{\\pi}\\int_0^\\pi \\sin x\\,dx = \\dfrac{2}{\\pi}$.` },
    ];
    const c = pick(choices);
    return {
      kind: 'mc',
      prompt: `Average value:`,
      expr: c.p,
      answer: c.a,
      options: shuffle([c.a, ...c.alt]),
      explain: c.why,
    };
  }

  // accumulation
  return {
    kind: 'mc',
    prompt: `Accumulation function:`,
    expr: `\\text{If } g(x) = \\displaystyle\\int_0^x (3t^2 + 1)\\,dt, \\text{ find } g'(x).`,
    answer: '3x^2 + 1',
    options: shuffle(['3x^2 + 1', 'x^3 + x', '6x', '3x^2 + 1 + C']),
    explain: `FTC Part 1: $g'(x) = f(x)$ at the upper limit.`,
  };
}

// ============================================================
//  FTC FORTRESS — Boss Battle
// ============================================================
function makeFTCProblem() {
  const kind = pick(['defint', 'derivint', 'netchange', 'avgValue', 'ftcMix']);

  if (kind === 'defint') {
    const a = pick([1, 2, 3]), b = a + pick([1, 2, 3]);
    const ans = b * b - a * a;
    return {
      expr: `\\int_{${a}}^{${b}} 2x\\,dx`,
      answer: fmt(ans),
      options: distractors(ans),
      explain: `Antiderivative $x^2$; evaluate: $${b}^2 - ${a}^2 = ${ans}$.`,
      dmg: 25,
    };
  }

  if (kind === 'derivint') {
    const f = pick([
      { e: '\\sin(t^2)', a: '\\sin(x^2)', d: ['\\cos(x^2)', '2x\\sin(x^2)', '2x\\cos(x^2)'] },
      { e: 't^3 + 1',    a: 'x^3 + 1',    d: ['3x^2', '\\dfrac{x^4}{4} + x', '3x^2 + 1'] },
      { e: 'e^{t^2}',    a: 'e^{x^2}',    d: ['2xe^{x^2}', '\\dfrac{e^{x^2}}{x}', '2x'] },
    ]);
    return {
      expr: `\\dfrac{d}{dx}\\!\\left[\\displaystyle\\int_0^x ${f.e}\\,dt\\right]`,
      answer: f.a,
      options: shuffle([f.a, ...f.d]),
      explain: `FTC Part 1: $g'(x) = f(x)$ at the upper limit.`,
      dmg: 30,
    };
  }

  if (kind === 'netchange') {
    const v = pick([
      { desc: `\\text{velocity } v(t) = 3t^2 \\text{ from } t=0 \\text{ to } t=2`, a: '8', opts: ['8', '6', '12', '4'], why: `$\\int_0^2 3t^2\\,dt = t^3 \\big|_0^2 = 8$.` },
      { desc: `\\text{velocity } v(t) = 2t \\text{ from } t=1 \\text{ to } t=4`, a: '15', opts: ['15', '8', '14', '6'], why: `$\\int_1^4 2t\\,dt = 16 - 1 = 15$.` },
      { desc: `\\text{rate } r(t) = 6 + 2t \\text{ from } t=0 \\text{ to } t=3`, a: '27', opts: ['27', '24', '18', '30'], why: `$\\int_0^3 (6+2t)\\,dt = 18 + 9 = 27$.` },
    ]);
    return {
      expr: `\\text{Net change: } ${v.desc}`,
      answer: v.a,
      options: shuffle(v.opts),
      explain: v.why,
      dmg: 28,
    };
  }

  if (kind === 'avgValue') {
    return {
      expr: `\\text{Average value of } f(x) = 4 - x^2 \\text{ on } [0, 2]`,
      answer: '\\dfrac{8}{3}',
      options: shuffle(['\\dfrac{8}{3}', '\\dfrac{4}{3}', '2', '4']),
      explain: `$\\dfrac{1}{2}\\int_0^2 (4-x^2)\\,dx = \\dfrac{1}{2}\\cdot\\dfrac{16}{3} = \\dfrac{8}{3}$.`,
      dmg: 28,
    };
  }

  // ftcMix: combine concepts
  return {
    expr: `\\text{If } \\displaystyle\\int_0^4 f(x)\\,dx = 10 \\text{ and } \\displaystyle\\int_0^2 f(x)\\,dx = 3, \\text{ find } \\displaystyle\\int_2^4 f(x)\\,dx.`,
    answer: '7',
    options: shuffle(['7', '13', '-7', '5']),
    explain: `Splitting: $\\int_0^4 = \\int_0^2 + \\int_2^4 \\Rightarrow \\int_2^4 = 10 - 3 = 7$.`,
    dmg: 25,
  };
}

// ============================================================
//  RENDERERS
// ============================================================
const renderers = {
  limits: renderLimitLander,
  deriv:  renderDerivDash,
  chain:  renderChainReaction,
  rates:  renderRateRush,
  optim:  renderOptimization,
  integ:  renderIntegralInvaders,
  slope:  renderSlopeField,
  area:   renderAreaArena,
  ftc:    renderFTC,
};

// ---------- LIMIT LANDER ----------
function renderLimitLander(stage, p) {
  stage.innerHTML = `
    <div class="lander-scene">
      <div class="lander-stage">
        <div class="lander-fuel">FUEL: <span id="lander-fuel-val">100</span></div>
        <div class="lander-ship" id="lander-ship"></div>
        <div class="lander-pad"></div>
        <div class="lander-target-label" id="lander-target-label">TARGET → ?</div>
      </div>
      <div class="lander-panel">
        <h3>EVALUATE THE LIMIT</h3>
        <div class="lander-expr">$${p.expr}$</div>
        <div class="answer-grid" id="lander-options"></div>
        <p style="font-size:9px; color:var(--cyan); opacity:0.7; line-height:1.5;">
          Land safely by picking the right limit before fuel runs out.
        </p>
      </div>
    </div>
  `;
  const grid = stage.querySelector('#lander-options');
  const ship = stage.querySelector('#lander-ship');
  const fuelEl = stage.querySelector('#lander-fuel-val');
  let fuel = 100, pos = 8, timer;

  const btns = p.options.map(opt => { const b = makeOpt(opt); grid.appendChild(b); return b; });

  function tick() {
    fuel -= 4; pos += 5;
    fuelEl.textContent = fuel;
    ship.style.top = pos + '%';
    if (fuel <= 0 || pos >= 78) {
      clearInterval(timer);
      btns.forEach(b => b.disabled = true);
      stage.querySelector('#lander-target-label').innerHTML = `TARGET → $${p.answer}$`;
      renderMath(stage.querySelector('#lander-target-label'));
      answerChosen(false, null, btns);
    }
  }
  timer = setInterval(tick, 600);

  btns.forEach(b => {
    b.addEventListener('click', () => {
      clearInterval(timer);
      const correct = b.dataset.value === p.answer;
      stage.querySelector('#lander-target-label').innerHTML = `TARGET → $${p.answer}$`;
      renderMath(stage.querySelector('#lander-target-label'));
      if (correct) ship.style.top = '74%';
      answerChosen(correct, b, btns);
    });
  });
}

// ---------- DERIVATIVE DASH ----------
function renderDerivDash(stage, p) {
  stage.innerHTML = `
    <div class="dash-scene">
      <div class="dash-prompt">
        <div class="problem-prompt">CHOMP THE CORRECT DERIVATIVE</div>
        <div class="problem-expr">$${p.expr}$</div>
      </div>
      <div class="dash-board" id="dash-board"></div>
    </div>
  `;
  const board = stage.querySelector('#dash-board');
  const positions = [
    { left: '15%', top: '20%' }, { left: '70%', top: '15%' },
    { left: '20%', top: '70%' }, { left: '75%', top: '70%' },
  ];
  const pacman = document.createElement('div');
  pacman.className = 'pacman';
  pacman.style.left = '46%'; pacman.style.top = '46%';
  board.appendChild(pacman);

  const pellets = p.options.map((opt, i) => {
    const el = document.createElement('div');
    el.className = 'pellet';
    el.style.left = positions[i].left;
    el.style.top = positions[i].top;
    el.dataset.value = opt;
    el.innerHTML = `$${opt}$`;
    board.appendChild(el);
    return el;
  });

  pellets.forEach(el => {
    el.addEventListener('click', () => {
      pacman.style.left = el.style.left;
      pacman.style.top = el.style.top;
      const correct = el.dataset.value === p.answer;
      setTimeout(() => {
        if (correct) el.classList.add('correct'); else el.classList.add('wrong');
        answerChosen(correct, el, pellets);
      }, 220);
    });
  });
}

// ---------- CHAIN REACTION ----------
function renderChainReaction(stage, p) {
  const layersHTML = p.layers
    ? p.layers.map(l => `<div class="chain-layer">$${l}$</div>`).join('<span style="color:var(--red);font-size:24px;">→</span>')
    : '';
  stage.innerHTML = `
    <div class="chain-scene">
      <div class="chain-prompt">
        <h3>UNWRAP THE FUNCTION</h3>
        <div class="chain-layers">${layersHTML}</div>
        <div class="problem-expr" style="margin-top:10px;">$${p.expr}$</div>
      </div>
      <div class="chain-options">
        <div class="answer-grid" id="chain-opts"></div>
      </div>
    </div>
  `;
  const grid = stage.querySelector('#chain-opts');
  const btns = p.options.map(opt => { const b = makeOpt(opt); grid.appendChild(b); return b; });
  bindOptions(btns, p);
}

// ---------- RATE RUSH (formerly Related Rates Arena) ----------
function renderRateRush(stage, p) {
  let animHTML = '';
  if (p.scene === 'balloon') {
    animHTML = '<div class="balloon"></div>';
  } else if (p.scene === 'ladder') {
    animHTML = `
      <svg class="ladder-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <line x1="20" y1="20" x2="20" y2="180" stroke="#ff8c1a" stroke-width="6"/>
        <line x1="20" y1="180" x2="180" y2="180" stroke="#ff8c1a" stroke-width="6"/>
        <line id="ladder-line" x1="20" y1="60" x2="120" y2="180" stroke="#00f0ff" stroke-width="6" stroke-linecap="round">
          <animate attributeName="x2" values="120;160;120" dur="4s" repeatCount="indefinite"/>
          <animate attributeName="y1" values="60;30;60" dur="4s" repeatCount="indefinite"/>
        </line>
      </svg>
    `;
  } else if (p.scene === 'cone') {
    animHTML = `
      <svg class="ladder-svg" viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">
        <polygon points="40,20 160,20 100,200" fill="none" stroke="#ff8c1a" stroke-width="4"/>
        <polygon points="55,60 145,60 100,200" fill="#00f0ff" opacity="0.5">
          <animate attributeName="points" values="55,60 145,60 100,200; 70,110 130,110 100,200; 55,60 145,60 100,200" dur="4s" repeatCount="indefinite"/>
        </polygon>
      </svg>
    `;
  }

  stage.innerHTML = `
    <div class="rates-scene">
      <div class="rates-anim">${animHTML}</div>
      <div class="rates-panel">
        <h3>SCENARIO</h3>
        <p class="scenario">${p.scenario}</p>
        <h3 style="margin-top:8px">YOUR ANSWER</h3>
        <div class="answer-grid" id="rates-opts"></div>
      </div>
    </div>
  `;
  const grid = stage.querySelector('#rates-opts');
  const btns = p.options.map(opt => { const b = makeOpt(opt); grid.appendChild(b); return b; });
  bindOptions(btns, p);
}

// ---------- OPTIMIZATION OASIS (slider + MC mix) ----------
function renderOptimization(stage, p) {
  if (p.ui === 'mc') return renderOptMC(stage, p);
  return renderOptSlider(stage, p);
}

function renderOptSlider(stage, p) {
  stage.innerHTML = `
    <div class="opt-scene">
      <div class="opt-prompt">
        <h3>${p.title}</h3>
        <p>${p.desc}</p>
      </div>
      <div class="opt-graph">
        <canvas id="opt-canvas" class="opt-canvas" width="640" height="280"></canvas>
      </div>
      <div class="opt-slider-row">
        <label>VARIABLE</label>
        <input id="opt-slider" type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${(p.min + p.max) / 2}">
        <div class="opt-readout" id="opt-readout"></div>
        <button class="opt-submit" id="opt-submit">LOCK IN ANSWER</button>
      </div>
    </div>
  `;
  const canvas = stage.querySelector('#opt-canvas');
  const slider = stage.querySelector('#opt-slider');
  const readout = stage.querySelector('#opt-readout');
  const submit = stage.querySelector('#opt-submit');

  function drawGraph(currentX) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(181,61,255,0.18)'; ctx.lineWidth = 1;
    for (let gx = 0; gx <= W; gx += 32) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
    for (let gy = 0; gy <= H; gy += 32) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

    const samples = 220;
    const xs = [], ys = [];
    let yMin = Infinity, yMax = -Infinity;
    for (let i = 0; i <= samples; i++) {
      const t = p.min + (p.max - p.min) * (i / samples);
      const yv = p.f(t);
      if (Number.isFinite(yv)) { xs.push(t); ys.push(yv); if (yv < yMin) yMin = yv; if (yv > yMax) yMax = yv; }
    }
    if (yMax - yMin < 1e-6) yMax = yMin + 1;
    const margin = 24;
    const sx = x => margin + (W - 2 * margin) * (x - p.min) / (p.max - p.min);
    const sy = y => H - margin - (H - 2 * margin) * (y - yMin) / (yMax - yMin);

    ctx.strokeStyle = '#b53dff'; ctx.shadowColor = '#b53dff'; ctx.shadowBlur = 10; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < xs.length; i++) {
      const px = sx(xs[i]), py = sy(ys[i]);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    const cx = sx(currentX), cy = sy(p.f(currentX));
    ctx.fillStyle = '#ffe93d'; ctx.shadowColor = '#ffe93d'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#b53dff'; ctx.font = '12px VT323, monospace';
    ctx.fillText('f(var)', 8, 16); ctx.fillText('var →', W - 50, H - 6);
  }
  function update() { const v = parseFloat(slider.value); readout.textContent = p.readout(v); drawGraph(v); }
  slider.addEventListener('input', update); update();

  submit.addEventListener('click', () => {
    const v = parseFloat(slider.value);
    const correct = Math.abs(v - p.best) <= p.tol;
    answerChosen(correct, null, [submit]);
  });
}

function renderOptMC(stage, p) {
  stage.innerHTML = `
    <div class="opt-scene">
      <div class="opt-prompt">
        <h3>ANALYTICAL APPLICATION</h3>
        <p>$${p.expr}$</p>
      </div>
      <div class="opt-graph" style="padding:24px; flex-direction:column;">
        <div class="answer-grid" id="opt-mc-opts" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); width:100%; max-width:760px;"></div>
      </div>
    </div>
  `;
  const grid = stage.querySelector('#opt-mc-opts');
  const btns = p.options.map(opt => {
    const b = makeOpt(opt);
    b.style.borderColor = 'var(--purple)';
    b.style.color = 'var(--paper)';
    b.style.textShadow = '0 0 6px var(--purple)';
    return b;
  });
  btns.forEach(b => grid.appendChild(b));
  bindOptions(btns, p);
}

// ---------- INTEGRAL INVADERS ----------
function renderIntegralInvaders(stage, p) {
  stage.innerHTML = `
    <div class="invaders-scene">
      <div class="invaders-stars"></div>
      <div class="invader-row">
        <div class="invader">$${p.expr}$</div>
      </div>
      <div class="invader-prompt">
        <div class="problem-prompt">PICK THE ANTIDERIVATIVE (OR ANSWER) TO BLAST IT</div>
      </div>
      <div class="invader-cannons" id="cannon-row"></div>
    </div>
  `;
  const cannons = stage.querySelector('#cannon-row');
  const invader = stage.querySelector('.invader');
  const btns = p.options.map(opt => { const b = makeOpt(opt, 'cannon-btn'); cannons.appendChild(b); return b; });
  btns.forEach(b => {
    b.addEventListener('click', () => {
      const correct = b.dataset.value === p.answer;
      if (correct) invader.classList.add('destroyed');
      answerChosen(correct, b, btns);
    });
  });
}

// ---------- SLOPE FIELD SHOWDOWN ----------
function renderSlopeField(stage, p) {
  if (p.kind === 'field') {
    stage.innerHTML = `
      <div class="slope-scene">
        <div class="slope-field-wrap">
          <canvas id="slope-canvas" class="slope-canvas" width="480" height="480"></canvas>
        </div>
        <div class="slope-panel">
          <h3>${p.prompt}</h3>
          <p class="scenario">Match the slope field on the left to its differential equation.</p>
          <div class="answer-grid" id="slope-opts"></div>
        </div>
      </div>
    `;
    drawSlopeField(stage.querySelector('#slope-canvas'), p.field);
  } else {
    stage.innerHTML = `
      <div class="slope-scene">
        <div class="slope-field-wrap" style="padding:18px; flex-direction:column; gap:14px;">
          <div class="problem-prompt" style="color:var(--blue); text-shadow:0 0 8px var(--blue);">${p.prompt}</div>
          <div class="problem-expr">$${p.expr}$</div>
        </div>
        <div class="slope-panel">
          <h3>YOUR ANSWER</h3>
          <div class="answer-grid" id="slope-opts"></div>
        </div>
      </div>
    `;
  }
  const grid = stage.querySelector('#slope-opts');
  const btns = p.options.map(opt => { const b = makeOpt(opt); grid.appendChild(b); return b; });
  bindOptions(btns, p);
}

function drawSlopeField(canvas, fn) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  // grid background
  ctx.strokeStyle = 'rgba(61,164,255,0.15)'; ctx.lineWidth = 1;
  for (let gx = 0; gx <= W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
  for (let gy = 0; gy <= H; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
  // axes
  ctx.strokeStyle = 'rgba(61,164,255,0.45)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();

  // slope segments
  const range = 4; // from -4 to 4 on each axis
  const steps = 13; // 13×13 grid
  const segLen = 14;
  ctx.strokeStyle = '#3da4ff';
  ctx.shadowColor = '#3da4ff'; ctx.shadowBlur = 6;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      const x = -range + (2 * range) * (i / (steps - 1));
      const y = -range + (2 * range) * (j / (steps - 1));
      const m = fn(x, y);
      if (!Number.isFinite(m)) continue;
      const slopeMag = Math.min(Math.abs(m), 5);
      const angle = Math.atan(m);
      const cxp = W / 2 + (x / range) * (W / 2 - 12);
      const cyp = H / 2 - (y / range) * (H / 2 - 12);
      const dx = Math.cos(angle) * segLen / 2;
      const dy = -Math.sin(angle) * segLen / 2;
      // color tint by magnitude
      ctx.strokeStyle = slopeMag > 2 ? '#ffe93d' : '#3da4ff';
      ctx.beginPath();
      ctx.moveTo(cxp - dx, cyp - dy);
      ctx.lineTo(cxp + dx, cyp + dy);
      ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;
}

// ---------- AREA ARENA ----------
function renderAreaArena(stage, p) {
  let canvasHTML = '';
  if (p.kind === 'between' && p.curves) {
    canvasHTML = `<canvas id="area-canvas" class="area-canvas" width="420" height="420"></canvas>`;
  } else if (p.kind === 'volume') {
    canvasHTML = `<div style="font-size:90px; filter:drop-shadow(0 0 12px var(--mint));">${
      p.flavor === 'disk' ? '⬭' : p.flavor === 'washer' ? '◯' : '◼'
    }</div>`;
  } else {
    canvasHTML = `<div style="font-size:80px; color:var(--mint); filter:drop-shadow(0 0 12px var(--mint));">∮</div>`;
  }

  stage.innerHTML = `
    <div class="area-scene">
      <div class="area-graph-wrap">${canvasHTML}</div>
      <div class="area-panel">
        <h3>${p.prompt}</h3>
        ${p.expr ? `<p class="scenario">$${p.expr}$</p>` : ''}
        <h3 style="margin-top:8px">YOUR ANSWER</h3>
        <div class="answer-grid" id="area-opts"></div>
      </div>
    </div>
  `;
  if (p.kind === 'between' && p.curves) {
    drawAreaBetween(stage.querySelector('#area-canvas'), p.curves);
  }
  const grid = stage.querySelector('#area-opts');
  const btns = p.options.map(opt => { const b = makeOpt(opt); grid.appendChild(b); return b; });
  bindOptions(btns, p);
}

function drawAreaBetween(canvas, c) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  // gridlines
  ctx.strokeStyle = 'rgba(61,255,214,0.15)'; ctx.lineWidth = 1;
  for (let gx = 0; gx <= W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
  for (let gy = 0; gy <= H; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

  // Map: x ∈ [a-0.5, b+0.5], y auto-fit
  const padX = (c.b - c.a) * 0.1 + 0.4;
  const xMin = c.a - padX, xMax = c.b + padX;
  let yMin = Infinity, yMax = -Infinity;
  const sampleCount = 200;
  for (let i = 0; i <= sampleCount; i++) {
    const t = xMin + (xMax - xMin) * (i / sampleCount);
    const a = c.f(t), b = c.g(t);
    if (Number.isFinite(a)) { yMin = Math.min(yMin, a); yMax = Math.max(yMax, a); }
    if (Number.isFinite(b)) { yMin = Math.min(yMin, b); yMax = Math.max(yMax, b); }
  }
  const padY = (yMax - yMin) * 0.2 + 0.5;
  yMin -= padY; yMax += padY;
  const margin = 24;
  const sx = x => margin + (W - 2 * margin) * (x - xMin) / (xMax - xMin);
  const sy = y => H - margin - (H - 2 * margin) * (y - yMin) / (yMax - yMin);

  // Axes
  ctx.strokeStyle = 'rgba(61,255,214,0.4)';
  ctx.beginPath(); ctx.moveTo(margin, sy(0)); ctx.lineTo(W - margin, sy(0)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx(0), margin); ctx.lineTo(sx(0), H - margin); ctx.stroke();

  // Shaded region between curves on [a, b]
  ctx.fillStyle = 'rgba(61,255,214,0.35)';
  ctx.beginPath();
  const N = 120;
  for (let i = 0; i <= N; i++) {
    const xv = c.a + (c.b - c.a) * (i / N);
    const yt = Math.max(c.f(xv), c.g(xv));
    if (i === 0) ctx.moveTo(sx(xv), sy(yt));
    else ctx.lineTo(sx(xv), sy(yt));
  }
  for (let i = N; i >= 0; i--) {
    const xv = c.a + (c.b - c.a) * (i / N);
    const yb = Math.min(c.f(xv), c.g(xv));
    ctx.lineTo(sx(xv), sy(yb));
  }
  ctx.closePath(); ctx.fill();

  // Curves
  const plot = (fn, color) => {
    ctx.strokeStyle = color; ctx.lineWidth = 2.5;
    ctx.shadowColor = color; ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let i = 0; i <= sampleCount; i++) {
      const xv = xMin + (xMax - xMin) * (i / sampleCount);
      const yv = fn(xv);
      if (!Number.isFinite(yv)) continue;
      const px = sx(xv), py = sy(yv);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  };
  plot(c.f, '#3dffd6');
  plot(c.g, '#ff3dcb');

  // labels
  ctx.fillStyle = '#3dffd6'; ctx.font = '14px VT323, monospace';
  ctx.fillText('y = ' + c.top, 8, 16);
  ctx.fillStyle = '#ff3dcb';
  ctx.fillText('y = ' + c.bot, 8, 32);
}

// ---------- FTC FORTRESS ----------
let ftcBossHP = 100;
function renderFTC(stage, p) {
  if (state.round === 0) ftcBossHP = 100;
  stage.innerHTML = `
    <div class="ftc-scene">
      <div class="ftc-boss">
        <div class="boss-hp"><div class="boss-hp-fill" id="boss-hp-fill" style="width:${ftcBossHP}%"></div></div>
        <div class="boss-label">⚠ DR. ∫NTEGRAL · HP ${ftcBossHP}</div>
        <div class="boss-sprite" id="boss-sprite">🧙‍♂️</div>
      </div>
      <div class="ftc-control">
        <div class="problem-prompt" style="color:var(--red);text-shadow:0 0 8px var(--red);">CAST FTC TO DAMAGE THE BOSS</div>
        <div class="problem-expr">$${p.expr}$</div>
        <div class="answer-grid" id="ftc-opts"></div>
      </div>
    </div>
  `;
  const grid = stage.querySelector('#ftc-opts');
  const sprite = stage.querySelector('#boss-sprite');
  const hpFill = stage.querySelector('#boss-hp-fill');
  const btns = p.options.map(opt => { const b = makeOpt(opt); grid.appendChild(b); return b; });
  btns.forEach(b => {
    b.addEventListener('click', () => {
      const correct = b.dataset.value === p.answer;
      if (correct) {
        ftcBossHP = Math.max(0, ftcBossHP - (p.dmg || 25));
        hpFill.style.width = ftcBossHP + '%';
        sprite.style.transform = 'translateX(10px) rotate(8deg)';
        setTimeout(() => sprite.style.transform = '', 200);
        if (ftcBossHP <= 0) sprite.textContent = '💀';
      } else {
        sprite.textContent = '😈';
        setTimeout(() => { if (ftcBossHP > 0) sprite.textContent = '🧙‍♂️'; }, 600);
      }
      answerChosen(correct, b, btns);
    });
  });
}

// ============================================================
//  INIT
// ============================================================
showScreen('title');

document.addEventListener('keydown', (e) => {
  if (state.current === 'title' && (e.key === 'Enter' || e.key === ' ')) {
    document.getElementById('btn-insert-coin').click();
  }
});
