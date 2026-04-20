// Uhrzeit Lernen — single Schoolbook Sunshine variant, curriculum-based.
// 10 levels in a horizontal track, daffodil progression on mastery.

// ============================================================
// DAFFODIL / BUD / SPROUT SVG ICONS
// ============================================================
function LevelIcon({ tier, active, accent, ink, fillProgress = 0 }) {
  // tier: 0 empty/shaded dot, 1 sprout, 2 bud, 3 daffodil
  // fillProgress (0..1) used only at tier 0 to shade the dot based on 0..7 correct
  const size = active ? 28 : 22;
  if (tier === 0) {
    // Small dot, shading proportional to recent correct count
    const shade = Math.max(0, Math.min(1, fillProgress));
    const dotSize = Math.round(size * 0.55);
    const bg = active
      ? accent
      : `rgba(232,89,12,${0.12 + shade * 0.55})`;
    return <div style={{
      width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: dotSize, height: dotSize, borderRadius: '50%',
        background: bg,
        border: active ? `2px solid ${accent}` : `1px solid rgba(42,36,24,${0.2 + shade * 0.3})`,
        boxShadow: active ? `0 2px 6px rgba(232,89,12,0.35)` : 'none',
        transition: 'all .2s',
      }} />
    </div>;
  }
  if (tier === 1) {
    // Sprout: small green leaf
    return <svg width={size+4} height={size+4} viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="13" fill="#fff" stroke={active ? accent : 'rgba(42,36,24,0.28)'} strokeWidth={active?2.5:1.5}/>
      <path d="M14 20 Q14 14 10 11 Q12 14 14 20 Q14 14 18 11 Q16 14 14 20" fill="#8bc34a" stroke="#558b2f" strokeWidth="0.8"/>
      <line x1="14" y1="20" x2="14" y2="22" stroke="#558b2f" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>;
  }
  if (tier === 2) {
    // Bud: closed yellow teardrop on green stem
    return <svg width={size+6} height={size+6} viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="13" fill="#fff8e1" stroke={active ? accent : 'rgba(42,36,24,0.28)'} strokeWidth={active?2.5:1.5}/>
      <line x1="14" y1="22" x2="14" y2="14" stroke="#558b2f" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M11 15 Q11 8 14 6 Q17 8 17 15 Q17 18 14 18 Q11 18 11 15 Z" fill="#fbc02d" stroke="#e65100" strokeWidth="0.8"/>
      <path d="M16 19 Q19 18 20 15" fill="none" stroke="#558b2f" strokeWidth="1" strokeLinecap="round"/>
    </svg>;
  }
  // tier 3: full daffodil 🌼
  return <svg width={size+10} height={size+10} viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="15" fill="#fffde7" stroke={active ? accent : '#f9a825'} strokeWidth={active?2.5:1.5}/>
    {/* 6 outer petals */}
    {[0,60,120,180,240,300].map(a => {
      const rad = (a - 90) * Math.PI/180;
      const cx = 16 + 7.5*Math.cos(rad), cy = 16 + 7.5*Math.sin(rad);
      return <ellipse key={a} cx={cx} cy={cy} rx="4.2" ry="2.4" fill="#ffd54f" stroke="#f57f17" strokeWidth="0.7"
        transform={`rotate(${a} ${cx} ${cy})`} />;
    })}
    {/* trumpet */}
    <circle cx="16" cy="16" r="4.2" fill="#ff8f00" stroke="#bf360c" strokeWidth="0.8"/>
    <circle cx="16" cy="16" r="2.2" fill="#ffb300"/>
  </svg>;
}

