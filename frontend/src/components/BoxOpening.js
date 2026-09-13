// =============================================================================
// BoxOpening — interactive, tap-to-crack loot box opening.
//   1. CHARGE: the real crystal box (PhaseBoxArt). Each tap grows it + adds a
//      crack; on the 3rd tap it bursts open.
//   2. REVEAL: items come out ONE AT A TIME. Commons/rares pop in normally; an
//      ultra (legendary/mythic) triggers a full black-screen flash + giant
//      screen-covering pop that settles next to the others.
//   3. DONE: all items shown in a row + Continue.
// Flat dark stage (no shiny vignette).
// =============================================================================
import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, Star } from 'lucide-react';
import { soundEngine } from '../utils/SoundEngine';
import PhaseBoxArt, { tierFor } from './PhaseBoxArt';
import { ShopItemIcon } from './ShopIcons';

const TIER_COLOR = { common: '#F4F5F2', rare: '#95DEE6', ultra: '#DBF67F' };
const TIER_LABEL = { common: 'COMMON', rare: 'RARE', ultra: 'ULTRA-RARE' };
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

// ---------- crack overlay (grows with charge) ----------
function CrackOverlay({ level, color }) {
  const cracks = [
    'M60 26 L57 52 L63 76 L60 102',
    'M60 58 L36 70 L27 92',
    'M60 54 L86 64 L96 86',
  ];
  return (
    <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full pointer-events-none">
      {cracks.slice(0, level).map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
      ))}
    </svg>
  );
}

// ---------- reward card (center stage + docked chip) ----------
function RewardCard({ item, chip = false }) {
  const color = TIER_COLOR[item.tier] || TIER_COLOR.common;
  const isUltra = item.tier === 'ultra';
  return (
    <div
      className={`relative flex flex-col items-center ${chip ? 'px-3 py-3 w-[92px]' : 'px-5 py-6 w-[180px]'}`}
      style={{
        background: '#0E1216',
        border: `1.5px solid ${isUltra ? color : item.tier === 'rare' ? color : 'rgba(255,255,255,0.16)'}`,
        borderRadius: chip ? 14 : 20,
        boxShadow: isUltra ? `0 0 30px ${color}66` : item.tier === 'rare' ? `0 0 18px ${color}44` : '0 0 12px rgba(255,255,255,0.05)',
      }}
    >
      <div className={`absolute top-1.5 right-1.5 rounded-md px-1.5 py-0.5 ${chip ? 'hidden' : ''}`}
        style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${color}55` }}>
        <span className={`text-[8px] font-black uppercase tracking-[0.16em] ${isUltra ? 'ur-pulse-text' : ''}`} style={{ color }}>
          {TIER_LABEL[item.tier]}
        </span>
      </div>
      <RewardIcon item={item} color={color} size={chip ? 'w-6 h-6' : 'w-10 h-10'} />
      <p className={`font-['General_Sans',sans-serif] font-bold text-center leading-tight mt-2 ${chip ? 'text-[10px]' : 'text-sm'} ${isUltra ? 'ur-pulse-text' : ''}`}
        style={{ color }}>
        {item.type === 'gems' && item.amount ? `+${item.amount} Gems` : item.name}
      </p>
    </div>
  );
}

// ---------- rays burst behind an ultra reveal ----------
function RaysBurst({ color }) {
  return (
    <>
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{ width: 40, height: 40, background: color, filter: 'blur(30px)' }}
        initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 0.9, 0.6], scale: [0, 8, 6] }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute inset-0 m-auto rounded-full pointer-events-none"
        style={{
          width: '140%', height: '140%', left: '-20%', top: '-20%',
          background: `conic-gradient(from 0deg, transparent 0 10deg, ${color}22 10deg 16deg, transparent 16deg 30deg)`,
        }}
        initial={{ opacity: 0, rotate: 0 }} animate={{ opacity: [0, 0.7, 0.5], rotate: 90 }}
        transition={{ duration: 1.8, ease: 'easeOut' }}
      />
    </>
  );
}

// =============================================================================
export default function BoxOpening({ boxId, rolledItems, onContinue }) {
  const [phase, setPhase] = useState('charge'); // charge | reveal | done
  const [charge, setCharge] = useState(0);
  const [flash, setFlash] = useState(false);
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
    if (big) {
      setFlash(true); haptic([40, 40, 120]); soundEngine.urFlourish?.();
      after(240, () => setFlash(false));
    } else {
      haptic([25]);
    }
    setCurrent({ item, big });
    after(big ? 2100 : 950, () => {
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
      setFlash(true);
      after(360, () => { setFlash(false); setPhase('reveal'); step(0); });
    } else {
      haptic([30]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, charge, step]);

  const boxScale = 0.82 + charge * 0.17; // 0.82, 0.99, 1.16, then burst
  const promptText = charge === 0 ? 'Tap to open' : charge < CRACKS_NEEDED ? 'Keep tapping!' : '';
  const dark = !!current?.big;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: dark ? '#000000' : '#0B0D10', transition: 'background 0.4s ease' }}
      data-testid="box-opening-screen"
    >
      {/* flash overlay */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
            className="absolute inset-0 pointer-events-none z-50"
            style={{ background: dark ? 'rgba(219,246,127,0.9)' : 'rgba(255,255,255,0.7)', mixBlendMode: 'screen' }}
          />
        )}
      </AnimatePresence>

      {/* CHARGE */}
      {phase === 'charge' && (
        <div className="flex flex-col items-center">
          <motion.div
            onClick={onTap} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onTap(); }}
            animate={{ scale: boxScale }}
            transition={{ type: 'spring', stiffness: 320, damping: 12 }}
            className="relative cursor-pointer select-none"
            style={{ width: 'min(70vw, 300px)', height: 'min(70vw, 300px)', filter: `drop-shadow(0 0 ${20 + charge * 12}px rgba(${t.rgb},0.6))` }}
            data-testid="opening-box"
          >
            <motion.div key={charge} animate={charge > 0 ? { x: [0, -7, 7, -4, 4, 0] } : {}} transition={{ duration: 0.32 }} className="w-full h-full">
              <PhaseBoxArt tier={boxId} className="w-full h-full" />
            </motion.div>
            <CrackOverlay level={charge} color={t.core} />
          </motion.div>
          {promptText && (
            <motion.p
              key={promptText}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="mt-12 font-['JetBrains_Mono',monospace] text-[12px] uppercase tracking-[0.28em]"
              style={{ color: charge > 0 ? t.edge : 'rgba(255,255,255,0.5)' }}
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
                    ? { scale: [0, 2.3, 1.2], opacity: 1, y: 0 }
                    : { scale: [0, 1.15, 1], opacity: 1, y: 0 }}
                  transition={current.big
                    ? { duration: 1.9, times: [0, 0.55, 1], ease: 'easeOut' }
                    : { duration: 0.55, times: [0, 0.6, 1], ease: 'easeOut' }}
                  className="relative flex items-center justify-center"
                >
                  {current.big && <RaysBurst color={TIER_COLOR.ultra} />}
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
