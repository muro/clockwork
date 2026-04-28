// engine.js — pure clock-learning logic (no React, no DOM).
// Shared by index.html (the app) and tests.html (unit tests).
// All exports are attached to `window` so classic <script> tags can pick them up.

const HOUR_NAMES = ["zwölf","eins","zwei","drei","vier","fünf","sechs","sieben","acht","neun","zehn","elf","zwölf"];
function hourName(h) { return HOUR_NAMES[h % 12 === 0 ? 12 : h % 12]; }

function parseTime(h, m) {
  const next = (h % 12) + 1;
  switch (m) {
    case 0:  return { minute: null, hour: h, next, full: `${h} Uhr`, fullWord: `${hourName(h)} Uhr` };
    case 5:  return { minute: "5 nach", hour: h, next, full: `5 nach ${h}`, fullWord: `fünf nach ${hourName(h)}` };
    case 10: return { minute: "10 nach", hour: h, next, full: `10 nach ${h}`, fullWord: `zehn nach ${hourName(h)}` };
    case 15: return { minute: "Viertel nach", hour: h, next, full: `Viertel nach ${h}`, fullWord: `Viertel nach ${hourName(h)}` };
    case 20: return { minute: "20 nach", hour: h, next, full: `20 nach ${h}`, fullWord: `zwanzig nach ${hourName(h)}` };
    case 25: return { minute: "5 vor halb", hour: next, next, full: `5 vor halb ${next}`, fullWord: `fünf vor halb ${hourName(next)}` };
    case 30: return { minute: "halb", hour: next, next, full: `halb ${next}`, fullWord: `halb ${hourName(next)}` };
    case 35: return { minute: "5 nach halb", hour: next, next, full: `5 nach halb ${next}`, fullWord: `fünf nach halb ${hourName(next)}` };
    case 40: return { minute: "20 vor", hour: next, next, full: `20 vor ${next}`, fullWord: `zwanzig vor ${hourName(next)}` };
    case 45: return { minute: "Viertel vor", hour: next, next, full: `Viertel vor ${next}`, fullWord: `Viertel vor ${hourName(next)}` };
    case 50: return { minute: "10 vor", hour: next, next, full: `10 vor ${next}`, fullWord: `zehn vor ${hourName(next)}` };
    case 55: return { minute: "5 vor", hour: next, next, full: `5 vor ${next}`, fullWord: `fünf vor ${hourName(next)}` };
  }
  // Minute-precision fallback: no standard nach/vor wording exists, so
  // full/fullWord fall back to the digital form. Used by the 1-minute levels,
  // where the exercises are lesen/stellen only (no wort-* modes).
  const digital = `${h}:${String(m).padStart(2, "0")}`;
  return { minute: null, hour: h, next, full: digital, fullWord: digital };
}
function digitalStr(h, m) { return `${h}:${String(m).padStart(2, "0")}`; }
function digitalFromQ(q) { const hh = q.dh ?? q.h; return `${hh}:${String(q.m).padStart(2, "0")}`; }
function wordFromQ(q) { return q.parsed.fullWord; }

// Each entry holds only the *new* minutes introduced at that learning level.
// Review levels union several sets to sweep the cumulative skill.
const MINUTE_SETS = {
  volle:   [0],
  halbe:   [30],
  viertel: [15, 45],
  fuenf:   [5, 10, 20, 25, 35, 40, 50, 55],
  minute:  Array.from({ length: 60 }, (_, i) => i).filter(m => m % 5 !== 0),
};

// Resolve a level's effective minute pool. A normal level carries a single
// minuteSet; a review level carries a minuteSets array and we union the
// corresponding pools. Sorted ascending for deterministic test output.
function effectiveMinutes(level) {
  const keys = level.minuteSets || [level.minuteSet];
  const set = new Set();
  for (const k of keys) for (const m of (MINUTE_SETS[k] || [])) set.add(m);
  return [...set].sort((a, b) => a - b);
}

// Resolve the mode for a question. Normal levels have a scalar .mode; review
// levels have a .modes array and pick one per question.
function pickMode(level, rand = Math.random) {
  if (level.modes && level.modes.length) {
    return level.modes[Math.floor(rand() * level.modes.length)];
  }
  return level.mode;
}

