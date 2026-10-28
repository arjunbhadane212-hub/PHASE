// =============================================================================
// BoxOpening (v6) -- cinematic, flat, no glow.
//
//   CHARGE   tap 3x. Each hit pushes the camera in, shakes the frame, throws
//            chips, and draws a jagged crack with a flat accent seam through it.
//            The last hit holds for a hit-stop, then the box shatters into flat
//            shards (real gravity) and a hard-cut flash takes the screen.
//   WALK     items walk out one at a time, WORST FIRST so the best pull is the
//            finale. Every item plays its own walkout (components/boxopen/Walkout)
//            scaled to its rarity and rendered with its real art.
//   SUMMARY  everything you got, best first, then Continue.
//
// Visual language: solid fills, hard edges, type, cuts, wipes, shutters, shake.
// No glow, no blur, no radial / conic gradients, no rings.
// =============================================================================
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Gem } from 'lucide-react';
import { soundEngine } from '../utils/SoundEngine';
import PhaseBoxArt, { tierFor } from './PhaseBoxArt';
import Walkout from './boxopen/Walkout';
import { tierOf, kindOf, displayName, MiniArt, KIND_LABEL } from './boxopen/Hero';
import { useShake, FlashFrames, usePrefersCalm, rand } from './boxopen/fx';

const STAGE_BG = '#0E1012';
const CRACKS_NEEDED = 3;
const FONT_DISPLAY = "'Archivo', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";
const haptic = (p) => { try { navigator.vibrate?.(p); } catch { /* unsupported */ } };

// jagged crack paths in the 120-unit art space, added a layer per tap
const CRACKS = [
  ['M62 19 L58 37 L66 51 L60 66 L64 84 L60 105'],
  ['M60 66 L40 72 L30 87', 'M66 51 L87 47 L99 58'],
  ['M58 37 L40 33 L26 41', 'M64 84 L81 90 L93 83', 'M60 66 L77 75 L85 93', 'M40 72 L36 59'],
];

// the parcel, triangulated into 8 flat shards for the break
const SHARDS = [
  { p: [[60, 15], [102, 39], [60, 39]], tone: 'top' },
  { p: [[102, 39], [60, 63], [60, 39]], tone: 'right' },
  { p: [[60, 63], [18, 39], [60, 39]], tone: 'top' },
  { p: [[18, 39], [60, 15], [60, 39]], tone: 'left' },
  { p: [[18, 40], [60, 64], [60, 106]], tone: 'left' },
  { p: [[18, 40], [60, 106], [18, 82]], tone: 'left' },
  { p: [[60, 64], [102, 40], [102, 82]], tone: 'right' },
  { p: [[60, 64], [102, 82], [60, 106]], tone: 'right' },
];

function Cracks({ level, seam, leak }) {
  return (
    <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
      {CRACKS.slice(0, level).map((set, si) => set.map((d, i) => {
        const main = si === 0 || i === 0;
        return (
          <g key={`${si}-${i}`}>
            {/* the fissure itself: dark, tapered by a thinner second stroke */}
            <motion.path d={d} fill="none" stroke="#07090B" strokeWidth={main ? 2.8 : 1.9} strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.2, delay: i * 0.05, ease: 'easeOut' }} />
            {/* light bursting through -- only on the final hit */}
            {leak && (
              <motion.path d={d} fill="none" stroke={seam} strokeWidth={main ? 1.4 : 1} strokeLinecap="round" strokeLinejoin="round"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.06 }} />
            )}
          </g>
        );
      }))}
    </svg>
  );
}

function Shard({ s, t, size }) {
  const m = useMemo(() => {
    const cx = s.p.reduce((a, q) => a + q[0], 0) / 3;
    const cy = s.p.reduce((a, q) => a + q[1], 0) / 3;
    const ang = Math.atan2(cy - 64, cx - 60) + rand(-0.35, 0.35);
    const dist = rand(0.6, 1.15) * size;
    return { cx, cy, dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist, rot: rand(-280, 280) };
  }, [s, size]);
  const clip = `polygon(${s.p.map(([x, y]) => `${(x / 1.2).toFixed(1)}% ${(y / 1.2).toFixed(1)}%`).join(',')})`;
  return (
    <motion.div
      className="absolute inset-0"
      style={{ background: t[s.tone], clipPath: clip, transformOrigin: `${(m.cx / 1.2).toFixed(1)}% ${(m.cy / 1.2).toFixed(1)}%` }}
      initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
      animate={{ x: m.dx, y: [0, m.dy - size * 0.25, m.dy + size * 0.9], rotate: m.rot, opacity: [1, 1, 0] }}
      transition={{
        duration: 0.95, ease: 'easeOut',
        y: { duration: 0.95, ease: 'easeOut', times: [0, 0.35, 1] },
        opacity: { duration: 0.95, times: [0, 0.7, 1] },
      }}
    />
  );
}

