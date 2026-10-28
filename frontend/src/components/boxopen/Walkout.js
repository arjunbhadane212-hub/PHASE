// One unified walkout for every pulled item.
//
//   common        quiet: a neutral dark field slides in, the item lands, a small
//                 label underneath. No giant type (rarity ceremony starts at rare).
//   rare+         the "delta rare" treatment the user loves, now for EVERY tier
//                 rare/legendary/mythic -- only the colour + word change:
//                   * the whole background is the tier's SOLID colour, wiped in
//                   * a GIANT OUTLINE-ONLY rarity word slides across (the wind)
//                   * a bold bar underlines it (the "other graphic")
//                   * the item lands in front, its rarity word stamped below
//                 mythic adds flat confetti; otherwise it's the same, by design.
//
// Every item waits for a TAP to continue, so people can sit on a good pull.
// Flat only: solid fills, hard edges, type, outlines. No glow / blur / radial.
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem } from 'lucide-react';
import { soundEngine } from '../../utils/SoundEngine';
import { Hero, tierOf, kindOf, displayName, KIND_LABEL } from './Hero';
import { Marquee, SpeedLines, Confetti, useShake } from './fx';

const FONT_DISPLAY = "'Archivo', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";
const alpha = (hex, a) => `${hex}${Math.round(a * 255).toString(16).padStart(2, '0')}`;
const haptic = (p) => { try { navigator.vibrate?.(p); } catch { /* unsupported */ } };

// timeline helper: at(ms, fn), all cleared on unmount
function useSchedule() {
  const ids = useRef([]);
  useEffect(() => { const list = ids.current; return () => list.forEach(clearTimeout); }, []);
  return useCallback((ms, fn) => { ids.current.push(setTimeout(fn, ms)); }, []);
}

