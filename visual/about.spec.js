// @ts-check
const { test, expect } = require('@playwright/test');
const { pinRuntime } = require('./fixtures');

// The in-app About / Support sheet, opened from the header logo, guarded in
// both themes (the card, accent button, and dandelion watermark differ between
// light and dark).
const themes = [
  { id: 'about-sheet--light', theme: 'koralle' },
  { id: 'about-sheet--dark',  theme: 'abend' },
];

for (const t of themes) {
  test(`about sheet · ${t.theme}`, async ({ page }) => {
    await page.addInitScript(pinRuntime, { lang: 'de', theme: t.theme });
    await page.goto('/index.html');

    await page.getByRole('button', { name: 'About & support' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);

    await expect(page).toHaveScreenshot(`${t.id}.png`);
  });
}
