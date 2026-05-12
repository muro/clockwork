// engine.js — pure clock-learning logic (no React, no DOM).
// Shared by index.html (the app) and tests.html (unit tests).
// All exports are attached to `window` so classic <script> tags can pick them up.

const DEFAULT_LANGUAGE = 'de';
const LANGUAGES = [
  { key: 'de', label: 'Deutsch', shortLabel: 'DE' },
  { key: 'en', label: 'English', shortLabel: 'EN' },
];
function normalizeLanguage(language) {
  return LANGUAGES.some(l => l.key === language) ? language : DEFAULT_LANGUAGE;
}

function pad2(n) { return String(n).padStart(2, "0"); }
function normalizeHour24(hour) { return ((hour % 24) + 24) % 24; }
function hour12From24(hour) {
  const h = normalizeHour24(hour) % 12;
  return h === 0 ? 12 : h;
}
function ampmPeriodFrom24(hour) {
  return normalizeHour24(hour) < 12 ? "a.m." : "p.m.";
}
function hour24FromQ(q) {
  if (Number.isInteger(q?.dh)) return normalizeHour24(q.dh);
  if (Number.isInteger(q?.h)) return normalizeHour24(q.h);
  return 0;
}
function ampmTimeFromParts(dh, m) {
  return `${hour12From24(dh)}:${pad2(m)} ${ampmPeriodFrom24(dh)}`;
}
function ampmTimeFromQ(q) {
  return ampmTimeFromParts(hour24FromQ(q), q.m);
}
function digital24FromParts(dh, m) {
  return `${pad2(normalizeHour24(dh))}:${pad2(m)}`;
}
function digital24FromQ(q) {
  return digital24FromParts(hour24FromQ(q), q.m);
}
function daypartKeyFrom24(dh, m) {
  const h = normalizeHour24(dh);
  if (h === 12 && m === 0) return "noon";
  if (h === 0 && m === 0) return "midnight";
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}
const DAYPART_PHRASES = {
  morning: "in the morning",
  afternoon: "in the afternoon",
  evening: "in the evening",
  night: "at night",
  noon: "at noon",
  midnight: "at midnight",
};
function daypartTimeFromParts(dh, m) {
  return `${hour12From24(dh)}:${pad2(m)} ${DAYPART_PHRASES[daypartKeyFrom24(dh, m)]}`;
}
function daypartTimeFromQ(q) {
  return daypartTimeFromParts(hour24FromQ(q), q.m);
}

const HOUR_NAMES = ["zwölf","eins","zwei","drei","vier","fünf","sechs","sieben","acht","neun","zehn","elf","zwölf"];
const EN_HOUR_NAMES = ["twelve","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve"];
function hourName(h, language = DEFAULT_LANGUAGE) {
  const names = normalizeLanguage(language) === 'en' ? EN_HOUR_NAMES : HOUR_NAMES;
  return names[h % 12 === 0 ? 12 : h % 12];
}

