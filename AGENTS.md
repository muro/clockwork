# AGENTS.md

This file provides guidance for AI coding agents when working with code in this repository. Tool-specific entrypoints such as `CLAUDE.md` and `GEMINI.md` import this file.

## What this is

`Uhrzeit Lernen` — a single-page, zero-build German clock-reading game. The whole app is `web/index.html` + `web/engine.js`, loaded directly in the browser. JSX runs at runtime via `@babel/standalone` from a CDN; React is also CDN-loaded. No npm, no bundler, no build step.

## Run / develop / test

```sh
# Serve the app (recommended; iOS Safari is picky about file://)
python3 -m http.server 8765 --directory web
# App:   http://localhost:8765/index.html
# Tests: http://localhost:8765/tests.html
```

`.claude/launch.json` configures the Claude Code preview server with the same command, on `:8765`.

There is no test runner, no linter, and no CI. Tests are ~96 in-browser assertions in `web/tests.html` that load `engine.js` via a `<script>` tag and run a tiny harness (`group`, `test`, `eq`, `ok`). The page title updates to `N ✓ / M ✗ — Uhrzeit Tests` so a headless check can grep `#summary`.

Regenerate the app icon (only when the icon design changes — the PNGs are committed):

```sh
pip3 install Pillow
python3 tools/build_icon.py   # writes web/icon.png and web/icon-192.png
```

## Working principles

- Think before acting. Read the surrounding code and tests, identify the abstraction boundary being touched, and decide whether the change belongs in the caller, callee, data model, configuration, or tests.
- Be concise in output but thorough in reasoning. If something is uncertain, say so.
- Prefer focused edits over rewriting whole files. Preserve existing conventions, avoid duplicated logic, and do not expose internal details through public APIs unless necessary.
- After editing, check whether the code is simpler or merely different. Remove dead branches, redundant state, and unnecessary special cases introduced by the change.

## Roadmap

`roadmap.html` is the living backlog for future product and technical work. When follow-up tasks or deferred ideas come up, add them there. When roadmap items are completed, either remove them or strike them through so the file stays useful instead of becoming historical clutter.

## Design principles

Follow the spirit of *A Philosophy of Software Design*: reduce complexity with simple, deep, well-isolated abstractions.

- Prefer deep modules: simple, stable interfaces that hide meaningful complexity, implementation details, special cases, and policy decisions.
- Do not split code just to make files or functions smaller. Introduce an abstraction only when it reduces real complexity or matches an established pattern in this codebase.
- Optimize for long-term simplicity over short-term patch speed.
- When fixing a bug, look for the design issue that allowed it. Prefer removing the source of complexity, narrowing states, validating earlier, or making invalid states unrepresentable over adding another conditional.
- Avoid tactical changes that satisfy the immediate request while making nearby code harder to reason about.
- Keep interfaces general enough to support nearby use cases, but do not build speculative frameworks.
- Make the main path obvious. Follow existing naming, layout, error handling, and abstraction patterns unless there is a clear reason to change them.
- Treat comments as part of the design: explain intent, invariants, non-obvious tradeoffs, and abstraction boundaries, not line-by-line mechanics.
- Refactor continuously when complexity accumulates near the code being changed.

## Reviewing changes

Use this stance for pending work, local diffs, existing code, and pull requests. Apply the working and design principles above; this section only adds the review-specific posture.

- Think hard and review carefully. Assume the code will need to stay understandable and maintainable for a long time.
- Lead with findings. Prioritize bugs, behavior regressions, missing tests, confusing abstractions, and violations of the learning-system design. Cite specific files and lines; keep summaries brief.
- Review correctness against the documented mastery, level progression, review-level, mode, distractor, snap-grid, and UI contracts.
- Review design fit when screens change: the UI should keep the existing visual language, phone-first layout, safe-area behavior, and debug-only controls behind `?debug=1` / `#debug`.
- Do not request abstraction, deduplication, or cleanup unless it reduces real complexity or prevents a likely bug.
- If there are no findings, say so clearly and mention any remaining verification gaps or residual risks.

## Architecture