// MODE_SPECS is the single source of truth for what each mode shows on
// either side. Mode names read as "<prompt-modality>-<answer-modality>"
// (lesen/stellen are historical aliases for clock-↔-digital). Keeping the
// pair canonical here means the renderer in index.html never has to
// hand-map mode → prompt/answer, and a "same modality on both sides"
// test (in tests.html) makes the bug class structurally unreachable.
//
// Modalities: 'clock' | 'digital' | 'word'.
const MODE_SPECS = {
  'lesen':        { prompt: 'clock',   answer: 'digital' },
  'stellen':      { prompt: 'digital', answer: 'clock'   },
  'wort-lesen':   { prompt: 'clock',   answer: 'word'    },
  'wort-stellen': { prompt: 'word',    answer: 'clock'   },
  'digital-wort': { prompt: 'digital', answer: 'word'    },
  'wort-digital': { prompt: 'word',    answer: 'digital' },
};
const ALL_MODES = Object.keys(MODE_SPECS);

// Look up the canonical (prompt, answer, derived flags) for a mode.
// Returns null for unknown modes.
function modeView(mode) {
  const spec = MODE_SPECS[mode];
  if (!spec) return null;
  return {
    promptKind: spec.prompt,
    answerKind: spec.answer,
    showClock:  spec.prompt === 'clock' || spec.answer === 'clock',
    pickOption: spec.answer !== 'clock', // user taps an option vs sets the clock
  };
}

// Review levels (review: true) carry `modes` + `minuteSets` arrays; a random
// mode is picked per question and the minute is drawn from the union.