function parseGermanTime(h, m) {
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

const EN_MINUTE_WORDS = { 5: 'five', 10: 'ten', 20: 'twenty', 25: 'twenty-five' };
function parseEnglishTime(h, m) {
  const next = (h % 12) + 1;
  const hName = hourName(h, 'en');
  const nextName = hourName(next, 'en');
  switch (m) {
    case 0:  return { minute: null, hour: h, next, full: `${h} o'clock`, fullWord: `${hName} o'clock` };
    case 5:
    case 10:
    case 20:
    case 25: return { minute: `${EN_MINUTE_WORDS[m]} past`, hour: h, next, full: `${m} past ${h}`, fullWord: `${EN_MINUTE_WORDS[m]} past ${hName}` };
    case 15: return { minute: 'quarter past', hour: h, next, full: `quarter past ${h}`, fullWord: `quarter past ${hName}` };
    case 30: return { minute: 'half past', hour: h, next, full: `half past ${h}`, fullWord: `half past ${hName}` };
    case 35: return { minute: 'twenty-five to', hour: next, next, full: `25 to ${next}`, fullWord: `twenty-five to ${nextName}` };
    case 40: return { minute: 'twenty to', hour: next, next, full: `20 to ${next}`, fullWord: `twenty to ${nextName}` };
    case 45: return { minute: 'quarter to', hour: next, next, full: `quarter to ${next}`, fullWord: `quarter to ${nextName}` };
    case 50: return { minute: 'ten to', hour: next, next, full: `10 to ${next}`, fullWord: `ten to ${nextName}` };
    case 55: return { minute: 'five to', hour: next, next, full: `5 to ${next}`, fullWord: `five to ${nextName}` };
  }
  const digital = `${h}:${String(m).padStart(2, "0")}`;
  return { minute: null, hour: h, next, full: digital, fullWord: digital };
}

function parseTime(h, m, language = DEFAULT_LANGUAGE) {
  return normalizeLanguage(language) === 'en'
    ? parseEnglishTime(h, m)
    : parseGermanTime(h, m);
}
function digitalStr(h, m) { return `${h}:${String(m).padStart(2, "0")}`; }
function digitalFromQ(q) { const hh = q.dh ?? q.h; return `${hh}:${String(q.m).padStart(2, "0")}`; }
function wordFromQ(q, language = q.language || DEFAULT_LANGUAGE) {
  if (Number.isInteger(q?.h) && Number.isInteger(q?.m)) {
    return parseTime(q.h, q.m, language).fullWord;
  }
  return q.parsed.fullWord;
}
function textFromQ(q, kind, language = q.language || DEFAULT_LANGUAGE) {
  switch (kind) {
    case 'digital': return digitalFromQ(q);
    case 'word': return wordFromQ(q, language);
    case 'daypartTime': return daypartTimeFromQ(q);
    case 'ampmTime': return ampmTimeFromQ(q);
    case 'digital24': return digital24FromQ(q);
    default: return '';
  }
}

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
// Modalities: 'clock' | 'digital' | 'word' | 'daypartTime' | 'ampmTime' | 'digital24'.
const MODE_SPECS = {
  'lesen':        { prompt: 'clock',   answer: 'digital' },
  'stellen':      { prompt: 'digital', answer: 'clock'   },
  'wort-lesen':   { prompt: 'clock',   answer: 'word'    },
  'wort-stellen': { prompt: 'word',    answer: 'clock'   },
  'digital-wort': { prompt: 'digital', answer: 'word'    },
  'wort-digital': { prompt: 'word',    answer: 'digital' },
  'daypart-ampm': { prompt: 'daypartTime', answer: 'ampmTime'  },
  'ampm-daypart': { prompt: 'ampmTime',    answer: 'daypartTime' },
  'digital24-ampm': { prompt: 'digital24', answer: 'ampmTime' },
  'ampm-digital24': { prompt: 'ampmTime', answer: 'digital24' },
};
const CORE_MODES = ['lesen', 'stellen', 'wort-lesen', 'wort-stellen', 'digital-wort', 'wort-digital'];
const AMPM_MODES = ['daypart-ampm', 'ampm-daypart', 'digital24-ampm', 'ampm-digital24'];
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
  { key: "review-after-halbe",   review: true, modes: CORE_MODES, minuteSets: ["volle", "halbe"],
    hour24: false, title: "Wiederholung · bis halbe", sub: "Alles Gelernte gemischt" },
  { key: "lesen-viertel",        mode: "lesen",        minuteSet: "viertel", hour24: false, title: "Viertelstunden",     sub: "Uhr ablesen · :15, :45" },
  { key: "wort-lesen-viertel",   mode: "wort-lesen",   minuteSet: "viertel", hour24: false, title: "Viertel · Wörter",   sub: "Welcher Satz passt?" },
  { key: "wort-stellen-viertel", mode: "wort-stellen", minuteSet: "viertel", hour24: false, title: "Viertel · stellen",  sub: "Satz zur Uhr" },
  { key: "stellen-viertel",      mode: "stellen",      minuteSet: "viertel", hour24: false, title: "Viertel stellen",    sub: "Uhr stellen · :15, :45" },
  { key: "wort-digital-viertel", mode: "wort-digital", minuteSet: "viertel", hour24: false, title: "Viertel · Zeit finden", sub: 'Wie spät ist „Viertel vor sieben"?' },
  { key: "digital-wort-viertel", mode: "digital-wort", minuteSet: "viertel", hour24: false, title: "Viertel · Wort finden", sub: "Wie heißt 6:45?" },
  { key: "review-after-viertel", review: true, modes: CORE_MODES, minuteSets: ["volle", "halbe", "viertel"],
    hour24: false, title: "Wiederholung · bis Viertel", sub: "Alles Gelernte gemischt" },
  { key: "lesen-fuenf",          mode: "lesen",        minuteSet: "fuenf",   hour24: false, title: "5-Minuten",          sub: "Uhr ablesen · alle 5" },
  { key: "wort-lesen-fuenf",     mode: "wort-lesen",   minuteSet: "fuenf",   hour24: false, title: "5-Min. · Wörter",    sub: "Welcher Satz passt?" },
  { key: "wort-stellen-fuenf",   mode: "wort-stellen", minuteSet: "fuenf",   hour24: false, title: "5-Min. · stellen",   sub: "Satz zur Uhr" },
  { key: "stellen-fuenf",        mode: "stellen",      minuteSet: "fuenf",   hour24: false, title: "5-Min. stellen",     sub: "Uhr stellen · alle 5" },
  { key: "wort-digital-fuenf",   mode: "wort-digital", minuteSet: "fuenf",   hour24: false, title: "5-Min. · Zeit finden", sub: 'Wie spät ist „fünf vor halb fünf"?' },
  { key: "digital-wort-fuenf",   mode: "digital-wort", minuteSet: "fuenf",   hour24: false, title: "5-Min. · Wort finden", sub: "Wie heißt 4:25?" },
  { key: "review-after-fuenf",   review: true, modes: CORE_MODES, minuteSets: ["volle", "halbe", "viertel", "fuenf"],
    hour24: false, title: "Wiederholung · bis 5-Min.", sub: "Alles Gelernte gemischt" },
  { key: "lesen-fuenf-24h",      mode: "lesen",        minuteSet: "fuenf",   hour24: true,  title: "24 Stunden",         sub: "Uhr ablesen · 24h" },
  { key: "stellen-fuenf-24h",    mode: "stellen",      minuteSet: "fuenf",   hour24: true,  title: "24h stellen",        sub: "Uhr stellen · 24h" },
  { key: "en-daypart-ampm",      mode: "daypart-ampm", minuteSets: ["volle", "halbe", "viertel", "fuenf"], languages: ["en"], hour24: false,
    title: "Dayparts to AM/PM", sub: "Morning, noon, night → a.m./p.m." },
  { key: "en-ampm-daypart",      mode: "ampm-daypart", minuteSets: ["volle", "halbe", "viertel", "fuenf"], languages: ["en"], hour24: false,
    title: "AM/PM to dayparts", sub: "a.m./p.m. → morning, evening, night" },
  { key: "en-digital24-ampm",    mode: "digital24-ampm", minuteSets: ["volle", "halbe", "viertel", "fuenf"], languages: ["en"], hour24: false,
    title: "24h to AM/PM", sub: "20:30 → 8:30 p.m." },
  { key: "en-ampm-digital24",    mode: "ampm-digital24", minuteSets: ["volle", "halbe", "viertel", "fuenf"], languages: ["en"], hour24: false,
    title: "AM/PM to 24h", sub: "8:30 p.m. → 20:30" },
  { key: "en-review-ampm",       review: true, modes: AMPM_MODES, minuteSets: ["volle", "halbe", "viertel", "fuenf"], languages: ["en"], hour24: false,
    title: "Review · AM/PM", sub: "Dayparts and 24h mixed" },
  { key: "lesen-minute",         mode: "lesen",        minuteSet: "minute",  hour24: false, title: "Minutengenau",       sub: "Uhr ablesen · jede Minute" },
  { key: "stellen-minute",       mode: "stellen",      minuteSet: "minute",  hour24: false, title: "Minutengenau stellen", sub: "Uhr stellen · jede Minute" },
];

