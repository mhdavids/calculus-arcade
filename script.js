// ============================================================
//  CALCULUS ARCADE
//  Six games. Each teaches an AP Calc AB pillar.
//  Score ≥ 8/10 in each to "clear" the cabinet.
//  Clear all six to escape the arcade.
// ============================================================

const STORAGE_KEY = 'calc-arcade-progress-v1';

const GAMES = [
  { id: 'limits',     name: 'LIMIT LANDER',       topic: 'Limits & Continuity',     color: 'cyan',   icon: '▲' },
  { id: 'deriv',      name: 'DERIVATIVE DASH',    topic: 'Differentiation Rules',   color: 'pink',   icon: '●' },
  { id: 'integ',      name: 'INTEGRAL INVADERS',  topic: 'Antiderivatives',         color: 'green',  icon: '👾' },
  { id: 'rates',      name: 'RELATED RATES',      topic: 'Applications: dy/dt',     color: 'orange', icon: '⟲' },
  { id: 'optim',      name: 'OPTIMIZATION OASIS', topic: 'Max / Min Problems',      color: 'purple', icon: '∿' },
  { id: 'ftc',        name: 'FTC FORTRESS',       topic: 'Fundamental Theorem',     color: 'yellow', icon: '∫' },
];

// ---------- State ----------
const state = {
  current: 'title',
  game: null,        // active game id
  round: 0,
  score: 0,
  lives: 3,
  problems: [],      // current run's problems
  progress: loadProgress(),
};

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
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
  document.getElementById('games-cleared').textContent = `CLEARED ${cleared} / 6`;
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

  // Build 10 problems via the matching generator
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
}

function answerChosen(correct, chosenEl, allBtns) {
  if (correct) {
    state.score++;
    setMsg('CORRECT! ' + randomPraise(), 'correct');
    playBeep(880, 0.1);
    if (chosenEl) chosenEl.classList.add('correct');
  } else {
    state.lives--;
    setMsg('WRONG. ' + (state.problems[state.round].explain || ''), 'wrong');
    playBeep(160, 0.18);
    if (chosenEl) chosenEl.classList.add('wrong');
  }
  if (allBtns) allBtns.forEach(b => b.disabled = true);

  if (state.lives <= 0) {
    setTimeout(() => endGame(true), 1100);
    return;
  }
  setTimeout(() => {
    state.round++;
    renderProblem();
  }, 1100);
}