// ============================================================
// LEVEL TRACK — the curriculum slider
// ============================================================
function LevelTrack({ levelId, setLevelId, mastery, accent, ink, soft, paper, onReset }) {
  const trackRef = React.useRef(null);
  const [drag, setDrag] = React.useState(false);

  const handleAt = (clientX) => {
    const r = trackRef.current.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    const lv = Math.round(t * (LEVELS.length - 1));
    setLevelId(lv);
  };
  const onDown = (e) => {
    e.preventDefault(); setDrag(true);
    const p = e.touches ? e.touches[0] : e;
    handleAt(p.clientX);
  };
  React.useEffect(() => {
    if (!drag) return;
    const move = (e) => { const p = e.touches ? e.touches[0] : e; handleAt(p.clientX); };
    const up = () => setDrag(false);
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', up);
    return () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', up);
    };
  }, [drag]);

  const pct = (levelId / (LEVELS.length - 1)) * 100;
  const current = LEVELS[levelId];
  const curMastery = mastery[levelId];

  return (
    <div style={{ margin: '4px 0 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em',
        textTransform: 'uppercase', color: soft, marginBottom: 6 }}>
        <span>Level {String(levelId+1).padStart(2,'0')} / {LEVELS.length}</span>
        <button onClick={onReset}
          style={{ fontFamily: 'inherit', fontSize: 9, letterSpacing: '0.14em',
            color: soft, background: 'transparent', border: 0, cursor: 'pointer',
            textTransform: 'uppercase', padding: 0 }}>
          Zurücksetzen
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginTop: 2 }}>
        <div style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 600, fontSize: 16, color: ink, letterSpacing: '-0.01em' }}>
          {current.title}
        </div>
        <div style={{ fontFamily: 'Nunito, sans-serif', fontStyle: 'italic', fontSize: 12, color: soft, textAlign: 'right' }}>
          {current.sub}
        </div>
      </div>

      <div ref={trackRef}
        onMouseDown={onDown} onTouchStart={onDown}
        style={{ position: 'relative', height: 44, cursor: 'pointer', touchAction: 'none',
          marginTop: 10 }}>
        {/* Track */}
        <div style={{ position: 'absolute', left: 14, right: 14, top: 20, height: 2,
          background: 'rgba(42,36,24,0.18)', borderRadius: 1 }} />
        {/* Fill up to current level */}
        <div style={{ position: 'absolute', left: 14,
          width: `calc(${pct}% * (100% - 28px) / 100%)`, top: 20, height: 2,
          background: accent, borderRadius: 1, transition: drag ? 'none' : 'width .25s' }} />
        {/* Stops */}
        {LEVELS.map((lv, i) => {
          const x = (i / (LEVELS.length - 1)) * 100;
          const tier = mastery[i]?.tier ?? 0;
          const active = i === levelId;
          return (
            <div key={i}
              onClick={(e) => { e.stopPropagation(); setLevelId(i); }}
              style={{ position: 'absolute', left: `calc(14px + ${x}% * (100% - 28px) / 100%)`,
                top: 8, transform: 'translateX(-50%)',
                cursor: 'pointer', zIndex: active ? 3 : 2,
              }}>
              <LevelIcon tier={tier} active={active} accent={accent} ink={ink}
                fillProgress={(mastery[i]?.best ?? 0) / 7} />
            </div>
          );
        })}
      </div>

      {/* Best score for current level */}
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: soft, marginTop: 4, textAlign: 'right' }}>
        {curMastery ?
          `Bestes Ergebnis · ${curMastery.best}/10${curMastery.tier === 3 ? ' 🌼' : ''}` :
          'Noch nicht gespielt'}
      </div>
    </div>
  );
}