function levelSupportsLanguage(level, language = DEFAULT_LANGUAGE) {
  const lang = normalizeLanguage(language);
  return !level.languages || level.languages.includes(lang);
}
function levelsForLanguage(language = DEFAULT_LANGUAGE) {
  const lang = normalizeLanguage(language);
  return LEVELS.filter(level => levelSupportsLanguage(level, lang));
}

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

function addGermanWordDistractors(opts, q) {
  const { h, m } = q;
  const parsed = parseTime(h, m, 'de');
  const next = parsed.next;
  // 1) "Viertel nach" ↔ "Viertel vor" (same hour confusion)
  if (parsed.minute === "Viertel nach") {
    opts.add(parseTime(next, 45, 'de').fullWord);
  } else if (parsed.minute === "Viertel vor") {
    opts.add(parseTime(h === 1 ? 12 : h - 1, 15, 'de').fullWord);
  }
  // 2) "halb X" ↔ "halb X+1", and "halb h" (current hour instead of next)
  if (parsed.minute === "halb") {
    const wrongNext = next === 12 ? 1 : next + 1;
    opts.add(parseTime(wrongNext === 1 ? 12 : wrongNext - 1, 30, 'de').fullWord);
    opts.add(parseTime(h === 1 ? 12 : h - 1, 30, 'de').fullWord);
  }
  // 3) nach vs vor swap on same absolute minute
  if (m === 5 || m === 10 || m === 20) {
    const swap = { 5: parseTime(next, 55, 'de'), 10: parseTime(next, 50, 'de'), 20: parseTime(next, 40, 'de') };
    opts.add(swap[m].fullWord);
  }
  if (m === 50 || m === 55 || m === 40) {
    const swap = { 55: parseTime(h, 5, 'de'), 50: parseTime(h, 10, 'de'), 40: parseTime(h, 20, 'de') };
    opts.add(swap[m].fullWord);
  }
  // 4) "5 vor halb" ↔ "5 nach halb"
  if (parsed.minute === "5 vor halb") opts.add(parseTime(next, 35, 'de').fullWord);
  if (parsed.minute === "5 nach halb") opts.add(parseTime(next, 25, 'de').fullWord);
}