// Levels are ordered. The `key` is the stable storage id (mastery + current
// level pointer in localStorage); changing curriculum order in the future
// will not require another migration as long as the keys themselves don't
// change. digital↔word levels are not introduced for full hours (3:00 ↔
// "drei Uhr" is too obvious) and not for 24h (German clock-words don't
// distinguish AM/PM, so the answer would be ambiguous).
const LEVELS = [
  // Tier blocks all follow the same shape:
  //   lesen → wort-lesen → wort-stellen → stellen   (clock-using pair-of-pairs)
  //   digital-wort → wort-digital                   (no-clock translation drills)
  //   review                                         (covers everything so far)
  // Keeping wort-stellen and stellen adjacent matters: they're a pair that
  // varies only in the prompt's modality. The translation drills are a
  // distinct skill — they sit at the end of the block.
  { key: "lesen-volle",          mode: "lesen",        minuteSet: "volle",   hour24: false, title: "Volle Stunden",      sub: "Uhr ablesen · :00" },
  { key: "stellen-volle",        mode: "stellen",      minuteSet: "volle",   hour24: false, title: "Volle stellen",      sub: "Uhr stellen · :00" },
  { key: "lesen-halbe",          mode: "lesen",        minuteSet: "halbe",   hour24: false, title: "Halbe Stunden",      sub: "Uhr ablesen · :30" },
  { key: "wort-lesen-halbe",     mode: "wort-lesen",   minuteSet: "halbe",   hour24: false, title: "halb … auf Deutsch", sub: "Welcher Satz passt?" },
  { key: "wort-stellen-halbe",   mode: "wort-stellen", minuteSet: "halbe",   hour24: false, title: "halb … stellen",     sub: "Satz zur Uhr" },
  { key: "stellen-halbe",        mode: "stellen",      minuteSet: "halbe",   hour24: false, title: "Halbe stellen",      sub: "Uhr stellen · :30" },
  { key: "wort-digital-halbe",   mode: "wort-digital", minuteSet: "halbe",   hour24: false, title: "halbe · Zeit finden", sub: 'Wie spät ist „halb vier"?' },
  { key: "digital-wort-halbe",   mode: "digital-wort", minuteSet: "halbe",   hour24: false, title: "halbe · Wort finden", sub: "Wie heißt 3:30?" },
  { key: "review-after-halbe",   review: true, modes: ALL_MODES, minuteSets: ["volle", "halbe"],
    hour24: false, title: "Wiederholung · bis halbe", sub: "Alles Gelernte gemischt" },
  { key: "lesen-viertel",        mode: "lesen",        minuteSet: "viertel", hour24: false, title: "Viertelstunden",     sub: "Uhr ablesen · :15, :45" },
  { key: "wort-lesen-viertel",   mode: "wort-lesen",   minuteSet: "viertel", hour24: false, title: "Viertel · Wörter",   sub: "Welcher Satz passt?" },
  { key: "wort-stellen-viertel", mode: "wort-stellen", minuteSet: "viertel", hour24: false, title: "Viertel · stellen",  sub: "Satz zur Uhr" },
  { key: "stellen-viertel",      mode: "stellen",      minuteSet: "viertel", hour24: false, title: "Viertel stellen",    sub: "Uhr stellen · :15, :45" },
  { key: "wort-digital-viertel", mode: "wort-digital", minuteSet: "viertel", hour24: false, title: "Viertel · Zeit finden", sub: 'Wie spät ist „Viertel vor sieben"?' },
  { key: "digital-wort-viertel", mode: "digital-wort", minuteSet: "viertel", hour24: false, title: "Viertel · Wort finden", sub: "Wie heißt 6:45?" },
  { key: "review-after-viertel", review: true, modes: ALL_MODES, minuteSets: ["volle", "halbe", "viertel"],
    hour24: false, title: "Wiederholung · bis Viertel", sub: "Alles Gelernte gemischt" },
  { key: "lesen-fuenf",          mode: "lesen",        minuteSet: "fuenf",   hour24: false, title: "5-Minuten",          sub: "Uhr ablesen · alle 5" },
  { key: "wort-lesen-fuenf",     mode: "wort-lesen",   minuteSet: "fuenf",   hour24: false, title: "5-Min. · Wörter",    sub: "Welcher Satz passt?" },
  { key: "wort-stellen-fuenf",   mode: "wort-stellen", minuteSet: "fuenf",   hour24: false, title: "5-Min. · stellen",   sub: "Satz zur Uhr" },
  { key: "stellen-fuenf",        mode: "stellen",      minuteSet: "fuenf",   hour24: false, title: "5-Min. stellen",     sub: "Uhr stellen · alle 5" },
  { key: "wort-digital-fuenf",   mode: "wort-digital", minuteSet: "fuenf",   hour24: false, title: "5-Min. · Zeit finden", sub: 'Wie spät ist „fünf vor halb fünf"?' },
  { key: "digital-wort-fuenf",   mode: "digital-wort", minuteSet: "fuenf",   hour24: false, title: "5-Min. · Wort finden", sub: "Wie heißt 4:25?" },
  { key: "review-after-fuenf",   review: true, modes: ALL_MODES, minuteSets: ["volle", "halbe", "viertel", "fuenf"],
    hour24: false, title: "Wiederholung · bis 5-Min.", sub: "Alles Gelernte gemischt" },
  { key: "lesen-fuenf-24h",      mode: "lesen",        minuteSet: "fuenf",   hour24: true,  title: "24 Stunden",         sub: "Uhr ablesen · 24h" },
  { key: "stellen-fuenf-24h",    mode: "stellen",      minuteSet: "fuenf",   hour24: true,  title: "24h stellen",        sub: "Uhr stellen · 24h" },
  { key: "lesen-minute",         mode: "lesen",        minuteSet: "minute",  hour24: false, title: "Minutengenau",       sub: "Uhr ablesen · jede Minute" },
  { key: "stellen-minute",       mode: "stellen",      minuteSet: "minute",  hour24: false, title: "Minutengenau stellen", sub: "Uhr stellen · jede Minute" },
];

