// Flat "film language" primitives for the box opening.
//
// Nothing here glows, blurs, haloes or uses radial/conic/diagonal gradients.
// Every effect is a hard-edged solid shape, a type treatment, or an edit
// (cut, wipe, shutter, hit-stop, shake) -- the same restraint as the rest of
// the v2 UI. Drama comes from timing and structure, not light.
import { useEffect, useMemo, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';

export const rand = (a, b) => a + Math.random() * (b - a);

// Respect prefers-reduced-motion: callers drop flashes + shake when true.
export function usePrefersCalm() {
  const [calm] = useState(() => {
    try { return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  });
  return calm;
}

// Camera shake with a decaying envelope. shake(amp) retriggers.
export function useShake(calm = false) {
  const controls = useAnimation();
  const shake = (a = 10) => {
    if (calm || !a) return;
    controls.start({
      x: [0, -a, a, -a * 0.7, a * 0.6, -a * 0.35, a * 0.2, 0],
      y: [0, a * 0.5, -a * 0.6, a * 0.4, -a * 0.3, a * 0.2, 0, 0],
      transition: { duration: 0.42, ease: 'easeOut' },
    });
  };
  return { controls, shake };
}

// One wide panel that wipes across with a hard edge (enter from left, leave right).
export function WipePanel({ color, show, ms = 0.22, z = 10 }) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{ background: color, zIndex: z, transformOrigin: show ? '0% 50%' : '100% 50%' }}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: show ? 1 : 0 }}
      transition={{ duration: ms, ease: [0.7, 0, 0.3, 1] }}
    />
  );
}

// Vertical blinds. closed=true drops them down; closed=false lifts them away.
export function Shutters({ color, n = 6, closed, ms = 0.26, z = 70 }) {
  return (
    <div className="absolute inset-0 flex pointer-events-none" style={{ zIndex: z }}>
      {Array.from({ length: n }).map((_, i) => (
        <motion.div
          key={i}
          className="h-full"
          style={{ flex: '1 0 0', marginRight: -0.5, background: color, transformOrigin: closed ? '50% 0%' : '50% 100%' }}
          initial={{ scaleY: closed ? 0 : 1 }}
          animate={{ scaleY: closed ? 1 : 0 }}
          transition={{ duration: ms, delay: i * 0.035, ease: [0.7, 0, 0.3, 1] }}
        />
      ))}
    </div>
  );
}

// Thin flat horizontal streaks, anime speed-line style.
export function SpeedLines({ color, count = 14, delay = 0, dir = 1, z = 20 }) {
  const lines = useMemo(() => Array.from({ length: count }).map(() => ({
    y: rand(3, 97), h: rand(2, 7), w: rand(18, 58), d: rand(0.26, 0.6), at: delay + rand(0, 0.25), o: rand(0.55, 1),
  })), [count, delay]);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: z }}>
      {lines.map((l, i) => (
        <motion.div
          key={i}
          className="absolute left-0"
          style={{ top: `${l.y}%`, height: l.h, width: `${l.w}vw`, background: color, opacity: l.o }}
          initial={{ x: dir > 0 ? '-60vw' : '110vw' }}
          animate={{ x: dir > 0 ? '110vw' : '-60vw' }}
          transition={{ duration: l.d, delay: l.at, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}

// Giant type rows scrolling in opposite directions (editorial, not glow).
// `outline` draws the letters as a hairline stroke with a hollow centre -- the
// premium "it's only an outline" look the reveal leans on; otherwise solid/tonal.
export function Marquee({ text, color, rows = 3, speed = 24, z = 2, outline = false, strokeW = 2 }) {
  const word = `${text} · `.repeat(12);
  const typeStyle = outline
    ? { color: 'transparent', WebkitTextStroke: `${strokeW}px ${color}`, textStroke: `${strokeW}px ${color}` }
    : { color };
  return (
    <div className="absolute inset-0 overflow-hidden flex flex-col justify-center pointer-events-none select-none" style={{ zIndex: z }}>
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div
          key={i}
          className="whitespace-nowrap font-['Archivo',sans-serif] font-black uppercase"
          style={{ ...typeStyle, fontSize: 'clamp(72px, 21vw, 132px)', lineHeight: 0.92, letterSpacing: '-0.02em' }}
          initial={{ x: i % 2 ? '-50%' : '0%' }}
          animate={{ x: i % 2 ? '0%' : '-50%' }}
          transition={{ duration: speed + i * 3, ease: 'linear', repeat: Infinity }}
        >
          {word}
        </motion.div>
      ))}
    </div>
  );
}

// Cinema bars.
export function Letterbox({ show, h = 11, z = 75 }) {
  const style = { height: 0, zIndex: z };
  return (
    <>
      <motion.div className="absolute left-0 right-0 top-0 bg-black pointer-events-none" style={style}
        initial={{ height: 0 }} animate={{ height: show ? `${h}vh` : 0 }} transition={{ duration: 0.4, ease: [0.7, 0, 0.3, 1] }} />
      <motion.div className="absolute left-0 right-0 bottom-0 bg-black pointer-events-none" style={style}
        initial={{ height: 0 }} animate={{ height: show ? `${h}vh` : 0 }} transition={{ duration: 0.4, ease: [0.7, 0, 0.3, 1] }} />
    </>
  );
}

// A run of solid full-screen frames, each held for `ms` -- a hard-cut flash.
// Keep total flashes <= 3 per second (photosensitivity guideline).
export function FlashFrames({ frames, z = 90, onDone }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i >= frames.length) { onDone?.(); return undefined; }
    const id = setTimeout(() => setI((n) => n + 1), frames[i].ms);
    return () => clearTimeout(id);
  }, [i, frames, onDone]);
  if (i >= frames.length) return null;
  return <div className="absolute inset-0 pointer-events-none" style={{ background: frames[i].color, zIndex: z }} />;
}

// Flat falling confetti: triangles / bars / squares in the on-system palette.
export function Confetti({ colors, count = 26, delay = 0, z = 30 }) {
  // key on the colour VALUES, not the array identity: a fresh literal each parent
  // render must not reshuffle the pieces mid-fall.
  const colorKey = colors.join(',');
  const bits = useMemo(() => Array.from({ length: count }).map((_, i) => ({
    x: rand(-46, 46), y0: rand(-6, 6), fall: rand(55, 110), w: rand(6, 14), h: rand(6, 18),
    r: rand(-540, 540), d: rand(1.6, 2.8), at: delay + rand(0, 0.3), shape: i % 3, c: colors[i % colors.length],
  })), [count, delay, colorKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: z }}>
      {bits.map((b, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-[44%]"
          style={{
            width: b.w, height: b.shape === 1 ? 3 : b.h, background: b.c,
            clipPath: b.shape === 0 ? 'polygon(50% 0, 100% 100%, 0 100%)' : 'none',
          }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 0 }}
          animate={{
            x: `${b.x}vw`,
            y: [`${b.y0}vh`, `${-b.fall * 0.35}vh`, `${b.fall * 0.6}vh`],
            rotate: b.r,
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: b.d, delay: b.at, ease: 'easeOut',
            y: { duration: b.d, delay: b.at, ease: 'easeOut', times: [0, 0.45, 1] },
            opacity: { duration: b.d, delay: b.at, times: [0, 0.08, 0.75, 1] },
          }}
        />
      ))}
    </div>
  );
}