function addEnglishWordDistractors(opts, q) {
  const { h, m } = q;
  const next = (h % 12) + 1;
  const prev = h === 1 ? 12 : h - 1;

  if (m === 15) opts.add(parseTime(h, 45, 'en').fullWord);
  if (m === 45) opts.add(parseTime(h, 15, 'en').fullWord);
  if (m === 30) {
    opts.add(parseTime(next, 30, 'en').fullWord);
    opts.add(parseTime(prev, 30, 'en').fullWord);
  }
  if ([5, 10, 20, 25].includes(m)) opts.add(parseTime(h, 60 - m, 'en').fullWord);
  if ([35, 40, 50, 55].includes(m)) opts.add(parseTime(h, 60 - m, 'en').fullWord);

  opts.add(parseTime(next, m, 'en').fullWord);
  opts.add(parseTime(prev, m, 'en').fullWord);
}

function buildWordOptions(q, level, language = q.language || DEFAULT_LANGUAGE) {
  const lang = normalizeLanguage(language);
  const correct = wordFromQ(q, lang);
  const opts = new Set([correct]);
  if (lang === 'en') addEnglishWordDistractors(opts, q);
  else addGermanWordDistractors(opts, q);

  const mins = effectiveMinutes(level).filter(x => x !== 0);
  let guard = 0;
  while (opts.size < 4 && guard++ < 60) {
    const rh = 1 + Math.floor(Math.random()*12);
    const rm = pickRandom(mins.length ? mins : [0]);
    opts.add(parseTime(rh, rm, lang).fullWord);
  }
  return { options: shuffle([...opts].slice(0, 4)) };
}

