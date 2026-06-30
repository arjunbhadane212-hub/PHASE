// =============================================================================
// BoxOpening — full-screen choreographed opening sequence (no particles, no
// stock VFX). 5 states: ANTICIPATION → BUILDUP → CRACK → REVEAL → SETTLE.
// =============================================================================
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, Star } from 'lucide-react';
import { soundEngine } from '../utils/SoundEngine';

const TIER_COLOR = {
  common: '#FFFFFF',
  rare:   '#3B82F6',
  ultra:  '#BFD9FF',
};

const haptic = (pattern) => {
  try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
};

// ---------- Big animated box illustration (matches header/modal SVG) ----------
function BigBox({ boxId, state, onClick }) {
  // Tier intensity drives blue saturation
  const intensity = boxId === 'phase' ? 1.0 : boxId === 'delta' ? 0.85 : 0.6;
  const lid = `rgba(77, 142, 240, ${0.55 + intensity * 0.35})`;
  const body = `rgba(27, 106, 228, ${0.18 + intensity * 0.22})`;
  const stroke = `rgba(77, 142, 240, ${0.7 + intensity * 0.3})`;

  // State 1: idle bob @ scale 0.7
  // State 2: scale to 1.0, then shake (driven by .box-shake class)
  // State 3: hold visible (crack overlay handles the rest)
  // State 4: split + fade out

  const scale = state === 'anticipation' ? 0.7 : 1.0;
  const showHalves = state === 'reveal';
  const isShaking = state === 'buildup';
  const isInteractive = state === 'anticipation';
  const fadeBox = state === 'reveal';

  return (
    <motion.div
      onClick={isInteractive ? onClick : undefined}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : -1}
      onKeyDown={(e) => { if (isInteractive && (e.key === 'Enter' || e.key === ' ')) onClick?.(); }}
      animate={{
        scale,
        y: state === 'anticipation' ? [0, -4, 0] : 0,
      }}
      transition={
        state === 'anticipation'
          ? { scale: { duration: 0.4 }, y: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } }
          : { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] /* slight overshoot */ }
      }
      className={`relative ${isShaking ? 'box-shake' : ''} ${isInteractive ? 'cursor-pointer select-none' : ''}`}
      style={{
        width: 'min(64vw, 280px)',
        height: 'min(64vw, 280px)',
        filter: `drop-shadow(0 0 ${state === 'buildup' ? 48 : 32}px rgba(59, 130, 246, ${0.3 + intensity * 0.3}))`,
        willChange: 'transform, filter',
      }}
      data-testid="opening-box"
    >
      {/* Circuit-trace outline that powers on during BUILDUP */}
      <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full pointer-events-none">
        <path
          d="M20 50 L60 35 L100 50 L100 95 L60 110 L20 95 Z"
          fill="none"
          stroke="#3B82F6"
          strokeWidth={state === 'buildup' || state === 'crack' ? 1.8 : 0}
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength="1"
          style={{
            strokeDasharray: 1,
            strokeDashoffset: state === 'buildup' || state === 'crack' || state === 'reveal' ? 0 : 1,
            transition: 'stroke-dashoffset 0.4s ease-out, stroke-width 0.2s ease-out',
            filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.7))',
          }}
        />
      </svg>

      {/* Box body — two halves so we can split them in REVEAL */}
      <motion.svg
        viewBox="0 0 120 120"
        className="absolute inset-0 w-full h-full"
        animate={{ opacity: fadeBox ? 0 : 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`opening-box-grad-${boxId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={body} />
            <stop offset="100%" stopColor="rgba(10,14,20,0.95)" />
          </linearGradient>
        </defs>

        {/* Left half (translates left in reveal) */}
        <motion.g animate={{ x: showHalves ? -22 : 0, opacity: showHalves ? 0 : 1 }} transition={{ duration: 0.55, ease: 'easeOut' }}>
          <path
            d="M20 50 L60 35 L60 65 L60 110 L20 95 Z"
            fill={`url(#opening-box-grad-${boxId})`}
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M20 50 L60 35 L60 65 Z" fill={lid} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
        </motion.g>

        {/* Right half */}
        <motion.g animate={{ x: showHalves ? 22 : 0, opacity: showHalves ? 0 : 1 }} transition={{ duration: 0.55, ease: 'easeOut' }}>
          <path
            d="M60 35 L100 50 L100 95 L60 110 L60 65 Z"
            fill={`url(#opening-box-grad-${boxId})`}
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M60 35 L100 50 L60 65 Z" fill={lid} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
        </motion.g>

        {/* Center seam highlight */}
        <line x1="60" y1="35" x2="60" y2="110" stroke={stroke} strokeWidth="1" opacity="0.5" />

        {/* Linear directional crack with one branch — appears during CRACK */}
        {(state === 'crack' || state === 'reveal') && (
          <g style={{ filter: 'drop-shadow(0 0 6px rgba(191,217,255,0.9))' }}>
            <path
              d="M60 38 L58 55 L62 70 L57 88 L60 108"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.2"
              strokeLinecap="round"
              pathLength="1"
              style={{
                strokeDasharray: 1,
                strokeDashoffset: state === 'crack' || state === 'reveal' ? 0 : 1,
                animation: 'crack-trace 0.22s ease-out forwards',
              }}
            />
            {/* Single branch near the end */}
            <path
              d="M57 88 L48 96"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1"
              strokeLinecap="round"
              pathLength="1"
              style={{
                strokeDasharray: 1,
                strokeDashoffset: state === 'crack' || state === 'reveal' ? 0 : 1,
                animation: 'crack-trace 0.12s ease-out 0.18s forwards',
              }}
            />
          </g>
        )}
      </motion.svg>

      {/* Anticipation prompt */}
      {isInteractive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="absolute left-1/2 -translate-x-1/2 -bottom-12 text-[11px] uppercase tracking-[0.22em] text-zinc-400 whitespace-nowrap"
          data-testid="opening-tap-prompt"
        >
          Tap to open
        </motion.div>
      )}
    </motion.div>
  );
}

