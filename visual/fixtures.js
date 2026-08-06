// @ts-check
// Browser-side runtime pinning shared by the whole-screen visual specs
// (coverage.spec.js, about.spec.js). Passed to page.addInitScript, so it is
// serialized into the page and MUST be self-contained — no references to
// anything outside its own body.
//
// It (1) replaces Math.random with a seeded PRNG so the question and its option
// grid render identically yet realistically, (2) freezes the wall clock so the
// header's live NowLogo doesn't drift and eat the pixel budget, and (3) drops
// the app straight into a target language / level / theme via localStorage.
function pinRuntime(opts) {
  // Seeded PRNG (mulberry32) — deterministic but varied.
  let a = 0x9e3779b9;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Freeze only the no-arg `new Date()` (and Date.now); real Date math and the
  // timers React relies on stay untouched.
  const RealDate = Date;
  const fixed = new RealDate(2024, 0, 1, 10, 8, 30).getTime();
  window.Date = class extends RealDate {
    constructor(...args) { args.length ? super(...args) : super(fixed); }
    static now() { return fixed; }
  };
  if (opts && opts.lang)  localStorage.setItem('uhrzeit.language', opts.lang);
  if (opts && opts.level) localStorage.setItem('uhrzeit.level.' + opts.lang, opts.level);
  if (opts && opts.theme) localStorage.setItem('uhrzeit.theme', opts.theme);
}

module.exports = { pinRuntime };
