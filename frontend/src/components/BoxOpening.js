// =============================================================================
// BoxOpening (v5).
//   1. CHARGE: tap to pry the parcel open. Each tap lifts the lid, widens the
//      seam and lets a column of the tier's light out; the final tap blows the
//      lid off and the contents rise.
//   2. REVEAL: rewards come out one at a time. EACH RARITY HAS ITS OWN FRAME
//      (shape + colour + pips + category icon) so you instantly read common vs
//      rare vs legendary vs mythic. legendary/mythic play a clean cinematic
//      (fade to black -> light -> glorious labeled plate) and then DOCK down
//      into the collected row.
//   3. DONE: collected row + Continue.
// Palette stays on-system: steel / cyan / lime / purple.
// =============================================================================
import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem } from 'lucide-react';
import { soundEngine } from '../utils/SoundEngine';
import PhaseBoxArt, { tierFor } from './PhaseBoxArt';
import { ShopItemIcon } from './ShopIcons';

const TIER = {
  common:    { color: '#9BA09C', dim: '#5F625F', label: 'COMMON',    pips: 1, cinematic: false },
  rare:      { color: '#95DEE6', dim: '#2C6870', label: 'RARE',      pips: 2, cinematic: false },
  legendary: { color: '#DBF67F', dim: '#59691F', label: 'LEGENDARY', pips: 3, cinematic: true },
  mythic:    { color: '#A59BCC', dim: '#4B4470', label: 'MYTHIC',    pips: 4, cinematic: true },
};
const tierOf = (t) => TIER[t] || TIER.common;
const STAGE_BG = '#0E1012';
const CRACKS_NEEDED = 3;
const haptic = (p) => { try { navigator.vibrate?.(p); } catch { /* unsupported */ } };
const rand = (a, b) => a + Math.random() * (b - a);

// ---------- category icon: WHAT the item is (2px outline, tier-coloured) ----
function CatIcon({ item, color, size = 'w-8 h-8' }) {
  const k = item.item_key || '';
  const cat = item.category || '';
  if (k === 'streak_shield' || k === 'streak_revive' || k.startsWith('boost_xp_')) {
    return <span style={{ color }}><ShopItemIcon itemKey={k} className={size} /></span>;
  }
  const S = (children) => (
    <svg viewBox="0 0 24 24" className={size} fill="none" stroke={color} strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
  );
  switch (cat) {
    case 'title':
      return S(<><rect x="3" y="7" width="18" height="10" rx="2.5" /><path d="M7 12h10" /></>);
    case 'anim':
      return S(<><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M18 6l-2 2M6 18l2-2M18 18l-2-2" /></>);
    case 'banner':
      return S(<><path d="M6 3v18l6-4 6 4V3z" /></>);
    case 'effect':
      return S(<><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="7.5" opacity="0.6" /></>);
    case 'color_main':
    case 'color':
      return S(<><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /></>);
    default:
      return S(<><path d="M4 9 L12 5 L20 9 L20 18 L12 22 L4 18 Z M4 9 L12 13 L20 9 M12 13 L12 22" /></>);
  }
}

// rarity pip row
function Pips({ n, color }) {
  return (
    <div className="flex items-center gap-1 mt-1.5">
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} style={{ width: 5, height: 5, borderRadius: 9, background: color }} />
      ))}
    </div>
  );
}

// clip-path silhouette per rarity — this is what makes each tier read differently
const CLIP = {
  common: 'none',
  rare: 'none',
  legendary: 'polygon(16% 0, 84% 0, 100% 16%, 100% 84%, 84% 100%, 16% 100%, 0 84%, 0 16%)', // octagon
  mythic: 'polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)', // hexagon
};