// little chips knocked off by each hit
function Chips({ burstKey, color, size }) {
  const chips = useMemo(() => Array.from({ length: 7 }).map(() => ({
    a: rand(0, Math.PI * 2), d: rand(0.25, 0.6) * size, w: rand(5, 11), tone: Math.random() < 0.45,
    rot: rand(-300, 300),
  })), [burstKey]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!burstKey) return null;
  return (
    <>
      {chips.map((c, i) => (
        <motion.div
          key={`${burstKey}-${i}`}
          className="absolute"
          style={{ left: '50%', top: '56%', width: c.w, height: c.w, background: c.tone ? color : '#2B2F35', clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{ x: Math.cos(c.a) * c.d, y: [0, Math.sin(c.a) * c.d - 36, Math.sin(c.a) * c.d + 70], rotate: c.rot, opacity: [1, 1, 0] }}
          transition={{ duration: 0.6, ease: 'easeOut', y: { duration: 0.6, times: [0, 0.4, 1] }, opacity: { duration: 0.6, times: [0, 0.65, 1] } }}
        />
      ))}
    </>
  );
}

// =============================================================================
export default function BoxOpening({ boxId, rolledItems, onContinue }) {
  const calm = usePrefersCalm();
  const t = tierFor(boxId);

  // worst first, so the best pull is the finale
  const walkItems = useMemo(
    () => [...(rolledItems || [])].sort((a, b) => tierOf(a.tier).level - tierOf(b.tier).level),
    [rolledItems],
  );
  const summaryItems = useMemo(() => [...walkItems].reverse(), [walkItems]);

  const [phase, setPhase] = useState('charge'); // charge | walk | summary
  const [charge, setCharge] = useState(0);
  const [chipKey, setChipKey] = useState(0);
  const [bursting, setBursting] = useState(false);
  const [burst, setBurst] = useState(false);
  const [flash, setFlash] = useState(null);
  const [idx, setIdx] = useState(0);
  const { controls, shake } = useShake(calm);

  const alive = useRef(true);
  const timers = useRef([]);
  useEffect(() => {
    alive.current = true;
    const list = timers.current;
    return () => { alive.current = false; list.forEach(clearTimeout); };
  }, []);
  const at = (ms, fn) => { const id = setTimeout(() => { if (alive.current) fn(); }, ms); timers.current.push(id); };

  const boxPx = typeof window !== 'undefined' ? Math.min(window.innerWidth * 0.7, 300) : 300;

  const onTap = useCallback(() => {
    if (phase !== 'charge' || bursting) return;
    const next = charge + 1;
    setCharge(next);
    setChipKey((k) => k + 1);
    soundEngine.boxCrack?.();
    soundEngine.boxHit?.(0.7 + next * 0.3);
    haptic(next >= CRACKS_NEEDED ? [60, 30, 120] : [30]);
    shake(next === 1 ? 8 : 14);
    if (next >= CRACKS_NEEDED) {
      setBursting(true); // box freezes at full push for the hit-stop
      at(110, () => {
        setBurst(true);
        soundEngine.boxHit?.(1.5);
        soundEngine.whoosh?.(0.3);
        shake(28);
        if (!calm) setFlash([{ color: t.accent, ms: 90 }, { color: STAGE_BG, ms: 60 }]);
      });
      at(640, () => setPhase(walkItems.length ? 'walk' : 'summary'));
    }
  }, [phase, bursting, charge, calm, t.accent, walkItems.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const nextWalk = useCallback(() => {
    setIdx((i) => {
      if (i + 1 < walkItems.length) return i + 1;
      setPhase('summary');
      return i;
    });
  }, [walkItems.length]);

  const prompt = charge === 0 ? 'TAP TO OPEN' : charge === 1 ? 'AGAIN' : 'ONE MORE';
  const best = summaryItems[0];
  const totalRefund = walkItems.reduce((s, it) => s + (it.duplicate ? (it.refund || 0) : 0), 0);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{ background: STAGE_BG }}
      role="dialog" aria-modal="true" aria-label="Opening box"
      data-testid="box-opening-screen"
    >
      {/* ---------------------------- CHARGE ---------------------------- */}
      {phase === 'charge' && (
        <motion.div className="absolute inset-0 flex flex-col items-center justify-center" animate={controls}>
          <div style={{ transform: `scale(${1 + charge * 0.035})`, transition: 'transform .25s cubic-bezier(.2,.9,.2,1)' }}
            className="flex flex-col items-center">
            <div className="relative" style={{ width: boxPx, height: boxPx }}>
              {/* floor shadow: flat tonal slab, not a glow */}
              <div className="absolute left-1/2" style={{ bottom: '4%', width: '62%', height: 14, marginLeft: '-31%', background: '#090B0D', borderRadius: 999 }} />

              {!burst && (
                <motion.div
                  onClick={onTap} role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onTap(); }}
                  className="absolute inset-0 cursor-pointer select-none"
                  animate={charge === 0 ? { scale: [1, 1.02, 1] } : { scale: 1 + charge * 0.07 }}
                  transition={charge === 0 ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } : { type: 'spring', stiffness: 420, damping: 16 }}
                  data-testid="opening-box"
                >
                  <PhaseBoxArt tier={boxId} className="w-full h-full" />
                  <Cracks level={Math.min(charge, CRACKS.length)} seam={t.edge} leak={bursting} />
                </motion.div>
              )}

              {burst && (
                <div className="absolute inset-0" aria-hidden="true">
                  {SHARDS.map((s, i) => <Shard key={i} s={s} t={t} size={boxPx} />)}
                </div>
              )}

              <Chips burstKey={chipKey} color={t.accent} size={boxPx} />
            </div>

            {/* prompt + hit pips */}
            {!bursting && (
              <div className="flex flex-col items-center" style={{ marginTop: 40, gap: 14 }}>
                <motion.div key={prompt} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 12, letterSpacing: '0.3em', color: charge ? t.accent : 'rgba(244,245,242,0.55)' }}
                  data-testid="opening-tap-prompt">
                  {prompt}
                </motion.div>
                <div className="flex gap-2">
                  {Array.from({ length: CRACKS_NEEDED }).map((_, i) => (
                    <div key={i} style={{ width: 22, height: 4, background: i < charge ? t.accent : '#2E3235' }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ---------------------------- WALK ---------------------------- */}
      {phase === 'walk' && walkItems[idx] && (
        <>
          <Walkout key={idx} item={walkItems[idx]} index={idx} total={walkItems.length} calm={calm} onDone={nextWalk} />
          <button
            onClick={(e) => { e.stopPropagation(); setPhase('summary'); }}
            className="absolute"
            style={{ top: 14, right: 14, zIndex: 200, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 10, letterSpacing: '0.2em', color: '#9BA09C', background: 'rgba(14,16,18,0.7)', border: '1px solid #2E3235', borderRadius: 999, padding: '6px 12px' }}
            data-testid="opening-skip-btn"
          >
            SKIP
          </button>
        </>
      )}

      {/* ---------------------------- SUMMARY ---------------------------- */}
      {phase === 'summary' && (
        <div className="absolute inset-0 overflow-y-auto" data-testid="rewards-grid">
          <div className="min-h-full flex flex-col items-center justify-center px-5 py-10 mx-auto" style={{ maxWidth: 460 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 11, letterSpacing: '0.28em', color: best ? tierOf(best.tier).color : '#9BA09C' }}>
              {(t.label || '').toUpperCase()} &middot; {summaryItems.length} {summaryItems.length === 1 ? 'ITEM' : 'ITEMS'}
            </motion.div>
            <motion.h2
              initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3, ease: [0.2, 0.9, 0.2, 1] }}
              style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 44, lineHeight: 0.95, letterSpacing: '-0.02em', textTransform: 'uppercase', color: '#F4F5F2', margin: '10px 0 22px', textAlign: 'center' }}>
              {best && tierOf(best.tier).level >= 2 ? `${tierOf(best.tier).label} PULL` : 'YOU GOT'}
            </motion.h2>

            <div className="w-full flex flex-col" style={{ gap: 10 }}>
              {summaryItems.map((it, i) => {
                const T = tierOf(it.tier);
                return (
                  <motion.div
                    key={i}
                    initial={{ x: -26, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.12 + i * 0.09, duration: 0.28, ease: [0.2, 0.9, 0.2, 1] }}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#1F2123', borderRadius: 18, padding: 12, borderLeft: `4px solid ${T.color}` }}
                  >
                    <MiniArt item={it} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 17, color: '#F4F5F2', textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1.05, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {displayName(it)}
                      </div>
                      <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 10, letterSpacing: '0.2em', color: T.color, marginTop: 5 }}>
                        {T.label} &middot; {KIND_LABEL[kindOf(it)]}
                      </div>
                    </div>
                    <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 10, letterSpacing: '0.14em', color: it.duplicate ? '#F4F5F2' : '#9BA09C', display: 'flex', alignItems: 'center', gap: 4, flex: 'none' }}>
                      {it.duplicate ? <>+{it.refund}<Gem size={11} strokeWidth={2.4} /></> : 'NEW'}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {totalRefund > 0 && (
              <div style={{ marginTop: 14, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', color: '#9BA09C', display: 'flex', alignItems: 'center', gap: 5 }}>
                DUPLICATES REFUNDED +{totalRefund}<Gem size={12} strokeWidth={2.4} />
              </div>
            )}

            <motion.button
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + summaryItems.length * 0.09, duration: 0.3 }}
              onClick={onContinue}
              className="active:scale-[0.97] transition-transform"
              style={{ marginTop: 26, padding: '14px 44px', borderRadius: 16, background: '#95DEE6', color: '#183A3F', fontFamily: "'General Sans', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: '0.08em' }}
              data-testid="opening-continue-btn"
            >
              Continue
            </motion.button>
          </div>
        </div>
      )}

      {flash && <FlashFrames key="burst-flash" frames={flash} onDone={() => setFlash(null)} />}
    </motion.div>,
    document.body,
  );
}
