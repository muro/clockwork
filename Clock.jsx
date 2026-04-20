// Shared clock component. Renders a face with numerals, ticks and hands.
// Interactive (drag + tap) when `interactive` is true.
// Props:
//   theme: style object with {face, border, numeral, hourHand, minHand, tickColor, tickMinor, pivot}
//   hourStyle, minStyle: CSS width/height overrides
//   numeralStyle: font for numerals
//   size: px
//   showNumerals: bool or 'cardinals' (12,3,6,9 only)
//   showMinorTicks: bool
//   h, m: displayed time (1..12, 0..55)
//   interactive: bool — enables drag + tap
//   activeHand: 'minute' | 'hour'
//   onSetAngle(ang, which, live)
//   decorate: function(ctx) -> optional overlay JSX

function Clock({
  theme = {},
  size = 240,
  showNumerals = true,
  showMinorTicks = true,
  h = 12, m = 0,
  interactive = false,
  activeHand = "minute",
  onSetAngle,
  onPickHand,
  hourStyle = {},
  minStyle = {},
  numeralFont = 'Fredoka, system-ui',
  numeralWeight = 500,
  numeralSize,
  tickThickness = 2,
  minorThickness = 1,
  minorLen = 4,
  majorLen = 8,
  handStyle = 'thin',
  overlay = null,
}) {
  const faceRef = React.useRef(null);
  const [drag, setDrag] = React.useState(null);
  const R = size / 2;

  const hourAng = ((h % 12) * 30) + (m * 0.5);
  const minAng = (m / 60) * 360;

  // Drag logic
  const getAng = (e) => {
    const rect = faceRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width/2;
    const cy = rect.top + rect.height/2;
    const p = (e.touches && e.touches[0]) ? e.touches[0] : e;
    const dx = p.clientX - cx, dy = p.clientY - cy;
    let ang = Math.atan2(dy, dx) * 180/Math.PI + 90;
    if (ang < 0) ang += 360;
    return ang;
  };

  React.useEffect(() => {
    if (!drag) return;
    const move = (e) => {
      e.preventDefault();
      onSetAngle && onSetAngle(getAng(e), drag, true);
      // live visual rotation handled below via transform on the hand
      const el = document.querySelector(`[data-clock-hand="${drag}"][data-clock-id="${faceRef.current.dataset.clockId}"]`);
      if (el) el.style.transform = `rotate(${getAng(e)}deg)`;
    };
    const start = (e) => {
      // Only used to kick off drag from face-level mousedown
    };
    const up = () => {
      if (drag) onSetAngle && onSetAngle(
        parseFloat(document.querySelector(`[data-clock-hand="${drag}"][data-clock-id="${faceRef.current.dataset.clockId}"]`).style.transform.replace(/[^\d.-]/g,'')) || 0,
        drag, false);
      setDrag(null);
    };
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

  // Choose which hand to act on given click/drag point.
  // If two hands are angularly close (within 20°), disambiguate by radius:
  //   outer 55% of the face → minute hand; inner → hour hand.
  const pickHandAt = (e) => {
    const rect = faceRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width/2;
    const cy = rect.top + rect.height/2;
    const p = (e.touches && e.touches[0]) ? e.touches[0] : e;
    const dx = p.clientX - cx, dy = p.clientY - cy;
    const r = Math.sqrt(dx*dx + dy*dy);
    let ang = Math.atan2(dy, dx) * 180/Math.PI + 90;
    if (ang < 0) ang += 360;
    const dAng = (a, b) => { let d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
    const dH = dAng(ang, hourAng);
    const dM = dAng(ang, minAng);
    const close = Math.abs(dH - dM) < 20 || (dH < 25 && dM < 25);
    if (close) {
      const outer = r > R * 0.55;
      return outer ? 'minute' : 'hour';
    }
    return dH < dM ? 'hour' : 'minute';
  };

  const onFaceClick = (e) => {
    if (!interactive || drag) return;
    if (e.target.closest('[data-nodrag]')) return;
    const ang = getAng(e);
    const which = pickHandAt(e);
    onPickHand && onPickHand(which);
    onSetAngle && onSetAngle(ang, which, false);
  };

  const onFaceDown = (e) => {
    if (!interactive) return;
    if (e.target.closest('[data-nodrag]')) return;
    e.preventDefault();
    const which = pickHandAt(e);
    onPickHand && onPickHand(which);
    setDrag(which);
  };

  const clockId = React.useMemo(() => 'c' + Math.random().toString(36).slice(2,8), []);

  // Numerals
  const numerals = [];
  const numSize = numeralSize || Math.round(size * 0.075);
  const numR = R - numSize * 1.15;
  const which = showNumerals === 'cardinals' ? [12,3,6,9] : (showNumerals ? [1,2,3,4,5,6,7,8,9,10,11,12] : []);
  for (const i of which) {
    const ang = (i / 12) * 360;
    const rad = (ang - 90) * Math.PI/180;
    const x = R + numR * Math.cos(rad);
    const y = R + numR * Math.sin(rad);
    numerals.push(
      <div key={i} style={{
        position: 'absolute', left: x, top: y,
        transform: 'translate(-50%,-50%)',
        fontFamily: numeralFont, fontWeight: numeralWeight,
        fontSize: numSize, color: theme.numeral || '#2a2418',
        lineHeight: 1, letterSpacing: 0,
        pointerEvents: 'none',
      }}>{i}</div>
    );
  }

  // Ticks
  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0;
    if (!major && !showMinorTicks) continue;
    const rot = (i / 60) * 360;
    const len = major ? majorLen : minorLen;
    const thick = major ? tickThickness : minorThickness;
    ticks.push(
      <div key={i} data-nodrag style={{
        position: 'absolute', left: '50%', top: 0,
        width: thick, height: len,
        background: major ? (theme.tickColor || '#2a2418') : (theme.tickMinor || 'rgba(0,0,0,0.3)'),
        transformOrigin: `${thick/2}px ${R}px`,
        transform: `translateX(-50%) rotate(${rot}deg)`,
        borderRadius: 1,
        pointerEvents: 'none',
      }} />
    );
  }

  // Hand shapes
  const hourLen = Math.round(size * 0.26);
  const minLen = Math.round(size * 0.39);

  const hourHandEl = (() => {
    const base = {
      position: 'absolute', left: '50%', top: '50%',
      transformOrigin: '50% 100%',
      transform: `rotate(${hourAng}deg)`,
      transition: drag === 'hour' ? 'none' : 'transform .55s cubic-bezier(.34,1.56,.64,1)',
      background: theme.hourHand || '#2a2418',
    };
    if (handStyle === 'chunky') {
      return <div data-clock-id={clockId} data-clock-hand="hour" style={{
        ...base, width: 11, height: hourLen, marginLeft: -5.5, marginTop: -hourLen,
        borderRadius: 6, cursor: interactive ? 'grab' : 'default',
      }}
      />;
    }
    if (handStyle === 'arrow') {
      return <div data-clock-id={clockId} data-clock-hand="hour" style={{
        ...base, width: 10, height: hourLen,
        marginLeft: -5, marginTop: -hourLen, background: 'transparent',
        pointerEvents: 'none',
      }}>
        <div style={{
          width: '100%', height: '100%',
          background: theme.hourHand || '#2a2418',
          clipPath: 'polygon(50% 0, 100% 18%, 100% 100%, 0 100%, 0 18%)',
        }} />
      </div>;
    }
    return <div data-clock-id={clockId} data-clock-hand="hour" style={{
      ...base, width: 6, height: hourLen, marginLeft: -3, marginTop: -hourLen,
      borderRadius: 3, pointerEvents: 'none',
    }} />;
  })();

  const minHandEl = (() => {
    const base = {
      position: 'absolute', left: '50%', top: '50%',
      transformOrigin: '50% 100%',
      transform: `rotate(${minAng}deg)`,
      transition: drag === 'minute' ? 'none' : 'transform .55s cubic-bezier(.34,1.56,.64,1)',
      background: theme.minHand || '#e8590c',
    };
    if (handStyle === 'chunky') {
      return <div data-clock-id={clockId} data-clock-hand="minute" style={{
        ...base, width: 8, height: minLen, marginLeft: -4, marginTop: -minLen,
        borderRadius: 4, pointerEvents: 'none',
      }} />;
    }
    if (handStyle === 'arrow') {
      return <div data-clock-id={clockId} data-clock-hand="minute" style={{
        ...base, width: 8, height: minLen, marginLeft: -4, marginTop: -minLen,
        background: 'transparent', pointerEvents: 'none',
      }}>
        <div style={{
          width: '100%', height: '100%',
          background: theme.minHand || '#e8590c',
          clipPath: 'polygon(50% 0, 100% 12%, 100% 100%, 0 100%, 0 12%)',
        }} />
      </div>;
    }
    return <div data-clock-id={clockId} data-clock-hand="minute" style={{
      ...base, width: 4, height: minLen, marginLeft: -2, marginTop: -minLen,
      borderRadius: 2, pointerEvents: 'none',
    }} />;
  })();

  return (
    <div
      ref={faceRef}
      data-clock-id={clockId}
      onClick={onFaceClick}
      onMouseDown={onFaceDown}
      onTouchStart={onFaceDown}
      style={{
        width: size, height: size, position: 'relative',
        touchAction: 'none', userSelect: 'none',
        cursor: interactive ? 'grab' : 'default',
      }}
    >
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: theme.face || '#fffef5',
        border: theme.border || '1.5px solid #2a2418',
        boxShadow: theme.faceShadow || 'none',
      }} />
      {ticks}
      {numerals}
      {overlay}
      {hourHandEl}
      {minHandEl}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        width: 10, height: 10, margin: '-5px 0 0 -5px',
        borderRadius: '50%', background: theme.pivot || '#2a2418',
        border: `2px solid ${theme.face || '#fffef5'}`,
        boxShadow: `0 0 0 1px ${theme.pivot || '#2a2418'}`,
        zIndex: 3, pointerEvents: 'none',
      }} />
    </div>
  );
}

Object.assign(window, { Clock });
