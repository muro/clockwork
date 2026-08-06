// @ts-check
const { defineConfig } = require('@playwright/test');

// Optional visual-regression harness for the Uhrzeit Lernen app.
//
// This is deliberately NOT part of the app's zero-build workflow — the app
// still ships as plain files in web/. This config only exists so `npm run
// test:visual` can pixel-diff the rendered UI against committed baselines.
//
// Path B1: we drive the machine's installed Google Chrome (channel: 'chrome')
// instead of downloading Playwright's bundled Chromium, so no ~300 MB browser
// download is needed. The trade-off is that baseline PNGs are tied to this
// machine's Chrome rendering; if Chrome updates and nudges antialiasing,
// regenerate them with `npm run test:visual:update`.
module.exports = defineConfig({
  testDir: './visual',
  // Screenshots are compared against per-platform baselines committed next to
  // the spec (visual/<spec>-snapshots/). One worker keeps rendering stable.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: [['list']],

  expect: {
    toHaveScreenshot: {
      // Absolute (not ratio) budget: a ratio scales with image area, so on the
      // small isolated clock image 1% was ~500 px — enough for a whole hand to
      // move undetected. Baselines are same-machine/same-Chrome, so reruns are
      // pixel-identical; a small absolute budget absorbs only stray AA while
      // still catching any real change (a moved hand is hundreds of px).
      maxDiffPixels: 40,
      animations: 'disabled',
    },
  },

  use: {
    channel: 'chrome',
    baseURL: 'http://localhost:8765',
    // Fixed, phone-first viewport so the dvh/safe-area layout renders
    // identically every run. deviceScaleFactor 1 keeps the PNGs small and
    // antialiasing predictable.
    viewport: { width: 402, height: 840 },
    deviceScaleFactor: 1,
  },

  // Serve web/ exactly as the AGENTS.md dev command does. Reuse a server if
  // one is already running (e.g. the Claude Code preview on :8765).
  webServer: {
    command: 'python3 -m http.server 8765 --directory web',
    url: 'http://localhost:8765/index.html',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
