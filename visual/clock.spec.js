// @ts-check
const { test, expect } = require('@playwright/test');

// Visual-regression smoke test for the clock rendering.
//
// The app draws a *random* question on load, which would make any screenshot
// unstable. `makeQuestion(level, Math.random, …)` in engine.js is the only
// source of that randomness, so we pin Math.random before any page script
// runs. A constant 0.2 makes the first (default) level — "Volle Stunden",
// read-the-clock — resolve to 3:00:
//
//   h = 1 + floor(0.2 * 12) = 3
//   m = minuteSet[floor(0.2 * 1)] = 0
//
// The same constant also fixes every downstream draw (option order, the
// internal clock gradient id), so the whole page renders identically run to
// run. A fresh browser context has empty localStorage, so the app always
// starts at level 0 in German.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.2;
  });
});

async function gotoStableApp(page) {
  await page.goto('/index.html');
  // The JSX is transformed by Babel at runtime, so wait for the app to mount.
  await expect(page.getByTestId('clock')).toBeVisible();
  // Web fonts fall back to system fonts (no CDN), but await layout settling.
  await page.evaluate(() => document.fonts.ready);
}

// Focused geometry check: just the clock face, isolated from surrounding
// chrome. Whole-screen coverage (operations, themes, languages) lives in
// coverage.spec.js; this one guards the clock rendering specifically.
test('clock face renders 3:00 on the first level', async ({ page }) => {
  await gotoStableApp(page);

  // Sanity-check the determinism seed actually produced 3:00 before we trust
  // the pixels — if this drifts, the baseline below is meaningless. The correct
  // answer is one of the option buttons, so its presence ties this to the time
  // (the prompt text alone would pass for any hour).
  await expect(page.getByRole('button', { name: '3:00', exact: true })).toBeVisible();

  await expect(page.getByTestId('clock')).toHaveScreenshot('clock-3-00.png');
});
