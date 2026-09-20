// =============================================================================
// BoxOpening (v3 — "solid object" redesign).
//   1. CHARGE: the real graphite parcel (PhaseBoxArt). Each tap nudges + adds a
//      clean seam crack; the 3rd tap opens it.
//   2. REVEAL: items come out ONE AT A TIME on flat, elevated reward cards. A
//      top-tier (ultra) pull comes in larger with a calm accent ring — no
//      strobe flash, no rotating rays.
//   3. DONE: all items in a row + Continue.
// Calm dark stage, flat cards, real elevation — matches the rest of the v2 UI.
// Interaction + timings preserved; only the look/feel changed.
// =============================================================================
import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, Star } from 'lucide-react';
import { soundEngine } from '../utils/SoundEngine';
import PhaseBoxArt, { tierFor } from './PhaseBoxArt';
import { ShopItemIcon } from './ShopIcons';

// On-system reward accents: common = steel, rare = cyan, ultra = lime (the
// "win" colour, same as completed habits). No neon, no glow.
const TIER_COLOR = { common: '#9BA09C', rare: '#95DEE6', ultra: '#DBF67F' };
const TIER_LABEL = { common: 'COMMON', rare: 'RARE', ultra: 'ULTRA-RARE' };
const STAGE_BG = '#0E1012'; // page background — constant in both themes
const CRACKS_NEEDED = 3;

const haptic = (p) => { try { navigator.vibrate?.(p); } catch { /* unsupported */ } };

// ---------- reward icon ----------
function RewardIcon({ item, color, size = 'w-8 h-8' }) {
  if (item.type === 'gems') return <Gem className={size} style={{ color }} strokeWidth={2.2} />;
  const k = item.item_key || '';
  if (k === 'streak_shield' || k === 'streak_revive' || k.startsWith('boost_xp_')) {
    return <span style={{ color }}><ShopItemIcon itemKey={k} className={size} /></span>;
  }
  if (item.tier === 'ultra') return <Star className={size} style={{ color }} fill={color} strokeWidth={0} />;
  return (
    <svg viewBox="0 0 24 24" className={size} aria-hidden="true">
      <path d="M4 9 L12 5 L20 9 L20 18 L12 22 L4 18 Z M4 9 L12 13 L20 9 M12 13 L12 22"
        fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ---------- crack overlay (clean accent seams, no glow) ----------
function CrackOverlay({ level, color }) {
  const cracks = [
    'M60 24 L57 50 L63 74 L60 100',
    'M60 56 L36 68 L27 90',
    'M60 52 L86 62 L96 84',
  ];
  return (
    <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full pointer-events-none">
      {cracks.slice(0, level).map((d, i) => (
        <path key={i} d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
      ))}
    </svg>
  );
}

// ---------- reward card (flat + elevated; center stage + docked chip) ----------
function RewardCard({ item, chip = false }) {
  const color = TIER_COLOR[item.tier] || TIER_COLOR.common;
  const accented = item.tier === 'rare' || item.tier === 'ultra';
  return (
    <div
      className={`relative flex flex-col items-center ${chip ? 'px-3 py-3 w-[92px]' : 'px-5 py-6 w-[180px]'}`}
      style={{
        background: 'var(--gm-card)',
        border: `1.5px solid ${accented ? color : 'var(--gm-track)'}`,
        borderRadius: chip ? 14 : 20,
        boxShadow: 'var(--gm-shadow-card)',
      }}
    >
      <div className={`absolute top-1.5 right-1.5 rounded-md px-1.5 py-0.5 ${chip ? 'hidden' : ''}`}
        style={{ background: 'var(--gm-badge)' }}>
        <span className="text-[8px] font-black uppercase tracking-[0.16em]" style={{ color }}>
          {TIER_LABEL[item.tier]}
        </span>
      </div>
      <RewardIcon item={item} color={color} size={chip ? 'w-6 h-6' : 'w-10 h-10'} />
      <p className={`font-['General_Sans',sans-serif] font-bold text-center leading-tight mt-2 ${chip ? 'text-[10px]' : 'text-sm'}`}
        style={{ color: 'var(--gm-ink)' }}>
        {item.type === 'gems' && item.amount ? `+${item.amount} Gems` : item.name}
      </p>
    </div>
  );
}

// ---------- calm accent ring behind an ultra reveal (expand + fade) ----------
function AccentRing({ color }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ width: 150, height: 150, border: `2px solid ${color}` }}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: [0, 0.55, 0], scale: [0.4, 1.7, 2.1] }}
      transition={{ duration: 1.6, ease: 'easeOut' }}
    />
  );
}

