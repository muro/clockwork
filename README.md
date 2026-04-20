# Uhrzeit Lernen

A small, zero-install German clock-reading game. Four exercise types across
a 16-level curriculum (volle → halbe → viertel → 5-Minuten → 24h), growing a
daffodil on each level you master.

## Run it

Open `index.html` in any modern browser. That's the whole app.

If you want to serve it locally (recommended on iOS, where some browsers are
picky about `file://`):

```sh
python3 -m http.server 8765
# then open http://localhost:8765/index.html
```

State (current level + mastery per level) is kept in `localStorage`. The
**Fortschritt zurücksetzen** button at the bottom of the app clears it; it
uses a two-step confirmation (first tap arms, second tap within 4 s commits).

## Files

| File | What it is |
| --- | --- |
| `index.html` | The app. Loads React + Babel standalone from CDN and runs JSX inline. |
| `engine.js` | Pure logic — `parseTime`, option builders, snap, mastery. No React, no DOM. Shared with `tests.html`. |
| `preview.html` | Development preview. Renders `index.html` inside a phone-frame mockup via `<iframe>`. The frame is not part of the app. |
| `tests.html` | 46 in-browser unit tests. Open directly or via the static server. |
| `.claude/launch.json` | Claude Code preview server config (`python3 -m http.server 8765`). |

## Exercises

| Mode | Prompt | Answer |
| --- | --- | --- |
| `lesen` | Clock face | Tap the matching digital time |
| `stellen` | Digital time | Drag/tap the hands to match |
| `wort-lesen` | Clock face | Tap the matching German phrase |
| `wort-stellen` | German phrase | Drag/tap the hands to match |

A round is 10 questions. Scores at ≥8 / ≥9 / ≥10 earn a sprout / bud /
daffodil for that level and persist across sessions.

## Tests

```sh
# after starting the server above
open http://localhost:8765/tests.html
```

The file is self-contained: a ~40-line harness (`group`, `test`, `eq`, `ok`)
loads `engine.js` and asserts on the pure functions. Coverage:

- `parseTime` / `hourName` / `digitalFromQ` / `wordFromQ` for every
  (hour, minute) in the curriculum
- `snap5deg` / `snapHour` round-trip for the 5-minute grid and nearby drift
- `masteryTier` thresholds and `recordMastery` monotonicity (best and tier
  only go up)
- All four exercise types — option builders return 4 unique options that
  include the correct answer, for every (hour, minute) in each minute set
- Level transitions — `LEVELS` covers all four modes; `makeQuestion`
  produces an `(h, m, parsed)` consistent with the level's minute set
- `localStorage` — `saveMastery` / `loadMastery` round-trip;
  `resetMastery` clears both `uhrzeit.mastery.v1` and `uhrzeit.level`;
  mastery is keyed independently per level

The document title updates to `N ✓ / M ✗ — Uhrzeit Tests`, handy for a
headless CI check that greps `#summary`.

## Design notes

- **One artifact to ship.** `index.html` + `engine.js` = the whole app. No
  build step, no npm, no bundler. JSX runs through `@babel/standalone`.
  Trade-off: first paint is a couple of seconds on slow connections while
  Babel loads.
- **Engine is framework-agnostic.** All pure logic lives in `engine.js`,
  attached to `window`. `index.html` and `tests.html` both depend on it.
  If the UI ever moves off React, the engine and its tests come along
  unchanged.
- **Levels are data.** Adding a new level is one row in the `LEVELS` array
  in `engine.js`.
- **Frame is dev-only.** `preview.html` is the only thing that knows about
  the Claude-Design phone-frame mockup. The shipped app has no frame, uses
  `dvh` + `env(safe-area-inset-*)` so it fills a real phone screen.
