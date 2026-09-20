// =============================================================================
// BoxOpening (v4) — a real unboxing.
//
//   1. CHARGE: the parcel sits on a dark stage. Each tap shakes it harder,
//      spreads glowing cracks, leaks accent light and throws shard debris. The
//      final tap bursts it open with a flash + shard explosion.
//   2. REVEAL: rewards come out one at a time.
//        · common / rare  -> quick card pop on the stage.
//        · legendary / mythic -> CINEMATIC: the whole screen fades to black,
//          then light blooms, and the reward rises GLORIOUS and LABELED
//          (rotating god-rays, confetti on mythic, big rarity banner).
//   3. DONE: everything collected in a row + Continue.
// =============================================================================
import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, Star } from 'lucide-react';
import { soundEngine } from '../utils/SoundEngine';
import PhaseBoxArt, { tierFor } from './PhaseBoxArt';
import { ShopItemIcon } from './ShopIcons';

// Reveal tiers. `cinematic` tiers get the full fade-to-black glory moment.
const TIER = {
  common:    { color: '#9BA09C', label: 'COMMON',    cinematic: false },
  rare:      { color: '#95DEE6', label: 'RARE',      cinematic: false },
  legendary: { color: '#DBF67F', label: 'LEGENDARY', cinematic: true },
  mythic:    { color: '#F5C542', label: 'MYTHIC',    cinematic: true }, // prestige gold
};
const tierOf = (t) => TIER[t] || TIER.common;

const STAGE_BG = '#0E1012';
const CRACKS_NEEDED = 3;
const haptic = (p) => { try { navigator.vibrate?.(p); } catch { /* unsupported */ } };
const rand = (a, b) => a + Math.random() * (b - a);

