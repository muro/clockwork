# Uhrzeit Lernen

A small, zero-install German clock-reading game with a progressive curriculum
from full hours through finer-grained clock reading, growing a dandelion on
each level you master. Each learning level focuses on the *new* minute
positions for its tier; review levels mix the available modes across
everything learned so far. Two color themes (Koralle / Abend) with an Auto
swatch that follows `prefers-color-scheme`.

## Run it

Open `web/index.html` in any modern browser. That's the whole app.

If you want to serve it locally (recommended on iOS, where some browsers are
picky about `file://`):

```sh
python3 -m http.server 8765 --directory web
# then open http://localhost:8765/index.html
```

State (current level + mastery per level) is kept in `localStorage`. The
reset control clears it with a two-step confirmation: the first tap arms the
reset, and a second tap within a short confirmation window commits it.

## Files

All runtime files live in `web/`. The repo root holds meta files
(`README.md`, `LICENSE`, `.claude/`) and `tools/` for one-off generators.

| File | What it is |
| --- | --- |
| `web/index.html` | The app. Loads React + Babel standalone from CDN and runs JSX inline. |
| `web/engine.js` | Pure logic — `parseTime`, option builders, snap, mastery. No React, no DOM. Shared with `tests.html`. |
| `web/preview.html` | Development preview. Renders `index.html` inside a phone-frame mockup via `<iframe>`. The frame is not part of the app. |
| `web/tests.html` | In-browser unit tests. Open directly or via the static server. |
| `web/dandelion_*.png` | Bloom artwork used for level mastery and feedback overlays. |
| `web/icon.png` | 512×512 app icon — clock face overlaid on `dandelion_single.png`, masked to the flower silhouette. Generated; see [Icon](#icon). |
| `web/icon-192.png` | 192×192 derivative of `icon.png` for the Android manifest. Generated. |
| `web/manifest.webmanifest` | Web App Manifest. Lets the app be installed to the home screen on Android (Chrome) and provides metadata for iOS Safari "Add to Home Screen". |
| `tools/build_icon.py` | Regenerates `web/icon.png` and `web/icon-192.png`. See [Icon](#icon). |
| `.claude/launch.json` | Claude Code preview server config (serves from `web/` on :8765). |

## Icon

`web/icon.png` (512×512) and `web/icon-192.png` (a LANCZOS resize for the
Android manifest) are built, not hand-painted. To regenerate both:

```sh
pip3 install Pillow
python3 tools/build_icon.py
```

The script composites a koralle-themed clock face (semi-transparent enamel,
ink-coloured numerals/ticks/hour-hand, accent-orange minute hand, the same
Spitz pointer shape as `drawSpitz()` in `index.html`) over
`web/dandelion_single.png`, then takes the dandelion's alpha channel as the
final mask so the icon's silhouette is the flower's irregular petal edge.
Knobs at the top of the file: `R` for clock size, `ENAMEL` alpha for face
transparency, the colour constants for theme.

## Exercises

| Mode | Prompt | Answer |
| --- | --- | --- |
| `lesen` | Clock face | Tap the matching digital time |
| `stellen` | Digital time | Drag/tap the hands to match |
| `wort-lesen` | Clock face | Tap the matching German phrase |
| `wort-stellen` | German phrase | Drag/tap the hands to match |
| `digital-wort` | Digital time (no clock) | Tap the matching German phrase |
| `wort-digital` | German phrase (no clock) | Tap the matching digital time |

The two no-clock modes only appear from the half-hour tier onward —
3:00 ↔ "drei Uhr" is too obvious for a quiz — and not on 24h levels,
where German clock-words don't distinguish AM from PM.

A round is 10 questions. Scores at ≥8 / ≥9 / ≥10 earn a Spross / Blüte /
Löwenzahn for that level and persist across sessions.

**Review levels** sit between the learning blocks (after halbe, after
viertel, and after 5-Minuten). Each question in a review randomly picks
one of the available modes and draws a minute from the union of all sets so
far, so a review round really exercises everything. When the random
draw lands on the full hour with a `digital-wort` / `wort-digital` mode,
the mode is re-rolled — that combo is too trivial to grade. The track
marks review stops with a rosette medallion to distinguish them from
the growth icons.

## Tests

```sh
# after starting the server above
open http://localhost:8765/tests.html
```

The file is self-contained: a tiny harness (`group`, `test`, `eq`, `ok`)
loads `engine.js` and asserts on the pure functions. Coverage:

- `parseTime` / `hourName` / `digitalFromQ` / `wordFromQ` for every
  (hour, minute) in the curriculum
- `snap5deg` / `snapHour` round-trip for the 5-minute grid and nearby drift
- `masteryTier` thresholds and `recordMastery` monotonicity (best and tier
  only go up)
- Exercise option builders return 4 unique options that
  include the correct answer, for every (hour, minute) in each minute set
- Level transitions — `LEVELS` covers the available modes; every level carries
  a unique stable `key`; `makeQuestion` produces an `(h, m, parsed, mode)`
  consistent with the level's minute set; reviews never pair the full
  hour with `digital-wort` / `wort-digital`
- `localStorage` — `saveMastery` / `loadMastery` round-trip; mastery is
  keyed by the level's stable string key (e.g. `lesen-volle`,
  `review-after-halbe`); `resetMastery` clears both `uhrzeit.mastery.v3`
  and `uhrzeit.level`; legacy `v1` (numeric, pre-review) and `v2`
  (numeric, post-review) data migrate into v3 stable keys on first load

The document title updates to `N ✓ / M ✗ — Uhrzeit Tests`, handy for a
headless CI check that greps `#summary`.

## Design notes

- **One artifact to ship.** `web/index.html` + `web/engine.js` = the whole
  app. No build step, no npm, no bundler. JSX runs through
  `@babel/standalone`. Trade-off: first paint is a couple of seconds on slow
  connections while Babel loads.
- **Engine is framework-agnostic.** All pure logic lives in `engine.js`,
  attached to `window`. `index.html` and `tests.html` both depend on it.
  If the UI ever moves off React, the engine and its tests come along
  unchanged.
- **Levels are data.** Adding a new level is one row in the `LEVELS` array
  in `engine.js`.
- **Frame is dev-only.** `preview.html` is the only thing that knows about
  the Claude-Design phone-frame mockup. The shipped app has no frame, uses
  `dvh` + `env(safe-area-inset-*)` so it fills a real phone screen.