// ============================================================
// GAME BODY (unchanged structure — lesen vs stellen)
// ============================================================
function Body({ S, actions, level, c, theme, font, labelFont, accent }) {
  if (!S.question) return null;
  const { h, m } = S.question;
  const correct = digitalFromQ(S.question);

  const optBtn = (content, { onClick, state }) => {
    let bg = 'transparent', color = c.ink, border = `1.5px solid ${c.ink}`;
    if (state === 'selected') { bg = c.ink; color = c.paper; }
    else if (state === 'correct') { color = c.correct; border = `1.5px solid ${c.correct}`; }
    else if (state === 'wrong')   { color = c.wrong; border = `1.5px solid ${c.wrong}`; }
    else if (state === 'faded')   { color = c.soft; border = `1px solid rgba(0,0,0,0.1)`; }

    return <button onClick={onClick}
      style={{
        fontFamily: font, fontWeight: 500, fontSize: 22,
        padding: '14px 10px', minHeight: 56, borderRadius: 999,
        border, background: bg, color, cursor: 'pointer',
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
        transition: 'all .15s ease',
      }}>{content}</button>;
  };

  // ---------- LESEN (clock → digital number) ----------
  if (level.mode === 'lesen') {
    const stOf = (v) => !S.locked ? (S.selected === v ? 'selected' : '')
                        : v === correct ? 'correct' : v === S.selected ? 'wrong' : 'faded';
    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 16px' }}>
          <Clock theme={theme} size={230} h={h} m={m}
            numeralFont={font} numeralWeight={500} />
        </div>
        <div style={{ fontFamily: 'Nunito, sans-serif', fontStyle: 'italic',
          fontSize: 14, color: c.soft, marginBottom: 12, textAlign: 'center' }}>
          Wie spät ist es?{level.hour24 ? ' (24-Stunden)' : ''}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {S.options.map(o => <React.Fragment key={o}>
            {optBtn(o, { onClick: () => actions.pickOption(o), state: stOf(o) })}
          </React.Fragment>)}
        </div>
        <Feedback c={c} S={S} />
        {S.locked && !S.wasCorrect && <NextBtn onClick={actions.next} c={c} font={font} accent={accent} />}
      </>
    );
  }

  // ---------- WORT-LESEN (clock → German phrase) ----------
  if (level.mode === 'wort-lesen') {
    const correctWord = wordFromQ(S.question);
    const stOf = (v) => !S.locked ? (S.selected === v ? 'selected' : '')
                        : v === correctWord ? 'correct' : v === S.selected ? 'wrong' : 'faded';
    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 14px' }}>
          <Clock theme={theme} size={210} h={h} m={m}
            numeralFont={font} numeralWeight={500} />
        </div>
        <div style={{ fontFamily: 'Nunito, sans-serif', fontStyle: 'italic',
          fontSize: 14, color: c.soft, marginBottom: 10, textAlign: 'center' }}>
          Welcher Satz passt?
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
          {S.options.map(o => {
            const state = stOf(o);
            let bg = 'transparent', color = c.ink, border = `1.5px solid ${c.ink}`;
            if (state === 'selected') { bg = c.ink; color = c.paper; }
            else if (state === 'correct') { color = c.correct; border = `1.5px solid ${c.correct}`; }
            else if (state === 'wrong')   { color = c.wrong; border = `1.5px solid ${c.wrong}`; }
            else if (state === 'faded')   { color = c.soft; border = `1px solid rgba(0,0,0,0.1)`; }
            return <button key={o} onClick={() => actions.pickOption(o)}
              style={{ fontFamily: font, fontWeight: 500, fontSize: 17,
                padding: '13px 16px', minHeight: 50, borderRadius: 14,
                border, background: bg, color, cursor: 'pointer', textAlign: 'left',
                letterSpacing: '-0.01em', transition: 'all .15s ease' }}>
              {o}
            </button>;
          })}
        </div>
        <Feedback c={c} S={S} />
        {S.locked && !S.wasCorrect && <NextBtn onClick={actions.next} c={c} font={font} accent={accent} />}
      </>
    );
  }

  // ---------- WORT-STELLEN (German phrase → set clock) ----------
  if (level.mode === 'wort-stellen') {
    return (
      <>
        <div style={{ padding: '10px 0 14px', textAlign: 'center' }}>
          <div style={{ fontFamily: labelFont + ', monospace', fontSize: 10, letterSpacing: '0.22em',
            textTransform: 'uppercase', color: c.soft, marginBottom: 6 }}>
            Stelle die Uhr auf
          </div>
          <div style={{ fontFamily: font, fontWeight: 600, fontSize: 28,
            color: accent, letterSpacing: '-0.015em', lineHeight: 1.15,
            padding: '0 6px' }}>
            {wordFromQ(S.question)}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 10px' }}>
          <Clock theme={theme} size={220} h={S.setH} m={S.setM}
            interactive={!S.locked} activeHand={S.activeHand}
            onSetAngle={actions.setHandAngle} onPickHand={actions.setActiveHand}
            numeralFont={font} numeralWeight={500} />
        </div>
        <Feedback c={c} S={S} />
        {S.locked ? (!S.wasCorrect && <NextBtn onClick={actions.next} c={c} font={font} accent={accent} />) :
          <button onClick={actions.check}
            style={{ width: '100%', fontFamily: font, fontWeight: 600, fontSize: 17, minHeight: 52,
              padding: '12px', borderRadius: 999, border: 0,
              background: accent, color: c.paper, cursor: 'pointer', marginTop: 8,
              letterSpacing: '-0.01em' }}>
            Prüfen
          </button>}
      </>
    );
  }

  // ---------- STELLEN (digital number → set clock) ----------
  return (
    <>
      <div style={{ padding: '12px 0 12px', textAlign: 'center' }}>
        <div style={{ fontFamily: labelFont + ', monospace', fontSize: 10, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: c.soft, marginBottom: 6 }}>
          Stelle die Uhr auf{level.hour24 ? ' (24h)' : ''}
        </div>
        <div style={{ fontFamily: font, fontWeight: 600, fontSize: 64,
          color: accent, letterSpacing: '-0.03em', lineHeight: 1,
          fontVariantNumeric: 'tabular-nums' }}>
          {digitalFromQ(S.question)}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 10px' }}>
        <Clock theme={theme} size={220} h={S.setH} m={S.setM}
          interactive={!S.locked} activeHand={S.activeHand}
          onSetAngle={actions.setHandAngle} onPickHand={actions.setActiveHand}
          numeralFont={font} numeralWeight={500} />
      </div>
      <Feedback c={c} S={S} />
      {S.locked ? (!S.wasCorrect && <NextBtn onClick={actions.next} c={c} font={font} accent={accent} />) :
        <button onClick={actions.check}
          style={{ width: '100%', fontFamily: font, fontWeight: 600, fontSize: 17, minHeight: 52,
            padding: '12px', borderRadius: 999, border: 0,
            background: accent, color: c.paper, cursor: 'pointer', marginTop: 8,
            letterSpacing: '-0.01em' }}>
          Prüfen
        </button>}
    </>
  );
}