function pickRandom(a){ return a[Math.floor(Math.random()*a.length)]; }
function shuffle(a){ a = a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

function buildDigitalOptions(q, level) {
  const correct = digitalFromQ(q);
  const opts = new Set([correct]);
  const mins = effectiveMinutes(level);

  if (level.hour24) {
    // In 24h mode, the clock face can't distinguish AM from PM — so a
    // question with correct "18:40" must never offer "6:40" as an option,
    // since both are valid readings of the same face. Restrict the whole
    // pool of distractors to the same half-day as the answer.
    const pmHalf = q.dh >= 12;
    const hoursPool = pmHalf
      ? [12,13,14,15,16,17,18,19,20,21,22,23]
      : [0,1,2,3,4,5,6,7,8,9,10,11];
    // Adjacent-hour confusion, wrapping within the half.
    const lastOfHalf = pmHalf ? 23 : 11;
    const firstOfHalf = pmHalf ? 12 : 0;
    const nextH = q.dh === lastOfHalf ? firstOfHalf : q.dh + 1;
    opts.add(`${nextH}:${String(q.m).padStart(2,'0')}`);
    // Minute-hand hour confusion (5-min multiples only), mapped into the
    // correct half-day.
    const mh12 = q.m === 0 ? 12 : q.m / 5;
    if (Number.isInteger(mh12)) {
      const mh = pmHalf ? (mh12 === 12 ? 12 : mh12 + 12) : (mh12 === 12 ? 0 : mh12);
      if (mh !== q.dh) opts.add(`${mh}:${String(q.m).padStart(2,'0')}`);
    }
    let guard = 0;
    while (opts.size < 4 && guard++ < 60) {
      const rh = pickRandom(hoursPool);
      const rm = pickRandom(mins);
      opts.add(`${rh}:${String(rm).padStart(2,'0')}`);
    }
    return { options: shuffle([...opts].slice(0, 4)) };
  }

  // 12h mode — hours 1..12 only.
  const hoursPool = [1,2,3,4,5,6,7,8,9,10,11,12];
  // "minute-hand hour" confusion: if minute-hand points at the 3, swap with
  // hour=3. Only makes sense for 5-minute multiples; skip for arbitrary minutes.
  const mh = q.m === 0 ? 12 : q.m / 5;
  if (Number.isInteger(mh) && mh !== q.h) opts.add(digitalStr(mh, q.m));
  if (q.m === 15) opts.add(digitalStr(q.h, 45));
  if (q.m === 45) opts.add(digitalStr(q.h, 15));
  opts.add(digitalStr((q.h % 12) + 1, q.m));
  let guard = 0;
  while (opts.size < 4 && guard++ < 60) {
    const rh = pickRandom(hoursPool);
    const rm = pickRandom(mins);
    opts.add(`${rh}:${String(rm).padStart(2,'0')}`);
  }
  return { options: shuffle([...opts].slice(0, 4)) };
}

function buildWordOptions(q, level) {
  const correct = wordFromQ(q);
  const opts = new Set([correct]);
  const { h, m, parsed } = q;
  const next = parsed.next;
  // 1) "Viertel nach" ↔ "Viertel vor" (same hour confusion)
  if (parsed.minute === "Viertel nach") {
    opts.add(parseTime(next, 45).fullWord);
  } else if (parsed.minute === "Viertel vor") {
    opts.add(parseTime(h === 1 ? 12 : h - 1, 15).fullWord);
  }
  // 2) "halb X" ↔ "halb X+1", and "halb h" (current hour instead of next)
  if (parsed.minute === "halb") {
    const wrongNext = next === 12 ? 1 : next + 1;
    opts.add(parseTime(wrongNext === 1 ? 12 : wrongNext - 1, 30).fullWord);
    opts.add(parseTime(h === 1 ? 12 : h - 1, 30).fullWord);
  }
  // 3) nach vs vor swap on same absolute minute
  if (m === 5 || m === 10 || m === 20) {
    const swap = { 5: parseTime(next, 55), 10: parseTime(next, 50), 20: parseTime(next, 40) };
    opts.add(swap[m].fullWord);
  }
  if (m === 50 || m === 55 || m === 40) {
    const swap = { 55: parseTime(h, 5), 50: parseTime(h, 10), 40: parseTime(h, 20) };
    opts.add(swap[m].fullWord);
  }
  // 4) "5 vor halb" ↔ "5 nach halb"
  if (parsed.minute === "5 vor halb") opts.add(parseTime(next, 35).fullWord);
  if (parsed.minute === "5 nach halb") opts.add(parseTime(next, 25).fullWord);

  const mins = effectiveMinutes(level).filter(x => x !== 0);
  let guard = 0;
  while (opts.size < 4 && guard++ < 60) {
    const rh = 1 + Math.floor(Math.random()*12);
    const rm = pickRandom(mins.length ? mins : [0]);
    opts.add(parseTime(rh, rm).fullWord);
  }
  return { options: shuffle([...opts].slice(0, 4)) };
}

function snap5deg(ang){
  const minutes = Math.round(ang / 6);
  return ((minutes % 60) + 60) % 60;
}
function snapHour(ang){
  const h = Math.round(ang / 30);
  return ((h % 12) + 12) % 12 || 12;
}
// Snap an angle to the nearest minute value the grid allows (circular).
// A drag that lands slightly before 12 snaps to 0 rather than the far side
// of the dial.
function snapToAllowedMinutes(ang, allowedMinutes) {
  const raw = ((Math.round(ang / 6) % 60) + 60) % 60;
  let best = allowedMinutes[0];
  let bestDist = Math.min(Math.abs(raw - best), 60 - Math.abs(raw - best));
  for (const m of allowedMinutes) {
    const d = Math.min(Math.abs(raw - m), 60 - Math.abs(raw - m));
    if (d < bestDist) { best = m; bestDist = d; }
  }
  return best;
}

// Snap grid for the minute hand — visual snapping, independent of which
// minute-set the level scores as correct. For the broad time categories
// (full/half/quarter hours), the hand always rests on 12/3/6/9, even if
// the exercise only accepts 12 or 6. For 5-minute precision, any 5-min
// mark. Returning null means "don't snap" (free minute resolution).
const QUARTER_GRID = [0, 15, 30, 45];
const FUENF_GRID   = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
function minuteSnapGrid(level) {
  // Review levels inherit the finest-resolution grid their union touches, so
  // the hand can land on any minute the review might ask about.
  const keys = level.minuteSets || [level.minuteSet];
  if (keys.includes('minute')) return null;
  if (keys.includes('fuenf'))  return FUENF_GRID;
  if (keys.includes('volle') || keys.includes('halbe') || keys.includes('viertel')) {
    return QUARTER_GRID;
  }
  return null;
}

// Build a question for a level — used by the game hook and tests.
function makeQuestion(level, rand = Math.random) {
  const h = 1 + Math.floor(rand()*12);
  const mins = effectiveMinutes(level);
  const m = mins[Math.floor(rand()*mins.length)];
  let dh = h;
  if (level.hour24) {
    // 24h levels always render as PM (12..23) — the AM half is just 12h
    // notation dressed up, which earlier levels already cover. Training
    // only PM here keeps every question in the "new" half-day.
    dh = h === 12 ? 12 : h + 12;
  }
  let mode = pickMode(level, rand);
  // Reviews mix all modes × all minute pools. The digital↔word direction on
  // the full hour ("3:00 ↔ drei Uhr") is too obvious — re-roll the mode in
  // that combo. Cap the retries so a review whose modes are *only* digital↔word
  // can't loop forever; the trivial mode is still a legal fallback.
  if (level.review && m === 0) {
    for (let i = 0; i < 8 && (mode === 'digital-wort' || mode === 'wort-digital'); i++) {
      mode = pickMode(level, rand);
    }
  }
  return { h, m, dh, mode, parsed: parseTime(h, m) };
}

// ============================================================
// MASTERY / localStorage (framework-agnostic)
// ============================================================
const MASTERY_KEY    = "uhrzeit.mastery.v3";
const MASTERY_KEY_V2 = "uhrzeit.mastery.v2";
const MASTERY_KEY_V1 = "uhrzeit.mastery.v1";
const LEVEL_KEY      = "uhrzeit.level";

// v1 → v2: review levels were inserted into the curriculum at numeric ids
// 10 (between viertel/stellen and the fuenf block) and 15 (between
// fuenf/stellen and 24h). Shift legacy ids accordingly.
function migrateV1Id(oldId) {
  const i = parseInt(oldId, 10);
  if (!Number.isInteger(i)) return null;
  if (i < 10) return i;
  if (i < 14) return i + 1;
  if (i < 18) return i + 2;
  return null;
}

// v2 → v3: numeric ids became stable string keys, and several digital↔word
// levels plus a third review were inserted. This frozen table maps every v2
// id (0..19) to its v3 key, so future curriculum reorderings need no
// further migration as long as the keys themselves don't change.
const V2_TO_V3 = {
  0:  "lesen-volle",
  1:  "stellen-volle",
  2:  "lesen-halbe",
  3:  "wort-lesen-halbe",
  4:  "wort-stellen-halbe",
  5:  "stellen-halbe",
  6:  "lesen-viertel",
  7:  "wort-lesen-viertel",
  8:  "wort-stellen-viertel",
  9:  "stellen-viertel",
  10: "review-after-viertel",
  11: "lesen-fuenf",
  12: "wort-lesen-fuenf",
  13: "wort-stellen-fuenf",
  14: "stellen-fuenf",
  15: "review-after-fuenf",
  16: "lesen-fuenf-24h",
  17: "stellen-fuenf-24h",
  18: "lesen-minute",
  19: "stellen-minute",
};

function migrateV2ToV3(v2Mastery) {
  const out = {};
  for (const [k, v] of Object.entries(v2Mastery || {})) {
    const newKey = V2_TO_V3[String(k)];
    if (newKey) out[newKey] = v;
  }
  return out;
}

// Storage value for LEVEL_KEY used to be a numeric index ("0".."19"); it
// now stores the level's stable key. Translate any leftover numeric value
// at read time.
function levelKeyFromStored(stored) {
  if (!stored) return null;
  if (/^\d+$/.test(stored)) return V2_TO_V3[stored] || null;
  return LEVELS.some(L => L.key === stored) ? stored : null;
}

function loadMastery() {
  try {
    const v3 = localStorage.getItem(MASTERY_KEY);
    if (v3) return JSON.parse(v3);

    // No v3 yet — chain through any earlier formats so returning users
    // keep their progress.
    const v2Raw = localStorage.getItem(MASTERY_KEY_V2);
    if (v2Raw) {
      const migrated = migrateV2ToV3(JSON.parse(v2Raw));
      localStorage.setItem(MASTERY_KEY, JSON.stringify(migrated));
      localStorage.removeItem(MASTERY_KEY_V2);
      return migrated;
    }

    const v1Raw = localStorage.getItem(MASTERY_KEY_V1);
    if (v1Raw) {
      const v1Data = JSON.parse(v1Raw);
      const v2Data = {};
      for (const [k, v] of Object.entries(v1Data)) {
        const newId = migrateV1Id(k);
        if (newId !== null) v2Data[newId] = v;
      }
      const migrated = migrateV2ToV3(v2Data);
      localStorage.setItem(MASTERY_KEY, JSON.stringify(migrated));
      localStorage.removeItem(MASTERY_KEY_V1);
      return migrated;
    }

    return {};
  } catch { return {}; }
}
function saveMastery(m) { try { localStorage.setItem(MASTERY_KEY, JSON.stringify(m)); } catch {} }
function masteryTier(correct) {
  if (correct >= 10) return 3;
  if (correct >= 9)  return 2;
  if (correct >= 8)  return 1;
  return 0;
}
function recordMastery(prev, levelKey, correct) {
  const tier = masteryTier(correct);
  const prevBest = prev[levelKey]?.tier ?? 0;
  return { ...prev, [levelKey]: {
    tier: Math.max(prevBest, tier),
    best: Math.max(prev[levelKey]?.best ?? 0, correct),
    last: correct,
  }};
}
function resetMastery() {
  try {
    localStorage.removeItem(MASTERY_KEY);
    localStorage.removeItem(LEVEL_KEY);
  } catch {}
}

Object.assign(window, {
  HOUR_NAMES, hourName, parseTime, digitalStr, digitalFromQ, wordFromQ,
  MINUTE_SETS, LEVELS, ALL_MODES, MODE_SPECS, modeView, pickRandom, shuffle,
  effectiveMinutes, pickMode,
  buildDigitalOptions, buildWordOptions,
  snap5deg, snapHour, snapToAllowedMinutes, minuteSnapGrid,
  QUARTER_GRID, FUENF_GRID,
  makeQuestion,
  MASTERY_KEY, MASTERY_KEY_V1, MASTERY_KEY_V2, LEVEL_KEY,
  migrateV1Id, migrateV2ToV3, V2_TO_V3, levelKeyFromStored,
  loadMastery, saveMastery, masteryTier, recordMastery, resetMastery,
});
