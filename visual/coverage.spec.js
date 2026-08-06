// @ts-check
const { test, expect } = require('@playwright/test');
const { pinRuntime } = require('./fixtures');

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
// Determinism (seeded PRNG so option grids fill realistically, frozen wall
// clock so the header logo doesn't drift, and language/level/theme forced via
// localStorage) is handled by pinRuntime — see visual/fixtures.js.
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
      await page.addInitScript(pinRuntime, { lang: s.lang, level: s.level, theme: s.theme });

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