// ---------- Single reward card revealed after the crack ----------
function RewardCard({ item, index, totalCount }) {
  const isUR = item.tier === 'ultra';
  const isRare = item.tier === 'rare';
  const tierColor = TIER_COLOR[item.tier];
  const tierLabel = item.tier === 'common' ? 'COMMON' : isRare ? 'RARE' : 'ULTRA-RARE';

  // Stagger: 0.15s between each
  const delay = index * 0.15;

  // UR-only flourish: lift + 5° tilt then settle. Run once at the end of the
  // entrance overshoot.
  const flourishKeyframes = isUR
    ? { y: [0, -10, -8, 0], rotateZ: [0, 5, -2, 0], rotateX: [0, 4, -2, 0] }
    : undefined;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, y: 30 }}
      animate={{
        scale: [0.8, 1.05, 1.0],
        opacity: 1,
        y: 0,
        ...flourishKeyframes,
      }}
      transition={{
        delay,
        duration: isUR ? 1.0 : 0.45,
        times: isUR ? [0, 0.25, 0.4, 0.6, 0.8, 1] : [0, 0.6, 1],
        ease: 'easeOut',
      }}
      onAnimationStart={() => {
        // UR haptic flourish: stronger pattern fires per UR card
        if (isUR) {
          setTimeout(() => {
            haptic([30, 40, 60]);
            soundEngine.urFlourish?.();
          }, delay * 1000 + 200);
        }
      }}
      style={{
        background: '#0A0E14',
        border: `1.5px solid ${isUR ? tierColor : isRare ? tierColor : 'rgba(255,255,255,0.18)'}`,
        borderRadius: 16,
        boxShadow: isUR
          ? '0 0 32px rgba(191, 217, 255, 0.45), inset 0 0 24px rgba(59, 130, 246, 0.18)'
          : isRare
          ? '0 0 20px rgba(59, 130, 246, 0.32), inset 0 0 16px rgba(59, 130, 246, 0.1)'
          : '0 0 14px rgba(255, 255, 255, 0.06)',
        transformStyle: 'preserve-3d',
      }}
      className="relative w-full px-3 py-4 flex flex-col items-center"
      data-testid={`reward-card-${index}`}
    >
      {/* Rarity tag pill in corner */}
      <div
        className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md"
        style={{
          background: 'rgba(0,0,0,0.55)',
          border: `1px solid ${tierColor}55`,
        }}
      >
        <span
          className={`text-[8px] font-black uppercase tracking-[0.18em] ${isUR ? 'ur-pulse-text' : ''}`}
          style={{ color: tierColor, letterSpacing: '0.18em' }}
        >
          {tierLabel}
        </span>
      </div>

      {/* Icon */}
      <div className="w-10 h-10 mb-2 flex items-center justify-center">
        <RewardIcon item={item} color={tierColor} />
      </div>

      {/* Name */}
      <p
        className={`text-[12px] font-bold text-center leading-tight ${isUR ? 'ur-pulse-text' : ''}`}
        style={{ color: tierColor }}
      >
        {item.type === 'gems' && item.amount ? `+${item.amount} Gems` : item.name}
        {item.shared && item.tier_tag && (
          <span className="block mt-1 text-[8px] tracking-[0.2em] text-zinc-500 font-bold">
            {item.tier_tag} DROP
          </span>
        )}
      </p>
    </motion.div>
  );
}

