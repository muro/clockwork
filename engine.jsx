// German clock-learning game engine — curriculum version with Wort modes
// Levels are (mode, minute-set, 12h/24h). modes: lesen | stellen | wort-lesen | wort-stellen

const HOUR_NAMES = ["zwölf","eins","zwei","drei","vier","fünf","sechs","sieben","acht","neun","zehn","elf","zwölf"];
function hourName(h) { return HOUR_NAMES[h % 12 === 0 ? 12 : h % 12]; }

function parseTime(h, m) {
  const next = (h % 12) + 1;
  switch (m) {
    case 0:  return { minute: null, hour: h, next: next, full: `${h} Uhr`, fullWord: `${hourName(h)} Uhr` };
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
}
function digitalStr(h, m) { return `${h}:${String(m).padStart(2, "0")}`; }
function digitalFromQ(q) { const hh = q.dh ?? q.h; return `${hh}:${String(q.m).padStart(2, "0")}`; }
function wordFromQ(q) { return q.parsed.fullWord; }

const MINUTE_SETS = {
  volle:   [0],
  halbe:   [0, 30],
  viertel: [0, 15, 30, 45],
  fuenf:   [0,5,10,15,20,25,30,35,40,45,50,55],
};

// ============================================================
// CURRICULUM
// Modes: lesen (clock→digital), stellen (digital→clock),
//        wort-lesen (clock→phrase), wort-stellen (phrase→clock)
// ============================================================
const LEVELS = [
  { id: 0,  mode: "lesen",        minuteSet: "volle",   hour24: false, title: "Volle Stunden",    sub: "Uhr ablesen · :00" },
  { id: 1,  mode: "stellen",      minuteSet: "volle",   hour24: false, title: "Volle stellen",    sub: "Uhr stellen · :00" },

  { id: 2,  mode: "lesen",        minuteSet: "halbe",   hour24: false, title: "Halbe Stunden",    sub: "Uhr ablesen · :30" },
  { id: 3,  mode: "wort-lesen",   minuteSet: "halbe",   hour24: false, title: "halb … auf Deutsch", sub: "Welcher Satz passt?" },
  { id: 4,  mode: "wort-stellen", minuteSet: "halbe",   hour24: false, title: "halb … stellen",   sub: "Satz zur Uhr" },
  { id: 5,  mode: "stellen",      minuteSet: "halbe",   hour24: false, title: "Halbe stellen",    sub: "Uhr stellen · :30" },

  { id: 6,  mode: "lesen",        minuteSet: "viertel", hour24: false, title: "Viertelstunden",   sub: "Uhr ablesen · :15, :45" },
  { id: 7,  mode: "wort-lesen",   minuteSet: "viertel", hour24: false, title: "Viertel · Wörter", sub: "Welcher Satz passt?" },
  { id: 8,  mode: "wort-stellen", minuteSet: "viertel", hour24: false, title: "Viertel · stellen",sub: "Satz zur Uhr" },
  { id: 9,  mode: "stellen",      minuteSet: "viertel", hour24: false, title: "Viertel stellen",  sub: "Uhr stellen · :15, :45" },

  { id: 10, mode: "lesen",        minuteSet: "fuenf",   hour24: false, title: "5-Minuten",        sub: "Uhr ablesen · alle 5" },
  { id: 11, mode: "wort-lesen",   minuteSet: "fuenf",   hour24: false, title: "5-Min. · Wörter",  sub: "Welcher Satz passt?" },
  { id: 12, mode: "wort-stellen", minuteSet: "fuenf",   hour24: false, title: "5-Min. · stellen", sub: "Satz zur Uhr" },
  { id: 13, mode: "stellen",      minuteSet: "fuenf",   hour24: false, title: "5-Min. stellen",   sub: "Uhr stellen · alle 5" },

  { id: 14, mode: "lesen",        minuteSet: "fuenf",   hour24: true,  title: "24 Stunden",        sub: "Uhr ablesen · 24h" },
  { id: 15, mode: "stellen",      minuteSet: "fuenf",   hour24: true,  title: "24h stellen",       sub: "Uhr stellen · 24h" },
];

function pickRandom(a){ return a[Math.floor(Math.random()*a.length)]; }
function shuffle(a){ a = a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

// ============================================================
// OPTION BUILDERS
// ============================================================
function buildDigitalOptions(q, level) {
  const correct = digitalFromQ(q);
  const opts = new Set([correct]);
  const mins = MINUTE_SETS[level.minuteSet];
  const hoursPool = level.hour24 ? [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23] :
                                    [1,2,3,4,5,6,7,8,9,10,11,12];
  if (level.hour24) {
    const alt = q.dh < 12 ? (q.dh + 12) % 24 : q.dh - 12;
    if (alt !== q.dh) opts.add(`${alt}:${String(q.m).padStart(2,'0')}`);
  }
  const mh = q.m === 0 ? 12 : q.m / 5;
  if (mh !== q.h) opts.add(digitalStr(mh, q.m));
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

// Word-phrase options (for wort-lesen)
function buildWordOptions(q, level) {
  const correct = wordFromQ(q);
  const opts = new Set([correct]);
  const { h, m, parsed } = q;
  const next = parsed.next;
  // Pedagogical traps:
  // 1) "Viertel nach" ↔ "Viertel vor" (same hour confusion)
  if (parsed.minute === "Viertel nach") {
    opts.add(parseTime(next, 45).fullWord); // Viertel vor <next> (same analog)
  } else if (parsed.minute === "Viertel vor") {
    opts.add(parseTime(h === 1 ? 12 : h - 1, 15).fullWord); // Viertel nach <prev>
  }
  // 2) "halb X" is a classic swap with "halb X+1" and the off-by-one
  //    confusion "halb (h)" — naming the current hour instead of the next.
  if (parsed.minute === "halb") {
    const wrongNext = next === 12 ? 1 : next + 1;
    opts.add(parseTime(wrongNext === 1 ? 12 : wrongNext - 1, 30).fullWord); // halb (next+1)
    // "halb h": say the current hour instead of next — needs parseTime(h-1, 30)
    opts.add(parseTime(h === 1 ? 12 : h - 1, 30).fullWord);
  }
  // 3) nach vs vor swap on same absolute minute
  if (m === 5 || m === 10 || m === 20) {
    // opposite direction, adjusted hour
    const swap = { 5: parseTime(next, 55), 10: parseTime(next, 50), 20: parseTime(next, 40) };
    opts.add(swap[m].fullWord);
  }
  if (m === 50 || m === 55 || m === 40) {
    const swap = { 55: parseTime(h, 5), 50: parseTime(h, 10), 40: parseTime(h, 20) };
    opts.add(swap[m].fullWord);
  }
  // 4) "5 vor halb" ↔ "5 nach halb" confusion
  if (parsed.minute === "5 vor halb") opts.add(parseTime(next, 35).fullWord);
  if (parsed.minute === "5 nach halb") opts.add(parseTime(next, 25).fullWord);
  // Pad to 4 with random valid phrases
  const mins = MINUTE_SETS[level.minuteSet].filter(x => x !== 0); // skip "X Uhr" as distractor unless volle
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

// ============================================================
// MASTERY / localStorage
// ============================================================
const MASTERY_KEY = "uhrzeit.mastery.v1";
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
function useMastery() {
  const [m, setM] = React.useState(() => loadMastery());
  const record = (levelId, correct) => {
    setM(prev => {
      const tier = masteryTier(correct);
      const prevBest = prev[levelId]?.tier ?? 0;
      const next = { ...prev, [levelId]: {
        tier: Math.max(prevBest, tier),
        best: Math.max(prev[levelId]?.best ?? 0, correct),
        last: correct,
      }};
      saveMastery(next); return next;
    });
  };
  const reset = () => { saveMastery({}); setM({}); };
  return { mastery: m, record, reset };
}

// ============================================================
// HOOK
// ============================================================
function useClockGame({ levelId = 0, roundN = 10, onMilestone, onRoundDone } = {}) {
  const [, setTick] = React.useState(0);
  const refresh = () => setTick(t => t + 1);
  const level = LEVELS[levelId];

  const ref = React.useRef(null);
  if (!ref.current) ref.current = {
    question: null, selected: null, options: [],
    setH: 12, setM: 0, activeHand: "minute",
    locked: false, wasCorrect: false, feedback: null, feedbackKind: null,
    score: 0, streak: 0, round: [], qIndex: 0, complete: false, lastMilestone: 0,
    levelId, roundN,
  };
  const S = ref.current;
  S.levelId = levelId; S.roundN = roundN; S.level = level;

  const isRead  = (level.mode === "lesen" || level.mode === "wort-lesen");
  const isWord  = (level.mode === "wort-lesen" || level.mode === "wort-stellen");
  const isSet   = (level.mode === "stellen" || level.mode === "wort-stellen");

  const newQuestion = () => {
    const h = 1 + Math.floor(Math.random()*12);
    const mins = MINUTE_SETS[level.minuteSet];
    const m = pickRandom(mins);
    let dh = h;
    if (level.hour24) {
      const pm = Math.random() < 0.5;
      dh = pm ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
    }
    S.question = { h, m, dh, parsed: parseTime(h, m) };
    S.selected = null; S.locked = false;
    S.feedback = null; S.feedbackKind = null;
    if (isSet) { S.setH = 12; S.setM = 0; S.activeHand = "minute"; }
    if (level.mode === "lesen")       Object.assign(S, buildDigitalOptions(S.question, level));
    if (level.mode === "wort-lesen")  Object.assign(S, buildWordOptions(S.question, level));
    refresh();
  };

  const startRound = () => {
    S.round = []; S.qIndex = 0; S.complete = false; S.lastMilestone = 0;
    newQuestion();
  };

  React.useEffect(() => { startRound(); }, []);
  const firstRun = React.useRef(true);
  React.useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    startRound();
  }, [levelId]);

  const finishQuestion = (ok) => {
    S.locked = true; S.wasCorrect = ok;
    if (ok) {
      S.streak += 1;
      S.score += 10 + Math.min(10, S.streak);
      S.feedback = pickRandom(["Genau.","Richtig.","Perfekt.","Sehr schön.","Stimmt."]);
      S.feedbackKind = "correct";
    } else {
      S.streak = 0;
      S.feedback = isWord
        ? `Richtig: ${wordFromQ(S.question)}.`
        : `Richtig: ${digitalFromQ(S.question)}.`;
      S.feedbackKind = "wrong";
      if (isSet) { S.setH = S.question.h; S.setM = S.question.m; }
    }
    S.round.push(ok);
    if (ok && (S.streak === 5 || S.streak === 10) && S.streak !== S.lastMilestone) {
      S.lastMilestone = S.streak;
      onMilestone && onMilestone(S.streak);
    }
    refresh();
    if (ok) setTimeout(() => { if (S.locked && !S.complete) next(); }, 1300);
  };

  const next = () => {
    if (S.round.length >= S.roundN) {
      S.complete = true;
      const correctCount = S.round.filter(Boolean).length;
      onRoundDone && onRoundDone(levelId, correctCount);
      refresh();
      return;
    }
    S.qIndex += 1;
    newQuestion();
  };

  const pickOption = (val) => {
    if (S.locked) return;
    S.selected = val;
    refresh();
    const correct = level.mode === "wort-lesen" ? wordFromQ(S.question) : digitalFromQ(S.question);
    finishQuestion(val === correct);
  };

  const check = () => {
    if (S.locked) return;
    const { h, m } = S.question;
    const ok = (S.setM === m) && (S.setH === h);
    finishQuestion(ok);
  };

  const setHandAngle = (ang, which, live = false) => {
    if (S.locked) return;
    if (which === "minute") { if (!live) S.setM = snap5deg(ang); }
    else { if (!live) S.setH = snapHour(ang); }
    if (!live) refresh();
  };
  const setActiveHand = (h) => { S.activeHand = h; refresh(); };

  return {
    state: S,
    actions: { pickOption, check, next, setHandAngle, setActiveHand, startRound },
    helpers: { hourName, digitalStr, digitalFromQ, wordFromQ, parseTime },
  };
}

Object.assign(window, {
  useClockGame, useMastery, LEVELS, MINUTE_SETS, masteryTier,
  hourName, digitalStr, digitalFromQ, wordFromQ, parseTime,
  snap5deg, snapHour,
});