// ---------- rarity-framed reward plate ----------
function RewardVisual({ item, chip = false }) {
  const tt = tierOf(item.tier);
  const color = tt.color;
  const clip = CLIP[item.tier] || 'none';
  const hex = item.tier === 'mythic';
  const oct = item.tier === 'legendary';
  const w = chip ? 92 : 176;
  return (
    <div className="relative flex flex-col items-center justify-center"
      style={{
        width: w,
        minHeight: chip ? 92 : (hex ? 200 : 176),
        padding: chip ? '12px 8px' : (hex ? '30px 16px' : '22px 16px'),
        background: 'var(--gm-card)',
        border: `1.5px solid ${item.tier === 'common' ? 'var(--gm-track)' : color}`,
        borderRadius: (oct || hex) ? 0 : (chip ? 14 : 20),
        clipPath: chip ? 'none' : clip,
        boxShadow: 'var(--gm-shadow-card)',
      }}
    >
      {/* rare gets an accent header bar; legendary/mythic get corner ticks */}
      {item.tier === 'rare' && !chip && (
        <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: color }} />
      )}
      {!chip && (oct || hex) && (
        <>
          <span className="absolute top-2 left-1/2 -translate-x-1/2" style={{ width: 22, height: 2, background: color, opacity: 0.7 }} />
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2" style={{ width: 22, height: 2, background: color, opacity: 0.7 }} />
        </>
      )}

      {!chip && (
        <span className="font-['JetBrains_Mono'] font-black uppercase text-[8px] tracking-[0.18em] mb-2" style={{ color }}>
          {tt.label}
        </span>
      )}

      <CatIcon item={item} color={color} size={chip ? 'w-6 h-6' : 'w-10 h-10'} />

      <p className={`font-['General_Sans',sans-serif] font-bold text-center leading-tight mt-2 ${chip ? 'text-[10px]' : 'text-sm'}`}
        style={{ color: 'var(--gm-ink)' }}>
        {item.name}
      </p>

      {!chip && <Pips n={tt.pips} color={color} />}

      {item.duplicate && (
        <p className="mt-1.5 text-[10px] font-['JetBrains_Mono'] font-bold flex items-center gap-0.5" style={{ color }}>
          DUPE +{item.refund}<Gem className="w-2.5 h-2.5" style={{ color }} strokeWidth={2.4} />
        </p>
      )}
    </div>
  );
}

// ---------- cinematic reveal for legendary / mythic ----------
function Cinematic({ item }) {
  const tt = tierOf(item.tier);
  const color = tt.color;
  const isMythic = item.tier === 'mythic';
  return (
    <motion.div
      className="absolute inset-0 z-[60] flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: 'easeInOut' }}
      style={{ background: '#000000' }}
      data-testid="cinematic-reveal"
    >
      {/* soft light bloom (single, clean) */}
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ width: 340, height: 340, background: color, filter: 'blur(100px)' }}
        initial={{ opacity: 0, scale: 0.2 }}
        animate={{ opacity: [0, 0.5, 0.34], scale: [0.2, 1.1, 1] }}
        transition={{ duration: 1.1, delay: 0.7, ease: 'easeOut' }}
      />
      {/* vertical light beam column */}
      <motion.div className="absolute pointer-events-none"
        style={{ width: 3, height: '120%', background: `linear-gradient(to bottom, transparent, ${color}, transparent)` }}
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{ opacity: [0, 0.8, 0], scaleY: [0, 1, 1] }}
        transition={{ duration: 0.9, delay: 0.55, ease: 'easeOut' }}
      />
      {/* mythic confetti */}
      {isMythic && Array.from({ length: 22 }).map((_, i) => (
        <motion.div key={i} className="absolute left-1/2 top-[40%] pointer-events-none"
          style={{ width: rand(5, 9), height: rand(5, 9), background: color, borderRadius: 2 }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 0 }}
          animate={{ x: rand(-150, 150), y: rand(-30, 240), rotate: rand(-200, 200), opacity: [0, 1, 1, 0] }}
          transition={{ duration: rand(1.4, 2.3), delay: 0.95 + rand(0, 0.25), ease: 'easeOut' }}
        />
      ))}

      {/* content — the item walks in, then DOCKS down on exit */}
      <motion.div className="relative flex flex-col items-center px-6"
        initial={{ opacity: 0, y: 26, scale: 0.82 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 150, scale: 0.28 }}
        transition={{ duration: 0.62, delay: 0.85, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full mb-7"
          style={{ background: `${color}1a`, border: `1.5px solid ${color}` }}>
          <span className="font-['JetBrains_Mono'] font-bold uppercase text-[13px]" style={{ color, letterSpacing: '0.26em' }}>
            {tt.label}
          </span>
        </div>

        {/* framed plate (the same rarity silhouette, scaled up) */}
        <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}>
          <RewardVisual item={item} />
        </motion.div>

        <h1 className="mt-6 font-['Archivo',sans-serif] font-black text-center text-3xl sm:text-4xl"
          style={{ color: '#F4F5F2', letterSpacing: '-0.02em' }}>
          {item.name}
        </h1>
        <p className="mt-2 font-['JetBrains_Mono'] font-bold text-xs uppercase tracking-[0.2em]" style={{ color }}>
          {item.duplicate ? <>Already owned · +{item.refund} gems</> : <>Unlocked</>}
        </p>
      </motion.div>
    </motion.div>
  );
}