function oppositeHalfDay(dh) {
  return normalizeHour24(dh + 12);
}
function fillAbsoluteTimeOptions(opts, level, formatter) {
  const mins = effectiveMinutes(level);
  const pool = mins.length ? mins : [0];
  let guard = 0;
  while (opts.size < 4 && guard++ < 80) {
    const dh = Math.floor(Math.random() * 24);
    const m = pickRandom(pool);
    opts.add(formatter(dh, m));
  }
}
function buildAmpmOptions(q, level) {
  const dh = hour24FromQ(q);
  const m = q.m;
  const opts = new Set([ampmTimeFromParts(dh, m)]);
  opts.add(ampmTimeFromParts(oppositeHalfDay(dh), m));
  opts.add(ampmTimeFromParts(dh + 1, m));
  opts.add(ampmTimeFromParts(dh - 1, m));
  fillAbsoluteTimeOptions(opts, level, ampmTimeFromParts);
  return { options: shuffle([...opts].slice(0, 4)) };
}
function buildDaypartOptions(q, level) {
  const dh = hour24FromQ(q);
  const m = q.m;
  const opts = new Set([daypartTimeFromParts(dh, m)]);
  opts.add(daypartTimeFromParts(oppositeHalfDay(dh), m));
  opts.add(daypartTimeFromParts(dh + 1, m));
  opts.add(daypartTimeFromParts(dh - 1, m));
  fillAbsoluteTimeOptions(opts, level, daypartTimeFromParts);
  return { options: shuffle([...opts].slice(0, 4)) };
}
function buildDigital24Options(q, level) {
  const dh = hour24FromQ(q);
  const m = q.m;
  const opts = new Set([digital24FromParts(dh, m)]);
  opts.add(digital24FromParts(oppositeHalfDay(dh), m));
  opts.add(digital24FromParts(dh + 1, m));
  opts.add(digital24FromParts(dh - 1, m));
  fillAbsoluteTimeOptions(opts, level, digital24FromParts);
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

function modeUsesAbsoluteTime(mode) {
  const view = modeView(mode);
  if (!view) return false;
  const absoluteKinds = new Set(['daypartTime', 'ampmTime', 'digital24']);
  return absoluteKinds.has(view.promptKind) || absoluteKinds.has(view.answerKind);
}

function levelTrackRowPlan(levelCount, width, minGap = 27) {
  const count = Math.max(0, Math.floor(levelCount || 0));
  const inset = 30;
  const rowSpacing = 44;
  if (count <= 1) return { rowCount: count, perRow: count, inset, rowSpacing };
  const innerW = Math.max(0, width - inset * 2);
  const maxStopsPerRow = Math.max(2, Math.floor(innerW / minGap) + 1);
  const rowCount = Math.max(2, Math.ceil(count / maxStopsPerRow));
  return { rowCount, perRow: Math.ceil(count / rowCount), inset, rowSpacing };
}

// Build a question for a level — used by the game hook and tests.
function makeQuestion(level, rand = Math.random, language = DEFAULT_LANGUAGE) {
  const lang = normalizeLanguage(language);
  let h = 1 + Math.floor(rand()*12);
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
  if (modeUsesAbsoluteTime(mode)) {
    dh = Math.floor(rand() * 24);
    h = hour12From24(dh);
  }
  return { h, m, dh, mode, language: lang, parsed: parseTime(h, m, lang) };
}

// ============================================================
// MASTERY / localStorage (framework-agnostic)
// ============================================================
const MASTERY_KEY    = "uhrzeit.mastery.v4";
const MASTERY_KEY_V3 = "uhrzeit.mastery.v3";
const MASTERY_KEY_V2 = "uhrzeit.mastery.v2";
const MASTERY_KEY_V1 = "uhrzeit.mastery.v1";
const LEVEL_KEY      = "uhrzeit.level";
const LANGUAGE_KEY   = "uhrzeit.language";

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

function levelStorageKey(language = DEFAULT_LANGUAGE) {
  return `${LEVEL_KEY}.${normalizeLanguage(language)}`;
}

function emptyMasteryByLanguage() {
  return Object.fromEntries(LANGUAGES.map(l => [l.key, {}]));
}

function normalizeMasteryByLanguage(data) {
  const out = emptyMasteryByLanguage();
  for (const l of LANGUAGES) {
    if (data && data[l.key] && typeof data[l.key] === 'object') out[l.key] = data[l.key];
  }
  return out;
}

function saveAllMastery(all) {
  try { localStorage.setItem(MASTERY_KEY, JSON.stringify(normalizeMasteryByLanguage(all))); } catch {}
}

function loadAllMastery() {
  try {
    const v4 = localStorage.getItem(MASTERY_KEY);
    if (v4) return normalizeMasteryByLanguage(JSON.parse(v4));

    // No v4 yet — chain through earlier German-only formats so returning
    // users keep their progress under the German language bucket.
    const v3Raw = localStorage.getItem(MASTERY_KEY_V3);
    if (v3Raw) {
      const migrated = normalizeMasteryByLanguage({ de: JSON.parse(v3Raw) });
      localStorage.setItem(MASTERY_KEY, JSON.stringify(migrated));
      localStorage.removeItem(MASTERY_KEY_V3);
      return migrated;
    }

    const v2Raw = localStorage.getItem(MASTERY_KEY_V2);
    if (v2Raw) {
      const migrated = normalizeMasteryByLanguage({ de: migrateV2ToV3(JSON.parse(v2Raw)) });
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
      const migrated = normalizeMasteryByLanguage({ de: migrateV2ToV3(v2Data) });
      localStorage.setItem(MASTERY_KEY, JSON.stringify(migrated));
      localStorage.removeItem(MASTERY_KEY_V1);
      return migrated;
    }

    return emptyMasteryByLanguage();
  } catch { return emptyMasteryByLanguage(); }
}
function loadMastery(language = DEFAULT_LANGUAGE) {
  return loadAllMastery()[normalizeLanguage(language)] || {};
}
function saveMastery(m, language = DEFAULT_LANGUAGE) {
  const all = loadAllMastery();
  all[normalizeLanguage(language)] = m || {};
  saveAllMastery(all);
}
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
    localStorage.removeItem(MASTERY_KEY_V3);
    localStorage.removeItem(MASTERY_KEY_V2);
    localStorage.removeItem(MASTERY_KEY_V1);
    localStorage.removeItem(LEVEL_KEY);
    for (const l of LANGUAGES) localStorage.removeItem(levelStorageKey(l.key));
  } catch {}
}

