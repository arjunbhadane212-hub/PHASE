// =============================================================================
// BoxOpening (v7).
//   CHARGE   tap 3x to pry the parcel open. Each tap lifts the lid, widens the
//            seam and lets a column of the tier's light rise; the final tap
//            blows the lid off and the box lifts away. (This is the calmer
//            pre-cinematic open the user preferred -- no shatter, no hard flash.)
//   WALK     items walk out one at a time, WORST FIRST so the best pull is the
//            finale. Every item plays its own walkout (components/boxopen/Walkout)
//            and waits for a tap.
//   SUMMARY  everything you got, best first, then Continue.
//
// Visual language: solid fills, hard edges, type. No glow, no blur, no radial.
// =============================================================================
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Gem } from 'lucide-react';
import { soundEngine } from '../utils/SoundEngine';
import PhaseBoxArt, { tierFor } from './PhaseBoxArt';
import Walkout from './boxopen/Walkout';
import { tierOf, kindOf, displayName, MiniArt, KIND_LABEL } from './boxopen/Hero';
import { useShake, usePrefersCalm } from './boxopen/fx';

const STAGE_BG = '#0E1012';
const CRACKS_NEEDED = 3;
const FONT_DISPLAY = "'Archivo', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";
const haptic = (p) => { try { navigator.vibrate?.(p); } catch { /* unsupported */ } };

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
  const [opened, setOpened] = useState(false);
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

  const boxPx = typeof window !== 'undefined' ? Math.min(window.innerWidth * 0.76, 320) : 320;

  const onTap = useCallback(() => {
    if (phase !== 'charge' || opened) return;
    const next = charge + 1;
    setCharge(next);
    soundEngine.boxTap?.(next - 1);
    shake(next >= CRACKS_NEEDED ? 10 : 6);
    if (next >= CRACKS_NEEDED) {
      setOpened(true);
      soundEngine.boxOpen?.();
      haptic([60, 30, 120]);
      at(620, () => setPhase(walkItems.length ? 'walk' : 'summary'));
    } else {
      haptic([30]);
    }
  }, [phase, opened, charge, walkItems.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const nextWalk = useCallback(() => {
    setIdx((i) => {
      if (i + 1 < walkItems.length) return i + 1;
      setPhase('summary');
      return i;
    });
  }, [walkItems.length]);

  const lidLift = opened ? 1.9 : charge * 0.34;   // lid pries up per tap, blows off on open
  const lidSpin = opened ? -22 : 0;
  const beam = opened ? 1 : charge * 0.32;         // rising light column intensity
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
          <div className="relative flex items-center justify-center" style={{ width: boxPx, height: boxPx }}>
            {/* rising light column from the lid seam (flat solid bar, no blur) */}
            <motion.div
              className="absolute pointer-events-none"
              style={{ width: opened ? 8 : 4, height: '150%', top: '-42%', background: t.accent }}
              animate={{ opacity: beam, scaleY: opened ? [1, 1.25] : 1 }}
              transition={{ duration: opened ? 0.6 : 0.3 }}
            />
            {/* floor shadow: flat tonal slab */}
            <div className="absolute left-1/2" style={{ bottom: '2%', width: '60%', height: 14, marginLeft: '-30%', background: '#090B0D', borderRadius: 999 }} />

            {/* the box */}
            <motion.div
              onClick={onTap} role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onTap(); }}
              className="relative cursor-pointer select-none w-full h-full"
              animate={opened ? { scale: [1, 1.06, 1.16], opacity: [1, 1, 0] } : { scale: 1 }}
              transition={opened ? { duration: 0.6, ease: 'easeIn' } : { type: 'spring', stiffness: 420, damping: 16 }}
              key={opened ? 'open' : 'closed'}
              data-testid="opening-box"
            >
              <PhaseBoxArt tier={boxId} className="w-full h-full" lidLift={lidLift} lidSpin={lidSpin} />
            </motion.div>
          </div>

          {/* prompt + hit pips */}
          {!opened && (
            <div className="flex flex-col items-center" style={{ marginTop: 44, gap: 14 }}>
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
    </motion.div>,
    document.body,
  );
}