// =============================================================================
export default function BoxOpening({ boxId, rolledItems, onContinue }) {
  const [phase, setPhase] = useState('charge'); // charge | reveal | done
  const [charge, setCharge] = useState(0);
  const [shown, setShown] = useState([]);
  const [current, setCurrent] = useState(null); // { item, big }
  const alive = useRef(true);
  const timers = useRef([]);

  const t = tierFor(boxId);

  useEffect(() => {
    alive.current = true;
    const list = timers.current;
    return () => { alive.current = false; list.forEach(clearTimeout); };
  }, []);
  const after = (ms, fn) => { const id = setTimeout(() => { if (alive.current) fn(); }, ms); timers.current.push(id); };

  const step = useCallback((i) => {
    if (i >= rolledItems.length) { setPhase('done'); return; }
    const item = rolledItems[i];
    const big = item.tier === 'ultra';
    if (big) { haptic([40, 40, 120]); soundEngine.urFlourish?.(); }
    else { haptic([25]); }
    setCurrent({ item, big });
    after(big ? 1900 : 950, () => {
      setShown((prev) => [...prev, item]);
      setCurrent(null);
      after(300, () => step(i + 1));
    });
  }, [rolledItems]);

  const onTap = useCallback(() => {
    if (phase !== 'charge') return;
    const next = charge + 1;
    setCharge(next);
    soundEngine.boxCrack?.();
    if (next >= CRACKS_NEEDED) {
      haptic([60, 30, 140]);
      after(320, () => { setPhase('reveal'); step(0); });
    } else {
      haptic([30]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, charge, step]);

  const boxScale = 0.84 + charge * 0.14; // 0.84, 0.98, 1.12, then open
  const promptText = charge === 0 ? 'Tap to open' : charge < CRACKS_NEEDED ? 'Keep tapping' : '';

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: STAGE_BG }}
      data-testid="box-opening-screen"
    >
      {/* CHARGE */}
      {phase === 'charge' && (
        <div className="flex flex-col items-center">
          <motion.div
            onClick={onTap} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onTap(); }}
            animate={{ scale: boxScale }}
            transition={{ type: 'spring', stiffness: 320, damping: 14 }}
            className="relative cursor-pointer select-none"
            style={{ width: 'min(70vw, 300px)', height: 'min(70vw, 300px)' }}
            data-testid="opening-box"
          >
            <motion.div key={charge} animate={charge > 0 ? { x: [0, -6, 6, -3, 3, 0] } : {}} transition={{ duration: 0.32 }} className="w-full h-full">
              <PhaseBoxArt tier={boxId} className="w-full h-full" />
            </motion.div>
            <CrackOverlay level={charge} color={t.accent} />
          </motion.div>
          {promptText && (
            <motion.p
              key={promptText}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="mt-12 font-['JetBrains_Mono',monospace] text-[12px] uppercase tracking-[0.28em]"
              style={{ color: charge > 0 ? t.accent : 'rgba(244,245,242,0.5)' }}
              data-testid="opening-tap-prompt"
            >
              {promptText}
            </motion.p>
          )}
        </div>
      )}

      {/* REVEAL / DONE */}
      {phase !== 'charge' && (
        <div className="w-full max-w-md px-6 flex flex-col items-center justify-center">
          {/* current center-stage item */}
          <div className="relative flex items-center justify-center" style={{ minHeight: 220 }}>
            <AnimatePresence mode="wait">
              {current && (
                <motion.div
                  key={`cur-${shown.length}`}
                  initial={{ scale: 0, opacity: 0, y: 20 }}
                  animate={current.big
                    ? { scale: [0, 1.6, 1.1], opacity: 1, y: 0 }
                    : { scale: [0, 1.12, 1], opacity: 1, y: 0 }}
                  transition={current.big
                    ? { duration: 1.7, times: [0, 0.5, 1], ease: 'easeOut' }
                    : { duration: 0.55, times: [0, 0.6, 1], ease: 'easeOut' }}
                  className="relative flex items-center justify-center"
                >
                  {current.big && <AccentRing color={TIER_COLOR.ultra} />}
                  <RewardCard item={current.item} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* collected row */}
          {shown.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6" data-testid="rewards-grid">
              {shown.map((it, i) => (
                <motion.div key={i} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 22 }}>
                  <RewardCard item={it} chip />
                </motion.div>
              ))}
            </div>
          )}

          {/* Continue */}
          <AnimatePresence>
            {phase === 'done' && (
              <motion.button
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                onClick={onContinue}
                className="mt-9 px-10 py-3 rounded-2xl font-['General_Sans',sans-serif] font-bold text-sm transition-transform active:scale-[0.97] bg-[#95DEE6] text-[#183A3F]"
                style={{ letterSpacing: '0.08em' }}
                data-testid="opening-continue-btn"
              >
                Continue
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>,
    document.body
  );
}