function Feedback({ c, S }) {
  return <div style={{
    fontFamily: 'Nunito, sans-serif', fontStyle: 'italic',
    fontSize: 14, textAlign: 'center', minHeight: 20, margin: '10px 0 4px',
    color: S.feedbackKind === 'correct' ? c.correct : S.feedbackKind === 'wrong' ? c.wrong : 'transparent',
    fontWeight: 600,
  }}>{S.feedback || '—'}</div>;
}

function NextBtn({ onClick, c, font, accent }) {
  return <button onClick={onClick}
    style={{ width: '100%', fontFamily: font, fontWeight: 600, fontSize: 16, minHeight: 50,
      padding: '12px', borderRadius: 999, border: 0,
      background: accent, color: c.paper, cursor: 'pointer', marginTop: 8 }}>
    Weiter →
  </button>;
}

function RoundComplete({ c, accent, font, correct, tier, onAgain, onNext, hasNext }) {
  const msg = tier === 3 ? 'Perfekt! Eine Narzisse für dich.' :
              tier === 2 ? 'Fast perfekt — eine Knospe!' :
              tier === 1 ? 'Gut gemacht, ein erster Spross.' :
              'Versuch es noch einmal.';
  return <div style={{ textAlign: 'center', padding: '30px 0 16px' }}>
    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
      letterSpacing: '0.22em', textTransform: 'uppercase', color: c.soft }}>
      Runde abgeschlossen
    </div>
    <div style={{ fontFamily: font, fontWeight: 700, fontSize: 56, color: accent,
      marginTop: 4, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
      {correct}<span style={{ color: c.soft, fontWeight: 500 }}>/10</span>
    </div>
    <div style={{ margin: '10px auto 4px', width: 80, height: 80 }}>
      <LevelIcon tier={tier} active accent={accent} ink={c.ink} />
    </div>
    <div style={{ fontFamily: 'Nunito, sans-serif', fontStyle: 'italic', marginTop: 8, color: c.ink }}>
      {msg}
    </div>
    <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'center' }}>
      <button onClick={onAgain}
        style={{ fontFamily: font, fontWeight: 600, fontSize: 15,
          padding: '11px 22px', borderRadius: 999, border: `1.5px solid ${c.ink}`,
          background: 'transparent', color: c.ink, cursor: 'pointer' }}>Nochmal</button>
      {hasNext && <button onClick={onNext}
        style={{ fontFamily: font, fontWeight: 600, fontSize: 15,
          padding: '11px 22px', borderRadius: 999, border: 0,
          background: accent, color: c.paper, cursor: 'pointer' }}>Weiter →</button>}
    </div>
  </div>;
}