**Two-file split, deliberately.** All pure logic lives in `web/engine.js` and is attached to `window` so classic `<script>` tags pick it up. Both `index.html` (the app) and `tests.html` depend on it. If the UI ever moves off React, the engine and its tests come along unchanged. Keep new logic in `engine.js` if it can be tested without a DOM.

**Levels are data.** `LEVELS` in `engine.js` is the curriculum. Adding a level is one row. Each level has a stable string `key` (e.g. `lesen-volle`, `review-after-halbe`) — that key is what mastery and the current-level pointer are stored under in `localStorage`. Re-ordering the `LEVELS` array does not require a migration. Renaming a `key` does.

**Mode = `<prompt-modality>-<answer-modality>`.** `MODE_SPECS` in `engine.js` is the single source of truth: `lesen` / `stellen` / `wort-lesen` / `wort-stellen` / `digital-wort` / `wort-digital`, mapping over `clock` / `digital` / `word`. `index.html` reads `modeView(mode)` rather than hand-mapping mode → prompt/answer, and a structural test in `tests.html` makes "same modality on both sides" unreachable.

**Review levels** carry `review: true`, a `modes` array, and a `minuteSets` array. `makeQuestion` picks one mode per question and draws a minute from the union. The `digital-wort` / `wort-digital` modes are re-rolled when the minute is `0` (full hour) — `3:00 ↔ "drei Uhr"` is too trivial to grade. Reviews are not introduced for 24h tier (German clock-words don't distinguish AM/PM).

**Mastery storage versioning.** `loadMastery` chains migrations: v1 (numeric ids, pre-review) → v2 (numeric ids, post-review) → v3 (stable string keys, current). The `V2_TO_V3` table is **frozen** — do not edit it; future curriculum reorderings should not need another migration as long as the `key` strings stay stable. `resetMastery` clears `uhrzeit.mastery.v3` and `uhrzeit.level`.

**24h levels and AM/PM.** In `hour24` mode the clock face cannot disambiguate AM from PM, so `buildDigitalOptions` restricts distractors to the same half-day as the answer; questions only render PM (12..23) since the AM half is just 12h notation already covered by earlier levels.

**Distractors are crafted, not random.** `buildDigitalOptions` injects "minute-hand-as-hour" confusion, adjacent-hour confusion, and viertel nach/vor swap. `buildWordOptions` injects `nach` ↔ `vor` swaps, `halb X` ↔ `halb X+1`, `Viertel nach` ↔ `Viertel vor`. Random fillers only fill the remaining slots up to 4. When changing distractor logic, update the corresponding tests in `tests.html` that assert "4 unique options including the correct one" for every `(h, m)` in each minute set.

**Snap grid.** `minuteSnapGrid(level)` resolves the visual snap for the dragged minute hand (independent of which minutes the level scores). Review levels inherit the **finest-resolution** grid their union touches.

## Files worth knowing

- `web/index.html` — the app; ~1500 lines of inline JSX, themes, clock rendering, drag handlers. Frame-less; uses `dvh` + `env(safe-area-inset-*)` to fill a phone screen.
- `web/engine.js` — pure logic; the only file with unit tests behind it.
- `web/tests.html` — open in a browser to run tests. Self-contained.
- `web/preview.html` — dev-only; renders `index.html` inside a phone-frame mockup via `<iframe>`. The frame is not part of the shipped app.
- `web/manifest.webmanifest` — for "Add to Home Screen" on Android/iOS.
- `tools/build_icon.py` — composites a koralle clock face over `dandelion_single.png` and masks to the dandelion's alpha. Knobs (`R`, `ENAMEL`, color constants) at the top of the file.

## Conventions

- Work in red-green TDD for behavior changes: add a failing test in `web/tests.html` first, make it pass with the smallest change, then refactor. Run `tests.html` between steps or explain why it was not run.
- For UI changes, run the app in a browser and check the actual interaction or layout that changed.
- No build step; do not introduce one. JSX runs through `@babel/standalone` in the browser.
- Don't add npm/bundler/test-runner dependencies without an explicit ask.
- Pure logic goes in `engine.js` and is exported via `Object.assign(window, { ... })` at the bottom of the file.
- The debug strip is hidden behind `?debug=1` / `#debug` — keep new debug-only UI behind the same flag.