Object.assign(window, {
  DEFAULT_LANGUAGE, LANGUAGES, LANGUAGE_KEY, normalizeLanguage,
  HOUR_NAMES, EN_HOUR_NAMES, hourName, parseTime, digitalStr, digitalFromQ, wordFromQ,
  hour12From24, ampmPeriodFrom24, ampmTimeFromQ, digital24FromQ, daypartKeyFrom24, daypartTimeFromQ, textFromQ,
  MINUTE_SETS, LEVELS, CORE_MODES, AMPM_MODES, ALL_MODES, MODE_SPECS, modeView, levelsForLanguage, levelSupportsLanguage, pickRandom, shuffle,
  effectiveMinutes, pickMode,
  buildDigitalOptions, buildWordOptions, buildAmpmOptions, buildDaypartOptions, buildDigital24Options,
  snap5deg, snapHour, snapToAllowedMinutes, minuteSnapGrid, levelTrackRowPlan,
  QUARTER_GRID, FUENF_GRID,
  makeQuestion,
  MASTERY_KEY, MASTERY_KEY_V1, MASTERY_KEY_V2, MASTERY_KEY_V3, LEVEL_KEY,
  migrateV1Id, migrateV2ToV3, V2_TO_V3, levelKeyFromStored, levelStorageKey,
  loadAllMastery, saveAllMastery, loadMastery, saveMastery, masteryTier, recordMastery, resetMastery,
});