// =============================================================================
export default function BoxOpening({ boxId, rolledItems, onContinue }) {
  const [phase, setPhase] = useState('charge'); // charge | reveal | done
  const [charge, setCharge] = useState(0);
  const [opened, setOpened] = useState(false);
  const [shown, setShown] = useState([]);
  const [pop, setPop] = useState(null);
  const [cine, setCine] = useState(null);
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
    if (tierOf(item.tier).cinematic) {
      haptic([40, 30, 120]); soundEngine.urFlourish?.();
      setCine(item);
      after(3500, () => { setShown((p) => [...p, item]); setCine(null); after(420, () => step(i + 1)); });
    } else {
      haptic([25]);
      setPop(item);
      after(1000, () => { setShown((p) => [...p, item]); setPop(null); after(300, () => step(i + 1)); });
    }
  }, [rolledItems]); // eslint-disable-line react-hooks/exhaustive-deps

  const onTap = useCallback(() => {
    if (phase !== 'charge' || opened) return;
    const next = charge + 1;
    setCharge(next);
    soundEngine.boxCrack?.();
    if (next >= CRACKS_NEEDED) {
      haptic([70, 40, 160]);
      setOpened(true);
      after(620, () => { setPhase('reveal'); step(0); });
    } else {
      haptic([32]);
    }
  }, [phase, charge, opened, step]);

  const lidLift = opened ? 1.9 : charge * 0.32;      // lid pries up per tap, blows off on open
  const lidSpin = opened ? -24 : 0;
  const beam = opened ? 1 : charge * 0.3;             // light column intensity
  const promptText = charge === 0 ? 'Tap to open' : charge < CRACKS_NEEDED ? 'Keep going' : '';

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
          <div className="relative flex items-center justify-center" style={{ width: 'min(76vw, 320px)', height: 'min(76vw, 320px)' }}>
            {/* rising light column from the lid seam */}
            <motion.div className="absolute pointer-events-none"
              style={{ width: opened ? 10 : 5, height: '150%', top: '-40%',
                background: `linear-gradient(to bottom, transparent, ${t.accent}, transparent)`, filter: 'blur(2px)' }}
              animate={{ opacity: beam, scaleY: opened ? [1, 1.2] : 1 }}
              transition={{ duration: opened ? 0.6 : 0.3 }}
            />
            {/* the box */}
            <motion.div
              onClick={onTap} role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onTap(); }}
              className="relative cursor-pointer select-none w-full h-full"
              animate={opened
                ? { scale: [1, 1.06, 1.15], opacity: [1, 1, 0] }
                : { scale: 1, x: charge > 0 ? [0, -7, 7, -4, 4, 0] : 0 }}
              transition={opened ? { duration: 0.6, ease: 'easeIn' } : { duration: 0.34 }}
              key={opened ? 'open' : charge}
              data-testid="opening-box"
            >
              <PhaseBoxArt tier={boxId} className="w-full h-full" lidLift={lidLift} lidSpin={lidSpin} />
            </motion.div>
          </div>
          {promptText && !opened && (
            <motion.p key={promptText} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="mt-10 font-['JetBrains_Mono',monospace] text-[12px] uppercase tracking-[0.28em]"
              style={{ color: charge > 0 ? t.accent : 'rgba(244,245,242,0.5)' }}
              data-testid="opening-tap-prompt">
              {promptText}
            </motion.p>
          )}
        </div>
      )}

      {/* REVEAL / DONE */}
      {phase !== 'charge' && (
        <div className="w-full max-w-md px-6 flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center" style={{ minHeight: 230 }}>
            <AnimatePresence mode="wait">
              {pop && (
                <motion.div key={`pop-${shown.length}`}
                  initial={{ scale: 0, opacity: 0, y: 20 }}
                  animate={{ scale: [0, 1.1, 1], opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, times: [0, 0.6, 1], ease: 'easeOut' }}>
                  <RewardVisual item={pop} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {shown.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6" data-testid="rewards-grid">
              {shown.map((it, i) => (
                <motion.div key={i} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                  <RewardVisual item={it} chip />
                </motion.div>
              ))}
            </div>
          )}

          <AnimatePresence>
            {phase === 'done' && (
              <motion.button initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }} onClick={onContinue}
                className="mt-9 px-10 py-3 rounded-2xl font-['General_Sans',sans-serif] font-bold text-sm transition-transform active:scale-[0.97] bg-[#95DEE6] text-[#183A3F]"
                style={{ letterSpacing: '0.08em' }} data-testid="opening-continue-btn">
                Continue
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* CINEMATIC overlay */}
      <AnimatePresence>
        {cine && <Cinematic key={`cine-${shown.length}`} item={cine} />}
      </AnimatePresence>
    </motion.div>,
    document.body
  );
}