function setMsg(text, kind = 'info') {
  const m = document.getElementById('game-message');
  m.textContent = text;
  m.className = 'game-message ' + kind;
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
//  AUDIO (tiny WebAudio blips)
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

// Format a number / fraction tidily.
function fmt(n) {
  if (n === Infinity) return '∞';
  if (n === -Infinity) return '-∞';
  if (Number.isNaN(n)) return 'DNE';
  if (Number.isInteger(n)) return String(n);
  return (Math.round(n * 100) / 100).toString();
}

// ============================================================
//  PROBLEM GENERATORS  (each returns an array of 10 problems)
// ============================================================
const problemGenerators = {
  limits: () => Array.from({ length: 10 }, () => makeLimitProblem()),
  deriv:  () => Array.from({ length: 10 }, () => makeDerivProblem()),
  integ:  () => Array.from({ length: 10 }, () => makeIntegProblem()),
  rates:  () => shuffle(ratesBank()).slice(0, 10),
  optim:  () => shuffle(optimBank()).slice(0, 10),
  ftc:    () => Array.from({ length: 10 }, () => makeFTCProblem()),
};

// ---------- LIMITS ----------
function makeLimitProblem() {
  const kind = pick(['poly', 'rational', 'piecewise', 'indeterminate']);
  if (kind === 'poly') {
    const a = pick([1, 2, -1, 3, -2]);
    const b = pick([1, -1, 2, -2, 3]);
    const c = pick([0, 1, 2, -1]);
    const x = pick([0, 1, 2, -1, 3]);
    const ans = a * x * x + b * x + c;
    return {
      expr: `lim<sub>x→${x}</sub>  (${a}x² ${b >= 0 ? '+' : '-'} ${Math.abs(b)}x ${c >= 0 ? '+' : '-'} ${Math.abs(c)})`,
      answer: fmt(ans),
      options: distractors(ans),
      explain: `Polynomials are continuous — just plug in: ${ans}.`,
    };
  }
  if (kind === 'rational') {
    // (x² - a²)/(x - a) -> 2a
    const a = pick([1, 2, 3, 4, 5]);
    const ans = 2 * a;
    return {
      expr: `lim<sub>x→${a}</sub>  (x² − ${a * a}) / (x − ${a})`,
      answer: fmt(ans),
      options: distractors(ans),
      explain: `Factor numerator: (x-${a})(x+${a}). Cancel → x+${a}, plug in ${a} → ${ans}.`,
    };
  }
  if (kind === 'piecewise') {
    const a = pick([1, 2, 3]);
    const left = a * a;
    const right = 2 * a + 1;
    const equal = left === right;
    return {
      expr: `lim<sub>x→${a}</sub>  f(x), where f(x) = x² for x<${a}, 2x+1 for x≥${a}`,
      answer: equal ? fmt(left) : 'DNE',
      options: shuffle([fmt(left), fmt(right), 'DNE', fmt(a)].filter((v, i, s) => s.indexOf(v) === i)).slice(0, 4),
      explain: equal
        ? `Both sides equal ${left}, so the limit exists.`
        : `Left limit ${left} ≠ right limit ${right}, so the limit DNE.`,
    };
  }
  // indeterminate sin(x)/x style
  const choice = pick(['sinx', 'cos1']);
  if (choice === 'sinx') {
    return {
      expr: `lim<sub>x→0</sub>  sin(x) / x`,
      answer: '1',
      options: ['0', '1', '∞', 'DNE'],
      explain: 'Famous limit: sin(x)/x → 1 as x→0.',
    };
  }
  return {
    expr: `lim<sub>x→0</sub>  (1 − cos(x)) / x`,
    answer: '0',
    options: ['0', '1', '1/2', 'DNE'],
    explain: 'Standard result: (1−cos x)/x → 0.',
  };
}

function distractors(n) {
  const opts = new Set();
  opts.add(fmt(n));
  while (opts.size < 4) {
    const d = n + pick([-3, -2, -1, 1, 2, 3, -n, n + 1]);
    opts.add(fmt(d));
  }
  return shuffle(Array.from(opts)).slice(0, 4);
}

// ---------- DERIVATIVES ----------
function makeDerivProblem() {
  const kind = pick(['power', 'sum', 'product', 'chain', 'trig', 'exp']);
  if (kind === 'power') {
    const n = pick([2, 3, 4, 5, 6]);
    return {
      expr: `d/dx [ x<sup>${n}</sup> ]`,
      answer: `${n}x^${n - 1}`,
      options: shuffle([`${n}x^${n - 1}`, `${n - 1}x^${n}`, `x^${n - 1}`, `${n}x^${n}`]),
      explain: `Power rule: bring down ${n}, decrement exponent.`,
    };
  }
  if (kind === 'sum') {
    const a = pick([2, 3, 4]); const b = pick([1, 2, 3]);
    return {
      expr: `d/dx [ ${a}x² + ${b}x − 7 ]`,
      answer: `${2 * a}x + ${b}`,
      options: shuffle([`${2 * a}x + ${b}`, `${a}x + ${b}`, `${2 * a}x − 7`, `${2 * a}x + ${b} − 7`]),
      explain: `Derivative of each term; constant vanishes.`,
    };
  }
  if (kind === 'product') {
    // d/dx[x · sin x] = sin x + x cos x
    return {
      expr: `d/dx [ x · sin(x) ]`,
      answer: 'sin(x) + x·cos(x)',
      options: shuffle(['sin(x) + x·cos(x)', 'cos(x)', 'x·cos(x)', '1 · sin(x)']),
      explain: 'Product rule: (f·g)′ = f′g + fg′.',
    };
  }
  if (kind === 'chain') {
    // d/dx[sin(3x)] = 3 cos(3x)
    return {
      expr: `d/dx [ sin(3x) ]`,
      answer: '3·cos(3x)',
      options: shuffle(['3·cos(3x)', 'cos(3x)', '−3·cos(3x)', '3·sin(3x)']),
      explain: 'Chain rule: derivative of outer × derivative of inner.',
    };
  }
  if (kind === 'trig') {
    const f = pick([
      { e: 'cos(x)', a: '−sin(x)', d: ['sin(x)', '−cos(x)', 'tan(x)'] },
      { e: 'tan(x)', a: 'sec²(x)', d: ['−sec²(x)', 'sec(x)tan(x)', 'cot(x)'] },
      { e: 'sec(x)', a: 'sec(x)·tan(x)', d: ['−sec(x)', 'tan(x)', 'sec²(x)'] },
    ]);
    return {
      expr: `d/dx [ ${f.e} ]`,
      answer: f.a,
      options: shuffle([f.a, ...f.d]),
      explain: 'Memorize the trig derivatives.',
    };
  }
  // exp
  const k = pick([2, 3, 5]);
  return {
    expr: `d/dx [ e<sup>${k}x</sup> ]`,
    answer: `${k}·e^(${k}x)`,
    options: shuffle([`${k}·e^(${k}x)`, `e^(${k}x)`, `${k}x·e^(${k}x)`, `${k - 1}·e^(${k}x)`]),
    explain: `Chain: derivative of inner (${k}) times e^${k}x.`,
  };
}

// ---------- INTEGRALS (antiderivatives) ----------
function makeIntegProblem() {
  const kind = pick(['power', 'trig', 'exp', 'recip']);
  if (kind === 'power') {
    const n = pick([2, 3, 4, 5]);
    return {
      expr: `∫ x<sup>${n}</sup> dx`,
      answer: `x^${n + 1}/${n + 1} + C`,
      options: shuffle([`x^${n + 1}/${n + 1} + C`, `${n}x^${n - 1} + C`, `x^${n + 1} + C`, `x^${n - 1}/${n - 1} + C`]),
      explain: `Reverse power rule: add 1 to exponent, divide.`,
    };
  }
  if (kind === 'trig') {
    const f = pick([
      { e: 'cos(x)', a: 'sin(x) + C', d: ['−sin(x) + C', 'cos(x) + C', '−cos(x) + C'] },
      { e: 'sin(x)', a: '−cos(x) + C', d: ['cos(x) + C', 'sin(x) + C', '−sin(x) + C'] },
      { e: 'sec²(x)', a: 'tan(x) + C', d: ['sec(x) + C', '−tan(x) + C', 'cot(x) + C'] },
    ]);
    return { expr: `∫ ${f.e} dx`, answer: f.a, options: shuffle([f.a, ...f.d]), explain: 'Reverse the trig derivative.' };
  }
  if (kind === 'exp') {
    return {
      expr: `∫ e<sup>x</sup> dx`,
      answer: 'e^x + C',
      options: shuffle(['e^x + C', 'x·e^x + C', 'e^x/x + C', 'ln(x) + C']),
      explain: 'e^x is its own antiderivative.',
    };
  }
  return {
    expr: `∫ (1/x) dx`,
    answer: 'ln|x| + C',
    options: shuffle(['ln|x| + C', '−1/x² + C', '1/x² + C', 'x·ln(x) + C']),
    explain: '∫ 1/x dx = ln|x| + C.',
  };
}

// ---------- RELATED RATES ----------
function ratesBank() {
  return [
    {
      scene: 'balloon',
      scenario: 'A spherical balloon inflates at 12 cm³/s. Find dr/dt when r = 5 cm. (V = (4/3)πr³)',
      answer: '12 / (100π) cm/s',
      options: ['12 / (100π) cm/s', '12π / 100 cm/s', '12 / (25π) cm/s', '12 · 4π · 25 cm/s'],
      explain: 'dV/dt = 4πr² · dr/dt → 12 = 4π(25) dr/dt → dr/dt = 12/(100π).',
    },
    {
      scene: 'ladder',
      scenario: 'A 10 ft ladder slides down a wall. Bottom moves out at 2 ft/s. How fast is the top moving when the bottom is 6 ft from the wall?',
      answer: '−1.5 ft/s',
      options: ['−1.5 ft/s', '1.5 ft/s', '−2 ft/s', '−2.5 ft/s'],
      explain: 'x² + y² = 100. At x=6, y=8. 2x·x′ + 2y·y′ = 0 → y′ = −(6·2)/8 = −1.5.',
    },
    {
      scene: 'cone',
      scenario: 'Water drains from a cone (r = h/2). Volume drops at 4 cm³/s. Find dh/dt when h = 6 cm.',
      answer: '−4/(9π) cm/s',
      options: ['−4/(9π) cm/s', '−4π/9 cm/s', '−4/(3π) cm/s', '−4/9 cm/s'],
      explain: 'V = (1/3)π(h/2)²h = πh³/12. dV/dt = πh²/4 · dh/dt. −4 = π(36)/4 dh/dt → dh/dt = −4/(9π).',
    },
    {
      scene: 'balloon',
      scenario: 'Sphere\'s surface area grows at 8 cm²/s. Find dr/dt when r = 2 cm. (S = 4πr²)',
      answer: '1 / (2π) cm/s',
      options: ['1 / (2π) cm/s', '8 / (2π) cm/s', '2π cm/s', '1/π cm/s'],
      explain: 'dS/dt = 8πr · dr/dt → 8 = 16π · dr/dt → dr/dt = 1/(2π).',
    },
    {
      scene: 'ladder',
      scenario: 'A car drives north at 60 mph. Another, 90 mi east of it, drives east at 45 mph. How fast is the distance between them changing right now?',
      answer: '+45 mph (approx)',
      options: ['+45 mph (approx)', '−45 mph', '+105 mph', '−15 mph'],
      explain: 'D² = x² + y². At t=0, y=0 → D=90. D·D′ = x·x′ + y·y′ = 90·45 + 0 = 4050 → D′ = 45.',
    },
    {
      scene: 'cone',
      scenario: 'A 6 ft tall person walks away from a 15 ft lamppost at 4 ft/s. How fast is the tip of their shadow moving?',
      answer: '20/3 ft/s',
      options: ['20/3 ft/s', '4 ft/s', '15/4 ft/s', '6 ft/s'],
      explain: 'Similar triangles: s/(x+s)=6/15 → s = 2x/3. d(tip)/dt = dx/dt + ds/dt = 4 + 8/3 = 20/3.',
    },
    {
      scene: 'balloon',
      scenario: 'A circle\'s area grows at 10π m²/s. Find dr/dt when r = 5 m. (A = πr²)',
      answer: '1 m/s',
      options: ['1 m/s', '2 m/s', '10π m/s', '1/π m/s'],
      explain: 'dA/dt = 2πr · dr/dt → 10π = 10π · dr/dt → dr/dt = 1.',
    },
    {
      scene: 'ladder',
      scenario: 'A 13 ft ladder. Top slides down at 5 ft/s. How fast is the bottom sliding out when the top is 12 ft up?',
      answer: '12 ft/s',
      options: ['12 ft/s', '5 ft/s', '5/12 ft/s', '13 ft/s'],
      explain: 'x² + y² = 169. At y=12, x=5. 2x·x′ + 2y·y′ = 0 → x′ = −(12·−5)/5 = 12.',
    },
    {
      scene: 'cone',
      scenario: 'Cube edge grows at 3 in/s. Find dV/dt when edge = 4 in. (V = s³)',
      answer: '144 in³/s',
      options: ['144 in³/s', '48 in³/s', '12 in³/s', '64 in³/s'],
      explain: 'dV/dt = 3s² · ds/dt = 3(16)(3) = 144.',
    },
    {
      scene: 'balloon',
      scenario: 'Two ships: A moves east 25 km/h, B moves north 20 km/h, starting at the same point. How fast is the distance between them growing after 2 hours?',
      answer: '√(25²+20²) = √1025 ≈ 32 km/h',
      options: ['√(25²+20²) = √1025 ≈ 32 km/h', '45 km/h', '5 km/h', '500 km/h'],
      explain: 'After 2h: x=50, y=40, D=√(2500+1600)=√4100. D·D′ = x·25 + y·20 = 1250+800 = 2050. D′ = 2050/√4100 ≈ 32.',
    },
  ];
}

// ---------- OPTIMIZATION ----------
function optimBank() {
  return [
    {
      title: 'BOX BUILDER',
      desc: 'You have 120 in² of cardboard to build an open-top square-base box. What base length s maximizes volume? V(s) = s²·h with 4sh + s² = 120, so h = (120−s²)/(4s).',
      f: s => (s * s) * ((120 - s * s) / (4 * s)),
      min: 0.5, max: 10, step: 0.1,
      best: Math.sqrt(40),
      tol: 0.4,
      readout: s => `s = ${s.toFixed(2)},  V = ${((s * s) * ((120 - s * s) / (4 * s))).toFixed(2)} in³`,
      explain: 'dV/ds = 0 → 3s² = 120 → s = √40 ≈ 6.32 in.',
    },
    {
      title: 'FENCED FIELD',
      desc: 'Fence a rectangular field along a river — only 3 sides need fencing, total fence = 200 ft. Maximize area A = x·y with 2x + y = 200.',
      f: x => x * (200 - 2 * x),
      min: 1, max: 99, step: 1,
      best: 50, tol: 3,
      readout: x => `x = ${x},  y = ${200 - 2 * x},  A = ${(x * (200 - 2 * x)).toFixed(0)} ft²`,
      explain: 'dA/dx = 200 − 4x = 0 → x = 50, y = 100, A = 5000.',
    },
    {
      title: 'CAN DESIGNER',
      desc: 'A cylindrical can holds 355 cm³. Minimize surface area S = 2πr² + 2πrh, with πr²h = 355.',
      f: r => 2 * Math.PI * r * r + 2 * 355 / r,
      min: 1, max: 8, step: 0.1,
      best: Math.cbrt(355 / (2 * Math.PI)),
      tol: 0.3,
      readout: r => `r = ${r.toFixed(2)},  S = ${(2 * Math.PI * r * r + 2 * 355 / r).toFixed(1)} cm²`,
      explain: 'dS/dr = 4πr − 710/r² = 0 → r³ = 355/(2π) → r ≈ 3.84.',
    },
    {
      title: 'TICKET PRICING',
      desc: 'At $10, you sell 200 tickets; each $0.50 raise loses 5 tickets. Revenue R(p) where p = $0.50 raises: R = (10 + 0.5p)(200 − 5p). Maximize p.',
      f: p => (10 + 0.5 * p) * (200 - 5 * p),
      min: 0, max: 30, step: 1,
      best: 10, tol: 1.5,
      readout: p => `raises = ${p},  price = $${(10 + 0.5 * p).toFixed(2)},  R = $${((10 + 0.5 * p) * (200 - 5 * p)).toFixed(0)}`,
      explain: 'R(p) = 2000 + 50p − 2.5p², R′ = 50 − 5p = 0 → p = 10.',
    },
    {
      title: 'CLOSEST POINT',
      desc: 'Find x ≥ 0 on the parabola y = x² closest to point (0, 1). Minimize D²(x) = x² + (x² − 1)².',
      f: x => x * x + Math.pow(x * x - 1, 2),
      min: 0, max: 2, step: 0.05,
      best: Math.sqrt(0.5),
      tol: 0.15,
      readout: x => `x = ${x.toFixed(2)},  D² = ${(x * x + Math.pow(x * x - 1, 2)).toFixed(3)}`,
      explain: 'd(D²)/dx = 2x + 4x(x²−1) = 2x(2x²−1) = 0 → x = √(1/2).',
    },
    {
      title: 'POSTER LAYOUT',
      desc: 'A poster has printed area 384 cm², 4 cm margins on sides, 6 cm top & bottom. Minimize total area: A = (x+8)(384/x + 12).',
      f: x => (x + 8) * (384 / x + 12),
      min: 4, max: 40, step: 0.5,
      best: 16, tol: 1,
      readout: x => `x = ${x.toFixed(1)},  A_total = ${((x + 8) * (384 / x + 12)).toFixed(0)} cm²`,
      explain: 'dA/dx = 0 → x = √(8·384/12) = √256 = 16.',
    },
    {
      title: 'SWIM-RUN RACE',
      desc: 'You stand on shore. Swim at 3 m/s to point x along beach (2 m offshore), then run at 5 m/s to a buoy 10 m down the beach. Minimize time T(x).',
      f: x => Math.sqrt(4 + x * x) / 3 + (10 - x) / 5,
      min: 0, max: 10, step: 0.1,
      best: 2 * 3 / Math.sqrt(25 - 9),
      tol: 0.3,
      readout: x => `x = ${x.toFixed(2)} m,  T = ${(Math.sqrt(4 + x * x) / 3 + (10 - x) / 5).toFixed(2)} s`,
      explain: 'Snell-like: x/(3√(4+x²)) = 1/5 → x = 2·3/√(25−9) = 6/4 = 1.5.',
    },
    {
      title: 'INSCRIBED RECT',
      desc: 'Find x to maximize the area of a rectangle inscribed under y = 9 − x² (x ≥ 0): A(x) = 2x(9 − x²).',
      f: x => 2 * x * (9 - x * x),
      min: 0, max: 3, step: 0.05,
      best: Math.sqrt(3), tol: 0.2,
      readout: x => `x = ${x.toFixed(2)},  A = ${(2 * x * (9 - x * x)).toFixed(2)}`,
      explain: 'dA/dx = 18 − 6x² = 0 → x = √3.',
    },
    {
      title: 'BUDGET FENCE',
      desc: 'Fence a rectangular pen with a divider down the middle. Total fence = 300 ft (3 widths + 2 lengths). Maximize area.',
      f: w => w * ((300 - 3 * w) / 2),
      min: 5, max: 95, step: 1,
      best: 50, tol: 3,
      readout: w => `w = ${w},  L = ${((300 - 3 * w) / 2).toFixed(1)},  A = ${(w * ((300 - 3 * w) / 2)).toFixed(0)}`,
      explain: 'A = w(300−3w)/2 = 150w − 1.5w². A′ = 150 − 3w = 0 → w = 50.',
    },
    {
      title: 'WIRE CUT',
      desc: 'Cut 20 in of wire into two pieces; bend one into a square (length x), the other into a circle. Minimize total area.',
      f: x => Math.pow(x / 4, 2) + Math.pow((20 - x) / (2 * Math.PI), 2) * Math.PI,
      min: 0, max: 20, step: 0.2,
      best: 80 / (Math.PI + 4),
      tol: 0.6,
      readout: x => `square = ${x.toFixed(1)} in,  total A = ${(Math.pow(x / 4, 2) + Math.pow((20 - x) / (2 * Math.PI), 2) * Math.PI).toFixed(2)}`,
      explain: 'A(x) = x²/16 + (20−x)²/(4π). Set A′ = 0 → x = 80/(π+4) ≈ 11.2.',
    },
  ];
}

// ---------- FTC ----------
function makeFTCProblem() {
  const kind = pick(['defint', 'derivint', 'netchange']);
  if (kind === 'defint') {
    const a = pick([1, 2, 3]); const b = a + pick([1, 2, 3]);
    // ∫ from a to b of 2x dx = b² - a²
    const ans = b * b - a * a;
    return {
      kind: 'mc',
      expr: `∫<sub>${a}</sub><sup>${b}</sup>  2x dx`,
      answer: fmt(ans),
      options: distractors(ans),
      explain: `Antiderivative is x². Evaluate: ${b}² − ${a}² = ${ans}.`,
      dmg: 25,
    };
  }
  if (kind === 'derivint') {
    // d/dx of integral from 0 to x of f(t) dt = f(x)
    const f = pick([
      { e: 'sin(t²)', a: 'sin(x²)', d: ['cos(x²)', '2x·sin(x²)', '2x·cos(x²)'] },
      { e: 't³ + 1', a: 'x³ + 1', d: ['3x²', '(x⁴/4) + x', '3x² + 1'] },
      { e: 'e^(t²)', a: 'e^(x²)', d: ['2x·e^(x²)', 'e^(x²)/x', '2x'] },
    ]);
    return {
      kind: 'mc',
      expr: `d/dx [ ∫<sub>0</sub><sup>x</sup> ${f.e} dt ]`,
      answer: f.a,
      options: shuffle([f.a, ...f.d]),
      explain: 'FTC Part 1: derivative of accumulator = integrand at upper limit.',
      dmg: 30,
    };
  }
  // net change theorem
  const v = pick([
    { desc: 'velocity v(t) = 3t² (m/s) from t=0 to t=2', ans: '8 m', opts: ['8 m', '6 m', '12 m', '4 m'], why: '∫₀² 3t² dt = t³|₀² = 8.' },
    { desc: 'velocity v(t) = 2t (m/s) from t=1 to t=4', ans: '15 m', opts: ['15 m', '8 m', '14 m', '6 m'], why: '∫₁⁴ 2t dt = t²|₁⁴ = 16 − 1 = 15.' },
    { desc: 'rate of water flow r(t) = 6 + 2t (L/min) from t=0 to t=3', ans: '27 L', opts: ['27 L', '24 L', '18 L', '30 L'], why: '∫₀³ (6+2t) dt = 6t + t²|₀³ = 18 + 9 = 27.' },
  ]);
  return {
    kind: 'mc',
    expr: `NET CHANGE: ${v.desc}`,
    answer: v.ans,
    options: shuffle(v.opts),
    explain: v.why,
    dmg: 28,
  };
}

// ============================================================
//  RENDERERS — each game has its own visual look.
// ============================================================
const renderers = {
  limits:  renderLimitLander,
  deriv:   renderDerivDash,
  integ:   renderIntegralInvaders,
  rates:   renderRatesArena,
  optim:   renderOptimization,
  ftc:     renderFTC,
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
        <div class="lander-expr">${p.expr}</div>
        <div class="answer-grid"></div>
        <p style="font-size:9px; color:var(--cyan); opacity:0.7; line-height:1.5;">
          Land safely by picking the right limit before the ship runs out of fuel.
        </p>
      </div>
    </div>
  `;
  const grid = stage.querySelector('.answer-grid');
  const ship = stage.querySelector('#lander-ship');
  const fuelEl = stage.querySelector('#lander-fuel-val');
  const stageRect = stage.querySelector('.lander-stage');
  let fuel = 100;
  let pos = 8;
  let timer;

  const btns = p.options.map(opt => {
    const b = document.createElement('button');
    b.className = 'answer-btn';
    b.innerHTML = opt;
    grid.appendChild(b);
    return b;
  });

  function tick() {
    fuel -= 4;
    pos += 5;
    fuelEl.textContent = fuel;
    ship.style.top = pos + '%';
    if (fuel <= 0 || pos >= 78) {
      clearInterval(timer);
      btns.forEach(b => b.disabled = true);
      answerChosen(false, null, btns);
    }
  }
  timer = setInterval(tick, 600);

  btns.forEach(b => {
    b.addEventListener('click', () => {
      clearInterval(timer);
      const correct = b.textContent.trim() === p.answer.trim();
      stage.querySelector('#lander-target-label').innerHTML = `TARGET → ${p.answer}`;
      if (correct) { ship.style.top = '74%'; }
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
        <div class="problem-expr">${p.expr}</div>
      </div>
      <div class="dash-board" id="dash-board"></div>
    </div>
  `;
  const board = stage.querySelector('#dash-board');
  // Place 4 pellets at random positions
  const positions = [
    { left: '15%', top: '20%' },
    { left: '70%', top: '15%' },
    { left: '20%', top: '70%' },
    { left: '75%', top: '70%' },
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
    el.innerHTML = opt;
    board.appendChild(el);
    return { el, opt };
  });

  pellets.forEach(({ el, opt }) => {
    el.addEventListener('click', () => {
      // Move pacman towards pellet
      pacman.style.left = el.style.left;
      pacman.style.top = el.style.top;
      const correct = opt === p.answer;
      setTimeout(() => {
        if (correct) el.classList.add('correct'); else el.classList.add('wrong');
        answerChosen(correct, el, pellets.map(p => p.el));
      }, 220);
    });
  });
}