// ---------- Reward type icon (small, controlled SVG/Lucide) ----------
function RewardIcon({ item, color }) {
  if (item.type === 'gems') return <Gem className="w-7 h-7" style={{ color }} strokeWidth={2.2} />;
  if (item.tier === 'ultra') return <Star className="w-7 h-7" style={{ color }} fill={color} strokeWidth={0} />;
  // Generic mini box-shape for other types
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7" aria-hidden="true">
      <path
        d="M4 9 L12 5 L20 9 L20 18 L12 22 L4 18 Z M4 9 L12 13 L20 9 M12 13 L12 22"
        fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px ${color}55)` }}
      />
    </svg>
  );
}

// =============================================================================
// Main BoxOpening component
// =============================================================================
export default function BoxOpening({ boxId, rolledItems, onContinue }) {
  // Possible states
  const [state, setState] = useState('anticipation'); // anticipation | buildup | crack | reveal | settle
  const [flashOn, setFlashOn] = useState(false);

  // Compute highest tier in drops for flash intensity
  const highestTier = useMemo(() => {
    const order = { common: 0, rare: 1, ultra: 2 };
    return rolledItems.reduce((acc, it) => (order[it.tier] > order[acc] ? it.tier : acc), 'common');
  }, [rolledItems]);

  // Reveal allows Continue once stagger completes
  useEffect(() => {
    if (state === 'reveal') {
      const finalDelay = rolledItems.length * 150 + 1100; // last card + UR flourish
      const t = setTimeout(() => setState('settle'), finalDelay);
      return () => clearTimeout(t);
    }
  }, [state, rolledItems.length]);

  const beginOpen = useCallback(() => {
    if (state !== 'anticipation') return;
    soundEngine.boxRise?.();
    setState('buildup');

    // Buildup → Crack (0.8s)
    setTimeout(() => {
      soundEngine.boxCrack?.();
      haptic(highestTier === 'ultra' ? [60, 30, 120] : [40]);
      setFlashOn(true);
      setState('crack');

      // Flash hold: 0.15s common/rare, 0.3s UR
      const flashHold = highestTier === 'ultra' ? 300 : 150;
      setTimeout(() => setFlashOn(false), flashHold);

      // Crack → Reveal (0.3s)
      setTimeout(() => setState('reveal'), 300);
    }, 800);
  }, [state, highestTier]);

  const flashColor = highestTier === 'ultra'
    ? 'rgba(191, 217, 255, 0.95)'
    : 'rgba(220, 231, 250, 0.7)';

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at center, #0A0E14 0%, #000000 80%)',
      }}
      data-testid="box-opening-screen"
    >
      {/* Rarity-tiered flash overlay */}
      <AnimatePresence>
        {flashOn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.08 }}
            className="absolute inset-0 pointer-events-none z-50"
            style={{ background: flashColor, mixBlendMode: 'screen' }}
            data-testid="rarity-flash"
          />
        )}
      </AnimatePresence>

      {/* States 1-3: box centered */}
      {(state === 'anticipation' || state === 'buildup' || state === 'crack') && (
        <BigBox boxId={boxId} state={state} onClick={beginOpen} />
      )}

      {/* State 4-5: reward grid */}
      {(state === 'reveal' || state === 'settle') && (
        <div className="w-full max-w-md px-6 flex flex-col items-center justify-center" data-testid="rewards-grid">
          <div
            className={`grid w-full ${rolledItems.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}
            style={{ gap: 12 }}
          >
            {rolledItems.map((it, i) => (
              <RewardCard key={i} item={it} index={i} totalCount={rolledItems.length} />
            ))}
          </div>

          {/* Continue button — appears only after settle */}
          <AnimatePresence>
            {state === 'settle' && (
              <motion.button
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                onClick={onContinue}
                className="mt-8 px-10 py-3 rounded-2xl font-bold text-sm transition-transform active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(180deg, #2C7BFF 0%, #1B6AE4 100%)',
                  color: '#FFFFFF',
                  boxShadow: '0 0 24px rgba(59, 130, 246, 0.35)',
                  letterSpacing: '0.08em',
                }}
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
