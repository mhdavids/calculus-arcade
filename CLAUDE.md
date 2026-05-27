# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page retro arcade simulator that teaches AP Calculus AB. The lobby presents nine arcade cabinets, one per CED unit (Units 1–8) plus a final boss (FTC FORTRESS). Each cabinet is a 10-question mini-game; scoring ≥ 8/10 "clears" the cabinet, and clearing all nine triggers the victory screen. Progress persists in `localStorage`.

No build, no tests, no package manager — three static files (`index.html`, `styles.css`, `script.js`) deployed to GitHub Pages.

## Run & deploy

- **Local preview:** open `index.html` directly, or `python3 -m http.server 8000` from the repo root then visit `http://localhost:8000` (use http rather than file:// if KaTeX or fetches misbehave).
- **Deploy:** push to `main`. GitHub Pages redeploys in ~30–60 seconds.
- **Live site:** https://mhdavids.github.io/calculus-arcade/
- **After pushing:** hard-refresh in the browser (Cmd+Shift+R) to bypass cached `script.js` / `styles.css`.

There is no lint, test, or build step. Verification = open the site and play it.

## Architecture

### Screens are siblings in `index.html`

Every screen (`title`, `entrance`, `lobby`, `game`, `stats`, `victory`) is a `<section class="screen" id="screen-XXX">` in `index.html`. Exactly one carries the `active` class at a time; `showScreen(id)` swaps it. There is no router and no framework.

### `script.js` is a state machine + nine game modules

The single file owns everything. Top-level structure:

1. **`GAMES` array** (top of file) — source of truth for the lobby. Each entry: `{ id, name, topic, color, icon }`. Order in this array = display order in the lobby.
2. **`state` object** — current screen, active game id, round, score, lives, current problem set.
3. **Routing & lobby** — `showScreen`, `renderLobby`, `renderStats`.
4. **Game runner** — `startGame(id)` → builds 10 problems via `problemGenerators[id]()`, then `renderProblem()` loops through them. `answerChosen(correct, btn, allBtns)` advances the round.
5. **`problemGenerators` map** — `id → () => Problem[]`. Each generator returns an array of 10 problems.
6. **`renderers` map** — `id → (stage, problem) => void`. Each renderer paints into `#game-stage` and wires up input.
7. **INIT** at the bottom — calls `showScreen('title')` and binds the keyboard fallback for the title screen.

To add a new game: add to `GAMES`, add a generator, add a renderer, add a cabinet color class in `styles.css` (`.cabinet.<color>` plus a CSS variable). `loadProgress()` backfills missing ids, so old saves keep working.

### Math rendering convention (important)

All math is **LaTeX strings stored without delimiters**. The renderers wrap them with `$...$` when inserting into HTML. After the renderer runs, `renderMath(stage)` calls KaTeX auto-render on the entire stage element.

```js
// Problem object shape:
{
  expr:    '\\lim_{x \\to 2}(x^2 + 1)',  // raw LaTeX, no $
  answer:  '5',                            // raw LaTeX, no $
  options: ['5', '3', '7', '\\text{DNE}'], // raw LaTeX strings
  explain: 'Plug in: $5$.',                // mixed text + inline $math$
}
```

KaTeX is loaded from CDN with `defer` (see `<head>` in `index.html`). `renderMath()` is a no-op if `window.renderMathInElement` is not yet available — so it's safe to call early.

### Answer comparison MUST use `dataset.value`, not `textContent`

KaTeX rewrites the DOM of any element containing math. After auto-render, a button that read `$3x$` no longer has `textContent === "3x"`. Compare canonical strings instead:

```js
const b = makeOpt(opt);          // sets b.dataset.value = opt and b.innerHTML = `$${opt}$`
// ...later:
const correct = b.dataset.value === p.answer;
```

Use the `makeOpt(opt, className?)` / `makeOptText(opt, className?)` / `bindOptions(buttons, problem)` helpers — they enforce this contract.

### Per-game visuals live in `styles.css`

Each game gets its own scoped scene block (`.lander-scene`, `.dash-scene`, `.invaders-scene`, `.chain-scene`, `.slope-scene`, `.area-scene`, `.opt-scene`, `.ftc-scene`, `.rates-scene`). Cabinet colors are CSS variables (`--cyan`, `--pink`, `--red`, `--blue`, `--mint`, etc.) referenced by `.cabinet.<color>` and inside each scene's accent styling.

The site-wide CRT effect is two fixed overlays (`.crt-overlay`, `.scanlines`) at the top of the body — don't add per-screen scanlines, they'd stack.

### Canvas-driven games

Two games draw to `<canvas>`:

- **Slope Field Showdown** — `drawSlopeField(canvas, fn)` renders a 13×13 grid of slope segments where `fn(x, y)` returns the slope; the "match the DE" problem variant supplies the function.
- **Area Arena** — `drawAreaBetween(canvas, curves)` plots two functions and shades the region between them on `[a, b]`. The `curves` object on the problem carries `{ f, g, a, b, top, bot }`.
- **Optimization Oasis** (slider variant) — `renderOptSlider` draws `p.f(x)` on a canvas and a moving point at the slider's current value.

### Mastery / persistence

- LocalStorage key: `calc-arcade-progress-v1`.
- Per-game record: `{ best: number, attempts: number, cleared: boolean }`.
- `cleared` flips to `true` once `best ≥ 8`. The lobby's "MASTERY %" averages `best` across all games. The victory screen auto-shows when all games are cleared.
- `loadProgress()` is forward-compatible: missing game ids are initialized on read, so adding a new game in `GAMES` doesn't break existing player saves.

## Conventions

- **No frameworks, no bundler.** Plain ES2020+ browser JS. If you reach for a dependency, add it via CDN `<script>` in `index.html`, not npm.
- **No emoji in source files** unless they're part of intentional UI (the FTC boss sprite, the trophy row on the victory screen, the cabinet `icon` field).
- **Press Start 2P** for chrome/UI text, **VT323** for math/expressions and numeric readouts. Both are loaded from Google Fonts at the top of `index.html`.
- **Generators are pure-ish** — they may use `Math.random` but never touch the DOM or `state`. Renderers do all DOM work.
- **One commit per cohesive change.** The user prefers commits that describe *why* in addition to *what*.