// ---------- INTEGRAL INVADERS ----------
function renderIntegralInvaders(stage, p) {
  stage.innerHTML = `
    <div class="invaders-scene">
      <div class="invaders-stars"></div>
      <div class="invader-row">
        <div class="invader">${p.expr}</div>
      </div>
      <div class="invader-prompt">
        <div class="problem-prompt">PICK THE ANTIDERIVATIVE TO BLAST IT</div>
      </div>
      <div class="invader-cannons"></div>
    </div>
  `;
  const cannons = stage.querySelector('.invader-cannons');
  const invader = stage.querySelector('.invader');
  const btns = p.options.map(opt => {
    const b = document.createElement('button');
    b.className = 'cannon-btn';
    b.innerHTML = opt;
    cannons.appendChild(b);
    return b;
  });
  btns.forEach(b => {
    b.addEventListener('click', () => {
      const correct = b.textContent.trim() === p.answer.trim();
      if (correct) invader.classList.add('destroyed');
      answerChosen(correct, b, btns);
    });
  });
}

// ---------- RELATED RATES ----------
function renderRatesArena(stage, p) {
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
        <div class="answer-grid"></div>
      </div>
    </div>
  `;
  const grid = stage.querySelector('.answer-grid');
  const btns = p.options.map(opt => {
    const b = document.createElement('button');
    b.className = 'answer-btn';
    b.textContent = opt;
    grid.appendChild(b);
    return b;
  });
  btns.forEach(b => {
    b.addEventListener('click', () => {
      const correct = b.textContent === p.answer;
      answerChosen(correct, b, btns);
    });
  });
}

// ---------- OPTIMIZATION ----------
function renderOptimization(stage, p) {
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
    // grid
    ctx.strokeStyle = 'rgba(181,61,255,0.18)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= W; gx += 32) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
    for (let gy = 0; gy <= H; gy += 32) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

    // Sample f(x) across slider range
    const samples = 220;
    const xs = [], ys = [];
    let yMin = Infinity, yMax = -Infinity;
    for (let i = 0; i <= samples; i++) {
      const t = p.min + (p.max - p.min) * (i / samples);
      const yv = p.f(t);
      if (Number.isFinite(yv)) {
        xs.push(t); ys.push(yv);
        if (yv < yMin) yMin = yv;
        if (yv > yMax) yMax = yv;
      }
    }
    if (yMax - yMin < 1e-6) { yMax = yMin + 1; }

    const margin = 24;
    const sx = x => margin + (W - 2 * margin) * (x - p.min) / (p.max - p.min);
    const sy = y => H - margin - (H - 2 * margin) * (y - yMin) / (yMax - yMin);

    // Curve
    ctx.strokeStyle = '#b53dff';
    ctx.shadowColor = '#b53dff'; ctx.shadowBlur = 10;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < xs.length; i++) {
      const px = sx(xs[i]), py = sy(ys[i]);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Current point
    const cx = sx(currentX); const cy = sy(p.f(currentX));
    ctx.fillStyle = '#ffe93d';
    ctx.shadowColor = '#ffe93d'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Axis labels
    ctx.fillStyle = '#b53dff';
    ctx.font = '12px VT323, monospace';
    ctx.fillText('f(var)', 8, 16);
    ctx.fillText('var →', W - 50, H - 6);
  }

  function update() {
    const v = parseFloat(slider.value);
    readout.textContent = p.readout(v);
    drawGraph(v);
  }
  slider.addEventListener('input', update);
  update();

  submit.addEventListener('click', () => {
    const v = parseFloat(slider.value);
    const correct = Math.abs(v - p.best) <= p.tol;
    answerChosen(correct, null, [submit]);
  });
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
        <div class="problem-expr">${p.expr}</div>
        <div class="answer-grid"></div>
      </div>
    </div>
  `;
  const grid = stage.querySelector('.answer-grid');
  const sprite = stage.querySelector('#boss-sprite');
  const hpFill = stage.querySelector('#boss-hp-fill');
  const btns = p.options.map(opt => {
    const b = document.createElement('button');
    b.className = 'answer-btn';
    b.innerHTML = opt;
    grid.appendChild(b);
    return b;
  });
  btns.forEach(b => {
    b.addEventListener('click', () => {
      const correct = b.textContent.trim() === p.answer.trim();
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

// Allow keyboard to start
document.addEventListener('keydown', (e) => {
  if (state.current === 'title' && (e.key === 'Enter' || e.key === ' ')) {
    document.getElementById('btn-insert-coin').click();
  }
});