// refund number that counts up
function CountUp({ to, delay = 0 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf; let start;
    const id = setTimeout(() => {
      const tick = (t) => {
        if (start == null) start = t;
        const p = Math.min((t - start) / 650, 1);
        setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(id); cancelAnimationFrame(raf); };
  }, [to, delay]);
  return <>{n}</>;
}

export default function Walkout({ item, onDone, calm, index = 0, total = 1 }) {
  const T = tierOf(item.tier);
  const ceremony = T.level >= 1;              // rare and above get the full treatment
  const mythic = T.level === 3;
  const kind = kindOf(item);
  const at = useSchedule();
  const { controls, shake } = useShake(calm);

  const [field, setField] = useState(false);   // solid colour panel wiped in
  const [hero, setHero] = useState(false);      // item on stage
  const [canTap, setCanTap] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);

  // on a tier-colour field the readable ink is T.ink; the common field is dark.
  const bg = ceremony ? T.color : '#16191C';
  const ink = ceremony ? T.ink : '#F4F5F2';
  const chipBg = ceremony ? T.ink : '#2E3235';
  const chipInk = ceremony ? T.color : '#F4F5F2';

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setLeaving(true);
    soundEngine.slide?.(0.3);
    setTimeout(onDone, 300);
  }, [onDone]);

  useEffect(() => {
    soundEngine.slide?.(ceremony ? 0.42 : 0.3);
    setField(true);
    at(ceremony ? 300 : 210, () => {
      setHero(true);
      soundEngine.reveal?.(item.tier);
      shake(mythic ? 12 : ceremony ? 7 : 3);
      haptic(mythic ? [30, 40, 90] : ceremony ? [22] : [10]);
    });
    at(ceremony ? 720 : 560, () => setCanTap(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = () => { if (canTap && !leaving) finish(); };

  return (
    <div
      className="absolute inset-0 overflow-hidden select-none"
      style={{ background: '#0E1012' }}
      onClick={tap}
      data-testid="walkout"
      data-tier={item.tier}
    >
      {/* solid colour field wipes in from the left (the slide / wind) */}
      <motion.div
        className="absolute inset-0"
        style={{ background: bg, transformOrigin: leaving ? '100% 50%' : '0% 50%' }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: field && !leaving ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.7, 0, 0.3, 1] }}
      />

      {/* GIANT outline-only rarity word sliding across + the underline bar */}
      {ceremony && field && !leaving && (
        <>
          <Marquee text={T.label} color={alpha(T.ink, 0.5)} rows={3} outline strokeW={2} z={2} />
          <motion.div
            className="absolute left-0"
            style={{ top: '58%', height: mythic ? 14 : 10, background: T.ink, zIndex: 3, transformOrigin: '0% 50%' }}
            initial={{ scaleX: 0, width: '100%' }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.4, ease: [0.7, 0, 0.3, 1], delay: 0.08 }}
          />
          <motion.div
            className="absolute left-0"
            style={{ top: 'calc(58% + 20px)', height: 3, background: alpha(T.ink, 0.45), zIndex: 3, transformOrigin: '0% 50%' }}
            initial={{ scaleX: 0, width: '100%' }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, ease: [0.7, 0, 0.3, 1], delay: 0.16 }}
          />
        </>
      )}

      {/* wind streaks + mythic confetti as the item lands */}
      {ceremony && hero && <SpeedLines color={alpha(T.ink, 0.5)} count={mythic ? 16 : 11} z={4} />}
      {mythic && hero && <Confetti colors={[T.ink, '#0E1012', alpha(T.ink, 0.6)]} count={26} delay={0.04} z={5} />}

      {/* stage */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center px-6"
        style={{ zIndex: 30, gap: 18 }}
        animate={controls}
      >
        <AnimatePresence>
          {hero && !leaving && (
            <motion.div
              key="hero"
              className="flex flex-col items-center"
              style={{ gap: 16 }}
              initial={{ y: ceremony ? 40 : 14, scale: ceremony ? (mythic ? 1.25 : 1.15) : 0.92, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: -24, opacity: 0, transition: { duration: 0.16 } }}
              transition={{ duration: ceremony ? 0.3 : 0.26, ease: [0.2, 0.9, 0.2, 1] }}
            >
              <Hero item={item} scale={mythic ? 1.4 : ceremony ? 1.2 : 1} />

              {/* label + name + status, stamped below the item */}
              <div className="flex flex-col items-center" style={{ gap: 10, marginTop: 4 }}>
                <motion.div
                  initial={{ scale: calm ? 1 : 1.8, opacity: 0, rotate: calm ? 0 : -4 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ delay: 0.06, duration: 0.2, ease: [0.2, 0.9, 0.2, 1] }}
                  style={{ background: chipBg, color: chipInk, borderRadius: 999, padding: '7px 18px', fontFamily: FONT_MONO, fontWeight: 700, fontSize: 12, letterSpacing: '0.28em' }}
                >
                  {T.label}
                </motion.div>

                {kind !== 'title' && (
                  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 'clamp(24px, 7vw, 34px)', lineHeight: 1, letterSpacing: '-0.015em', textTransform: 'uppercase', color: ink, textAlign: 'center' }}>
                    {displayName(item)}
                  </div>
                )}

                {item.duplicate ? (
                  <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 12, letterSpacing: '0.18em', color: ink, display: 'flex', alignItems: 'center', gap: 6 }}>
                    ALREADY OWNED &middot; +<CountUp to={item.refund || 0} delay={180} />
                    <Gem size={13} strokeWidth={2.4} />
                  </div>
                ) : (
                  <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 11, letterSpacing: '0.24em', color: alpha(ink, 0.75) }}>
                    NEW &middot; {KIND_LABEL[kind]}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* pull counter */}
      {total > 1 && (
        <div
          className="absolute"
          style={{ top: 18, left: 20, zIndex: 80, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 10, letterSpacing: '0.22em', color: alpha(ceremony ? T.ink : '#F4F5F2', 0.6) }}
        >
          PULL {index + 1}/{total}
        </div>
      )}

      {/* tap prompt: hard blink, no glow */}
      <AnimatePresence>
        {canTap && !leaving && (
          <motion.div
            className="absolute left-0 right-0 text-center"
            style={{ bottom: '7vh', zIndex: 80, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 11, letterSpacing: '0.3em', color: ceremony ? T.ink : '#F4F5F2' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0.25, 1, 1, 0.25] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'linear', times: [0, 0.1, 0.5, 0.52, 0.6, 0.98, 1] }}
          >
            TAP TO CONTINUE
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
