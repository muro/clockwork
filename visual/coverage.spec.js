// @ts-check
const { test, expect } = require('@playwright/test');

// Whole-screen visual coverage across four dimensions — operation (the six core
// modes + the English AM/PM drill), precision (full / half / quarter / 5-min /
// per-minute / 24h), theme (light + dark), and language (de / en / sk).
//
// We deliberately do NOT take the full cross-product. Instead each scenario
// picks a *different* combination so that, across the whole set, every value of
// every dimension appears at least once — a small covering set rather than an
// exhaustive one. Coverage checklist:
//
//   operation : read→digital, set-hands, read→word, set-hands-from-word,
//               digital→word, read-24h→digital, word→digital, AM/PM   (all 8)
//   precision : volle, minute, halbe, viertel(×2), fuenf(×2), 24h      (all 6)
//   theme     : light (koralle), dark (abend)                         (both)
//   language  : de, en, sk                                            (all 3)
//
// Determinism: the app draws a random question on load, so every scenario
// replaces Math.random before navigation with a *seeded PRNG* (mulberry32).
// Unlike a constant, a varied-but-reproducible stream lets the distractor
// generators fill a realistic set of option buttons — a constant collapses
// them to 2–3 identical fillers, which wouldn't represent the real 4-option
// grid. Same seed + same code path ⇒ identical render every run. Set-hands
// modes always start the interactive clock at 12:00 regardless.
const scenarios = [
  { id: 'read-digital--volle--de--light',           lang: 'de', level: 'lesen-volle',           theme: 'koralle', op: 'read clock → pick digital' },
  { id: 'set-hands--minute--en--dark',              lang: 'en', level: 'stellen-minute',        theme: 'abend',   op: 'set the clock hands' },
  { id: 'read-word--halbe--sk--light',              lang: 'sk', level: 'wort-lesen-halbe',      theme: 'koralle', op: 'read clock → pick phrase' },
  { id: 'set-hands-from-word--viertel--de--dark',   lang: 'de', level: 'wort-stellen-viertel',  theme: 'abend',   op: 'read phrase → set hands' },
  { id: 'digital-to-word--fuenf--de--light',        lang: 'de', level: 'digital-wort-fuenf',    theme: 'koralle', op: 'read digital → pick phrase' },
  { id: 'read-digital--24h--en--dark',              lang: 'en', level: 'lesen-fuenf-24h',       theme: 'abend',   op: 'read 24h clock → pick digital' },
  { id: 'word-to-digital--viertel--sk--dark',       lang: 'sk', level: 'wort-digital-viertel',  theme: 'abend',   op: 'read phrase → pick digital' },
  { id: 'ampm-buttons--fuenf--en--light',           lang: 'en', level: 'en-digital24-ampm',     theme: 'koralle', op: 'read 24h → pick AM/PM' },
];

test.describe('operation × precision × theme × language coverage', () => {
  for (const s of scenarios) {
    test(`${s.op}  ·  ${s.id}`, async ({ page }) => {
      await page.addInitScript((sc) => {
        // Seeded PRNG (mulberry32) — deterministic but varied, so option grids
        // render their full set. Re-seeded identically on every page load.
        let a = 0x9e3779b9;
        Math.random = () => {
          a = (a + 0x6d2b79f5) | 0;
          let t = Math.imul(a ^ (a >>> 15), 1 | a);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        // Freeze the wall clock. The header's NowLogo is a live analog clock of
        // the *current* time, so its hands drift between baseline capture and
        // later runs. The logo is small and faint enough that on its own the
        // drift stays under maxDiffPixels, but it's still time-varying noise that
        // eats into that budget and erodes sensitivity to real regressions —
        // pinning it reclaims the full budget. Only the no-arg `new Date()` (and
        // Date.now) are pinned; real Date math and the timers React relies on
        // stay untouched.
        const RealDate = Date;
        const fixed = new RealDate(2024, 0, 1, 10, 8, 30).getTime();
        window.Date = class extends RealDate {
          constructor(...args) { args.length ? super(...args) : super(fixed); }
          static now() { return fixed; }
        };
        // Drop the app straight into the target language / level / theme.
        localStorage.setItem('uhrzeit.language', sc.lang);
        localStorage.setItem('uhrzeit.level.' + sc.lang, sc.level);
        localStorage.setItem('uhrzeit.theme', sc.theme);
      }, s);

      await page.goto('/index.html');
      // The "Level NN / MM" header is present on every screen once mounted —
      // works for the no-clock modes (word/AM/PM) where getByTestId('clock')
      // wouldn't exist.
      await expect(page.getByText(/Level \d+ \/ \d+/)).toBeVisible();
      await page.evaluate(() => document.fonts.ready);

      await expect(page).toHaveScreenshot(`${s.id}.png`);
    });
  }
});
