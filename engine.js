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

const MINUTE_SETS = {
  volle:   [0],
  halbe:   [0, 30],
  viertel: [0, 15, 30, 45],
  fuenf:   [0,5,10,15,20,25,30,35,40,45,50,55],
  minute:  Array.from({ length: 60 }, (_, i) => i),
};

// modes: lesen (clock→digital), stellen (digital→clock),
//        wort-lesen (clock→phrase), wort-stellen (phrase→clock)
const LEVELS = [
  { id: 0,  mode: "lesen",        minuteSet: "volle",   hour24: false, title: "Volle Stunden",      sub: "Uhr ablesen · :00" },
  { id: 1,  mode: "stellen",      minuteSet: "volle",   hour24: false, title: "Volle stellen",      sub: "Uhr stellen · :00" },
  { id: 2,  mode: "lesen",        minuteSet: "halbe",   hour24: false, title: "Halbe Stunden",      sub: "Uhr ablesen · :30" },
  { id: 3,  mode: "wort-lesen",   minuteSet: "halbe",   hour24: false, title: "halb … auf Deutsch", sub: "Welcher Satz passt?" },
  { id: 4,  mode: "wort-stellen", minuteSet: "halbe",   hour24: false, title: "halb … stellen",    sub: "Satz zur Uhr" },
  { id: 5,  mode: "stellen",      minuteSet: "halbe",   hour24: false, title: "Halbe stellen",      sub: "Uhr stellen · :30" },
  { id: 6,  mode: "lesen",        minuteSet: "viertel", hour24: false, title: "Viertelstunden",     sub: "Uhr ablesen · :15, :45" },
  { id: 7,  mode: "wort-lesen",   minuteSet: "viertel", hour24: false, title: "Viertel · Wörter",   sub: "Welcher Satz passt?" },
  { id: 8,  mode: "wort-stellen", minuteSet: "viertel", hour24: false, title: "Viertel · stellen",  sub: "Satz zur Uhr" },
  { id: 9,  mode: "stellen",      minuteSet: "viertel", hour24: false, title: "Viertel stellen",    sub: "Uhr stellen · :15, :45" },
  { id: 10, mode: "lesen",        minuteSet: "fuenf",   hour24: false, title: "5-Minuten",          sub: "Uhr ablesen · alle 5" },
  { id: 11, mode: "wort-lesen",   minuteSet: "fuenf",   hour24: false, title: "5-Min. · Wörter",    sub: "Welcher Satz passt?" },
  { id: 12, mode: "wort-stellen", minuteSet: "fuenf",   hour24: false, title: "5-Min. · stellen",   sub: "Satz zur Uhr" },
  { id: 13, mode: "stellen",      minuteSet: "fuenf",   hour24: false, title: "5-Min. stellen",     sub: "Uhr stellen · alle 5" },
  { id: 14, mode: "lesen",        minuteSet: "fuenf",   hour24: true,  title: "24 Stunden",         sub: "Uhr ablesen · 24h" },
  { id: 15, mode: "stellen",      minuteSet: "fuenf",   hour24: true,  title: "24h stellen",        sub: "Uhr stellen · 24h" },
  { id: 16, mode: "lesen",        minuteSet: "minute",  hour24: false, title: "Minutengenau",       sub: "Uhr ablesen · jede Minute" },
  { id: 17, mode: "stellen",      minuteSet: "minute",  hour24: false, title: "Minutengenau stellen", sub: "Uhr stellen · jede Minute" },
];

function pickRandom(a){ return a[Math.floor(Math.random()*a.length)]; }
function shuffle(a){ a = a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

function buildDigitalOptions(q, level) {
  const correct = digitalFromQ(q);
  const opts = new Set([correct]);
  const mins = MINUTE_SETS[level.minuteSet];

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

  const mins = MINUTE_SETS[level.minuteSet].filter(x => x !== 0);
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
  switch (level.minuteSet) {
    case 'volle':
    case 'halbe':
    case 'viertel': return QUARTER_GRID;
    case 'fuenf':   return FUENF_GRID;
    case 'minute':  return null;  // every minute — fall through to 6° rounding
    default:        return null;
  }
}

// Build a question for a level — used by the game hook and tests.
function makeQuestion(level, rand = Math.random) {
  const h = 1 + Math.floor(rand()*12);
  const mins = MINUTE_SETS[level.minuteSet];
  const m = mins[Math.floor(rand()*mins.length)];
  let dh = h;
  if (level.hour24) {
    // 24h levels always render as PM (12..23) — the AM half is just 12h
    // notation dressed up, which earlier levels already cover. Training
    // only PM here keeps every question in the "new" half-day.
    dh = h === 12 ? 12 : h + 12;
  }
  return { h, m, dh, parsed: parseTime(h, m) };
}

// ============================================================
// MASTERY / localStorage (framework-agnostic)
// ============================================================
const MASTERY_KEY = "uhrzeit.mastery.v1";
const LEVEL_KEY   = "uhrzeit.level";

function loadMastery() {
  try { const raw = localStorage.getItem(MASTERY_KEY); return raw ? JSON.parse(raw) : {}; }
  catch { return {}; }
}
function saveMastery(m) { try { localStorage.setItem(MASTERY_KEY, JSON.stringify(m)); } catch {} }
function masteryTier(correct) {
  if (correct >= 10) return 3;
  if (correct >= 9)  return 2;
  if (correct >= 8)  return 1;
  return 0;
}
function recordMastery(prev, levelId, correct) {
  const tier = masteryTier(correct);
  const prevBest = prev[levelId]?.tier ?? 0;
  return { ...prev, [levelId]: {
    tier: Math.max(prevBest, tier),
    best: Math.max(prev[levelId]?.best ?? 0, correct),
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
  MINUTE_SETS, LEVELS, pickRandom, shuffle,
  buildDigitalOptions, buildWordOptions,
  snap5deg, snapHour, snapToAllowedMinutes, minuteSnapGrid,
  QUARTER_GRID, FUENF_GRID,
  makeQuestion,
  MASTERY_KEY, LEVEL_KEY,
  loadMastery, saveMastery, masteryTier, recordMastery, resetMastery,
});