function Celebrate({ streak, c, accent }) {
  return <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 50, pointerEvents: 'none' }}>
    <div style={{ position: 'absolute', inset: 0,
      background: `radial-gradient(circle at 50% 50%, ${c.accentSoft} 0%, transparent 65%)` }} />
    <svg viewBox="0 0 200 200" width={160} height={160}
      style={{ animation: 'clockPop 1.6s cubic-bezier(.34,1.56,.64,1)', position: 'relative' }}>
      <g stroke={accent} strokeWidth="5" strokeLinecap="round">
        {[0,45,90,135,180,225,270,315].map(a => {
          const rad = (a - 90) * Math.PI/180;
          const x1 = 100 + 78*Math.cos(rad), y1 = 100 + 78*Math.sin(rad);
          const x2 = 100 + 92*Math.cos(rad), y2 = 100 + 92*Math.sin(rad);
          return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </g>
      <circle cx="100" cy="100" r="48" fill="#fcc419" stroke={accent} strokeWidth="4"/>
      <path d="M80 102 Q100 122 120 102" fill="none" stroke={c.ink} strokeWidth="4" strokeLinecap="round"/>
      <circle cx="86" cy="92" r="4" fill={c.ink}/><circle cx="114" cy="92" r="4" fill={c.ink}/>
    </svg>
    <div style={{ position: 'absolute', bottom: '32%', fontFamily: 'Fredoka, sans-serif',
      fontWeight: 700, fontSize: 24, color: accent }}>
      {streak === 10 ? 'Zehn am Stück!' : 'Fünf am Stück!'}
    </div>
  </div>;
}

// ============================================================
// MAIN VARIANT — Schoolbook Sunshine
// ============================================================
function UhrzeitApp() {
  const { mastery, record, reset } = useMastery();
  const [levelId, setLevelId] = React.useState(() => {
    try { return parseInt(localStorage.getItem('uhrzeit.level') || '0', 10) || 0; }
    catch { return 0; }
  });
  const [celeb, setCeleb] = React.useState(null);

  React.useEffect(() => {
    try { localStorage.setItem('uhrzeit.level', String(levelId)); } catch {}
  }, [levelId]);

  const onMilestone = (s) => { setCeleb(s); setTimeout(() => setCeleb(null), 1600); };
  const onRoundDone = (lv, correct) => record(lv, correct);

  const game = useClockGame({ levelId, onMilestone, onRoundDone });
  const S = game.state;
  const level = LEVELS[levelId];

  const c = {
    paper: '#fffef5', ink: '#2a2418', soft: '#8c826a',
    correct: '#5c940d', wrong: '#c92a2a',
    accentSoft: 'rgba(232,89,12,0.22)',
  };
  const accent = '#e8590c';
  const theme = {
    face: 'rgba(255,253,235,0.8)', border: `1.5px solid ${c.ink}`,
    numeral: c.ink, hourHand: c.ink, minHand: accent,
    tickColor: c.ink, tickMinor: 'rgba(42,36,24,0.4)', pivot: c.ink,
  };

  const handleReset = () => {
    if (confirm('Fortschritt wirklich zurücksetzen?')) {
      reset();
      setLevelId(0);
      game.actions.startRound();
    }
  };

  const roundCorrect = S.round.filter(Boolean).length;
  const roundTier = masteryTier(roundCorrect);

  return (
    <div style={{
      minHeight: '100%', padding: '18px 22px 28px',
      background: 'radial-gradient(ellipse 80% 40% at 50% 0%, #fffbe0 0%, transparent 60%),' +
                  'linear-gradient(180deg, #fef3b8 0%, #fde884 100%)',
      fontFamily: 'Nunito, sans-serif', color: c.ink, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -60, right: -50, width: 160, height: 160,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #fff, #fcc419 55%, #f59f00 100%)',
        opacity: 0.55 }} />
      {[[14,180],[310,230],[30,520],[340,610],[60,680]].map(([x,y],i) =>
        <div key={i} style={{ position:'absolute', left:x, top:y, width:5, height:5,
          borderRadius:'50%', background:'#f59f00', opacity:0.4 }} />)}

      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.2em',
          textTransform: 'uppercase', color: c.soft }}>
          <span>№ {String(S.qIndex+1).padStart(2,'0')} / {String(S.roundN).padStart(2,'0')}</span>
          <span>{S.score} Pkt · <span style={{ color: accent }}>{S.streak}↑</span></span>
        </div>
        <div style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 600, fontSize: 30,
          lineHeight: 1, color: c.ink, letterSpacing: '-0.02em', marginTop: 4 }}>
          Die Uhrzeit
        </div>

        {/* Round progress */}
        <div style={{ display: 'flex', gap: 3, marginTop: 10 }}>
          {Array.from({length: S.roundN}, (_,i) => {
            const bg = i < S.round.length ? (S.round[i] ? c.correct : c.wrong) :
                       i === S.qIndex ? accent : 'rgba(0,0,0,0.12)';
            return <div key={i} style={{ flex: 1, height: 3, background: bg, borderRadius: 2 }} />;
          })}
        </div>

        <div style={{ marginTop: 16 }}>
          <LevelTrack levelId={levelId} setLevelId={setLevelId} mastery={mastery}
            accent={accent} ink={c.ink} soft={c.soft} paper={c.paper} onReset={handleReset} />
        </div>

        {S.complete ?
          <RoundComplete c={c} accent={accent} font="Fredoka, sans-serif"
            correct={roundCorrect} tier={roundTier}
            onAgain={game.actions.startRound}
            onNext={() => setLevelId(Math.min(LEVELS.length - 1, levelId + 1))}
            hasNext={levelId < LEVELS.length - 1} /> :
          <Body S={S} actions={game.actions} level={level} c={c} theme={theme}
            accent={accent} font="Fredoka, sans-serif" labelFont="JetBrains Mono" />}
      </div>
      {celeb && <Celebrate streak={celeb} c={c} accent={accent} />}
    </div>
  );
}

Object.assign(window, { UhrzeitApp });