// ---------- reward icon ----------
function RewardIcon({ item, color, size = 'w-8 h-8' }) {
  if (item.type === 'gems') return <Gem className={size} style={{ color }} strokeWidth={2.2} />;
  const k = item.item_key || '';
  if (k === 'streak_shield' || k === 'streak_revive' || k.startsWith('boost_xp_')) {
    return <span style={{ color }}><ShopItemIcon itemKey={k} className={size} /></span>;
  }
  if (item.tier === 'mythic' || item.tier === 'legendary') return <Star className={size} style={{ color }} fill={color} strokeWidth={0} />;
  return (
    <svg viewBox="0 0 24 24" className={size} aria-hidden="true">
      <path d="M4 9 L12 5 L20 9 L20 18 L12 22 L4 18 Z M4 9 L12 13 L20 9 M12 13 L12 22"
        fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ---------- glowing crack overlay (grows with charge) ----------
function CrackOverlay({ level, color }) {
  const cracks = [
    'M60 22 L55 46 L64 70 L58 100',
    'M58 52 L34 66 L24 92',
    'M60 50 L88 60 L98 82',
  ];
  return (
    <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full pointer-events-none">
      {cracks.slice(0, level).map((d, i) => (
        <motion.path
          key={i} d={d} fill="none" stroke="#FFFFFF" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color})` }}
        />
      ))}
    </svg>
  );
}

// ---------- shard debris burst ----------
function Shards({ burst, color }) {
  if (!burst) return null;
  return (
    <>
      {burst.pieces.map((p) => (
        <motion.div
          key={p.id}
          className="absolute left-1/2 top-1/2 pointer-events-none"
          style={{ width: p.size, height: p.size, background: p.accent ? color : '#2B2F35', borderRadius: 2 }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{ x: p.x, y: p.y, rotate: p.rot, opacity: 0 }}
          transition={{ duration: p.dur, ease: 'easeOut' }}
        />
      ))}
    </>
  );
}

// ---------- flat reward card (stage pop + docked chip) ----------
function RewardCard({ item, chip = false }) {
  const tt = tierOf(item.tier);
  const color = tt.color;
  const accented = item.tier !== 'common';
  return (
    <div
      className={`relative flex flex-col items-center ${chip ? 'px-3 py-3 w-[92px]' : 'px-5 py-6 w-[184px]'}`}
      style={{
        background: 'var(--gm-card)',
        border: `1.5px solid ${accented ? color : 'var(--gm-track)'}`,
        borderRadius: chip ? 14 : 20,
        boxShadow: 'var(--gm-shadow-card)',
      }}
    >
      <div className={`absolute top-1.5 right-1.5 rounded-md px-1.5 py-0.5 ${chip ? 'hidden' : ''}`}
        style={{ background: 'var(--gm-badge)' }}>
        <span className="text-[8px] font-black uppercase tracking-[0.16em]" style={{ color }}>{tt.label}</span>
      </div>
      <RewardIcon item={item} color={color} size={chip ? 'w-6 h-6' : 'w-10 h-10'} />
      <p className={`font-['General_Sans',sans-serif] font-bold text-center leading-tight mt-2 ${chip ? 'text-[10px]' : 'text-sm'}`}
        style={{ color: 'var(--gm-ink)' }}>
        {item.name}
      </p>
      {item.duplicate && (
        <p className="mt-1 text-[10px] font-['JetBrains_Mono'] font-bold" style={{ color }}>
          DUPE · +{item.refund}
          <Gem className="inline w-2.5 h-2.5 ml-0.5 -mt-0.5" style={{ color }} strokeWidth={2.4} />
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
  const confetti = isMythic
    ? Array.from({ length: 26 }, (_, i) => ({
        id: i, x: rand(-160, 160), y: rand(-40, 260), rot: rand(-220, 220),
        size: rand(5, 10), delay: rand(0, 0.25), dur: rand(1.4, 2.4),
      }))
    : [];
  return (
    <motion.div
      className="absolute inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: 'easeInOut' }} // slow fade to black
      style={{ background: '#000000' }}
      data-testid="cinematic-reveal"
    >
      {/* light bloom — arrives after the black settles */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{ width: 320, height: 320, background: color, filter: 'blur(90px)' }}
        initial={{ opacity: 0, scale: 0.2 }}
        animate={{ opacity: [0, 0.55, 0.4], scale: [0.2, 1.15, 1] }}
        transition={{ duration: 1.1, delay: 0.7, ease: 'easeOut' }}
      />
      {/* rotating god-rays */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: '200%', height: '200%',
          background: `conic-gradient(from 0deg, transparent 0 12deg, ${color}1f 12deg 18deg, transparent 18deg 34deg)`,
        }}
        initial={{ opacity: 0, rotate: 0 }}
        animate={{ opacity: [0, 0.5, 0.35], rotate: 60 }}
        transition={{ duration: 3.2, delay: 0.75, ease: 'easeOut' }}
      />
      {/* mythic confetti */}
      {confetti.map((c) => (
        <motion.div key={c.id} className="absolute left-1/2 top-[38%] pointer-events-none"
          style={{ width: c.size, height: c.size, background: color, borderRadius: 2 }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 0 }}
          animate={{ x: c.x, y: c.y, rotate: c.rot, opacity: [0, 1, 1, 0] }}
          transition={{ duration: c.dur, delay: 0.9 + c.delay, ease: 'easeOut' }}
        />
      ))}

      {/* content */}
      <motion.div
        className="relative flex flex-col items-center px-6"
        initial={{ opacity: 0, y: 24, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.85, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* rarity banner */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
          style={{ background: `${color}1a`, border: `1.5px solid ${color}` }}>
          <Star className="w-3.5 h-3.5" style={{ color }} fill={color} strokeWidth={0} />
          <span className="font-['JetBrains_Mono'] font-bold uppercase text-[13px]"
            style={{ color, letterSpacing: '0.24em' }}>
            {tt.label}
          </span>
        </div>

        {/* giant icon */}
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ filter: `drop-shadow(0 0 24px ${color}aa)` }}
        >
          <RewardIcon item={item} color={color} size="w-24 h-24" />
        </motion.div>

        {/* name */}
        <h1 className="mt-6 font-['Archivo',sans-serif] font-black text-center text-4xl sm:text-5xl"
          style={{ color: '#F4F5F2', letterSpacing: '-0.02em', textShadow: `0 0 30px ${color}66` }}>
          {item.name}
        </h1>

        {item.duplicate ? (
          <p className="mt-3 font-['JetBrains_Mono'] font-bold text-sm flex items-center gap-1.5" style={{ color }}>
            ALREADY OWNED · +{item.refund}
            <Gem className="w-4 h-4" style={{ color }} strokeWidth={2.4} />
          </p>
        ) : (
          <p className="mt-3 font-['General_Sans',sans-serif] font-medium text-sm text-[#9BA09C] uppercase tracking-[0.18em]">
            Unlocked
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

// =============================================================================
export default function BoxOpening({ boxId, rolledItems, onContinue }) {
  const [phase, setPhase] = useState('charge'); // charge | reveal | done
  const [charge, setCharge] = useState(0);
  const [burst, setBurst] = useState(null);
  const [opened, setOpened] = useState(false); // box gone after final crack
  const [shown, setShown] = useState([]);
  const [pop, setPop] = useState(null);   // non-cinematic stage item
  const [cine, setCine] = useState(null); // cinematic item
  const alive = useRef(true);
  const timers = useRef([]);
  const burstId = useRef(0);

  const t = tierFor(boxId);

  useEffect(() => {
    alive.current = true;
    const list = timers.current;
    return () => { alive.current = false; list.forEach(clearTimeout); };
  }, []);
  const after = (ms, fn) => { const id = setTimeout(() => { if (alive.current) fn(); }, ms); timers.current.push(id); };

  const throwShards = useCallback((n, spread) => {
    burstId.current += 1;
    const pieces = Array.from({ length: n }, (_, i) => {
      const ang = rand(0, Math.PI * 2);
      const dist = rand(spread * 0.4, spread);
      return {
        id: `${burstId.current}-${i}`,
        x: Math.cos(ang) * dist, y: Math.sin(ang) * dist,
        rot: rand(-260, 260), size: rand(5, 12), dur: rand(0.5, 0.9),
        accent: Math.random() < 0.4,
      };
    });
    setBurst({ id: burstId.current, pieces });
    after(950, () => setBurst((b) => (b && b.id === burstId.current ? null : b)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const step = useCallback((i) => {
    if (i >= rolledItems.length) { setPhase('done'); return; }
    const item = rolledItems[i];
    if (tierOf(item.tier).cinematic) {
      haptic([40, 30, 120]); soundEngine.urFlourish?.();
      setCine(item);
      after(3600, () => {
        setShown((prev) => [...prev, item]);
        setCine(null);
        after(360, () => step(i + 1));
      });
    } else {
      haptic([25]);
      setPop(item);
      after(1000, () => {
        setShown((prev) => [...prev, item]);
        setPop(null);
        after(300, () => step(i + 1));
      });
    }
  }, [rolledItems]); // eslint-disable-line react-hooks/exhaustive-deps

  const onTap = useCallback(() => {
    if (phase !== 'charge' || opened) return;
    const next = charge + 1;
    setCharge(next);
    soundEngine.boxCrack?.();
    if (next >= CRACKS_NEEDED) {
      haptic([70, 40, 160]);
      throwShards(18, 190);
      setOpened(true);
      after(520, () => { setPhase('reveal'); step(0); });
    } else {
      haptic([30]);
      throwShards(7, 90);
    }
  }, [phase, charge, opened, step, throwShards]);

  const boxScale = 0.84 + charge * 0.13;
  const glow = 0.15 + charge * 0.22; // accent light leaking, grows per tap
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
          <div className="relative flex items-center justify-center" style={{ width: 'min(74vw, 320px)', height: 'min(74vw, 320px)' }}>
            {/* light leaking from within, intensifies per tap */}
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{ width: '70%', height: '70%', background: t.accent, filter: 'blur(60px)' }}
              animate={{ opacity: opened ? [glow, 1, 0] : glow, scale: opened ? [1, 1.8, 2.4] : 1 }}
              transition={{ duration: opened ? 0.6 : 0.3 }}
            />
            <Shards burst={burst} color={t.accent} />
            <AnimatePresence>
              {!opened && (
                <motion.div
                  onClick={onTap} role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onTap(); }}
                  className="relative cursor-pointer select-none"
                  style={{ width: '78%', height: '78%' }}
                  initial={{ scale: 0.84 }}
                  animate={{ scale: boxScale }}
                  exit={{ scale: [boxScale, boxScale * 1.25, 0], opacity: [1, 1, 0] }}
                  transition={{ type: 'spring', stiffness: 320, damping: 14 }}
                  data-testid="opening-box"
                >
                  <motion.div key={charge} animate={charge > 0 ? { x: [0, -8, 8, -5, 5, -2, 0], rotate: [0, -2, 2, -1, 0] } : {}} transition={{ duration: 0.36 }} className="w-full h-full">
                    <PhaseBoxArt tier={boxId} className="w-full h-full" />
                  </motion.div>
                  <CrackOverlay level={charge} color={t.accent} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {promptText && !opened && (
            <motion.p
              key={promptText}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="mt-10 font-['JetBrains_Mono',monospace] text-[12px] uppercase tracking-[0.28em]"
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
          <div className="relative flex items-center justify-center" style={{ minHeight: 220 }}>
            <AnimatePresence mode="wait">
              {pop && (
                <motion.div
                  key={`pop-${shown.length}`}
                  initial={{ scale: 0, opacity: 0, y: 20 }}
                  animate={{ scale: [0, 1.12, 1], opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, times: [0, 0.6, 1], ease: 'easeOut' }}
                >
                  <RewardCard item={pop} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {shown.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6" data-testid="rewards-grid">
              {shown.map((it, i) => (
                <motion.div key={i} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 22 }}>
                  <RewardCard item={it} chip />
                </motion.div>
              ))}
            </div>
          )}

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

      {/* CINEMATIC overlay — covers the stage for legendary / mythic pulls */}
      <AnimatePresence>
        {cine && <Cinematic key={`cine-${shown.length}`} item={cine} />}
      </AnimatePresence>
    </motion.div>,
    document.body
  );
}
