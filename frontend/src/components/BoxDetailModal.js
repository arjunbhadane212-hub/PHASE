import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, Gem, Star, Lock } from 'lucide-react';
import { BOXES_BY_ID, groupPoolByTier, TIER_META } from '../data/boxDrops';

// =============================================================================
// Large box illustration — scaled-up version of the header card icon.
// Tier intensity drives blue saturation; no purple, no stock VFX.
// =============================================================================
function LargeBoxArt({ boxId }) {
  const intensity = boxId === 'phase' ? 1.0 : boxId === 'delta' ? 0.85 : 0.6;
  const lid = `rgba(77, 142, 240, ${0.55 + intensity * 0.35})`;
  const body = `rgba(27, 106, 228, ${0.18 + intensity * 0.22})`;
  const stroke = `rgba(77, 142, 240, ${0.7 + intensity * 0.3})`;
  return (
    <div
      className="relative"
      style={{
        width: 'min(60vw, 240px)',
        height: 'min(60vw, 240px)',
        filter: `drop-shadow(0 0 32px rgba(59, 130, 246, ${0.25 + intensity * 0.25}))`,
      }}
      data-testid={`box-modal-art-${boxId}`}
    >
      <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
        <defs>
          <linearGradient id={`box-grad-large-${boxId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={body} />
            <stop offset="100%" stopColor="rgba(10,14,20,0.95)" />
          </linearGradient>
        </defs>
        <path
          d="M20 50 L60 35 L100 50 L100 95 L60 110 L20 95 Z"
          fill={`url(#box-grad-large-${boxId})`}
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M20 50 L60 35 L100 50 L60 65 Z"
          fill={lid}
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <line x1="60" y1="65" x2="60" y2="110" stroke={stroke} strokeWidth="1" opacity="0.6" />
        <path
          d="M55 35 L55 65 L65 65 L65 35 Z"
          fill={`rgba(77, 142, 240, ${0.35 + intensity * 0.25})`}
          opacity="0.7"
        />
        <line x1="60" y1="35" x2="60" y2="65" stroke={stroke} strokeWidth="1" opacity="0.5" />
      </svg>
    </div>
  );
}

// =============================================================================
// Item row — single drop entry in the drop-rates list.
// =============================================================================
function DropRow({ item }) {
  const tierColorClass =
    item.tier === 'common' ? 'text-white' :
    item.tier === 'rare'   ? '' :
                             'ur-pulse-text';
  const tierStyle =
    item.tier === 'rare'  ? { color: '#3B82F6' } :
    item.tier === 'ultra' ? { color: '#BFD9FF' } :
                            undefined;
  return (
    <div
      className="flex items-center justify-between py-1.5"
      data-testid={`drop-row-${item.id}`}
    >
      <span
        className={`text-[13px] font-medium tracking-wide ${tierColorClass}`}
        style={tierStyle}
      >
        {item.name}
        {item.shared && (
          <span className="ml-1.5 text-[10px] text-zinc-500 font-bold tracking-widest uppercase">
            · shared
          </span>
        )}
      </span>
      <span
        className={`text-[13px] font-bold tabular-nums ${tierColorClass}`}
        style={tierStyle}
      >
        {item.percent.toFixed(1)}%
      </span>
    </div>
  );
}

// =============================================================================
// Drop-rates section — grouped by tier, fully expanded once toggled open.
// =============================================================================
function DropRatesSection({ box }) {
  const groups = useMemo(() => groupPoolByTier(box), [box]);
  return (
    <div className="space-y-5" data-testid="drop-rates-list">
      {groups.map(({ tier, items }) => {
        const tierTotal = items.reduce((s, i) => s + i.percent, 0);
        const headerColorClass =
          tier === 'common' ? 'text-white/90' :
          tier === 'rare'   ? '' :
                              'ur-pulse-text';
        const headerStyle =
          tier === 'rare'  ? { color: '#3B82F6' } :
          tier === 'ultra' ? { color: '#BFD9FF' } :
                             undefined;
        return (
          <div key={tier} data-testid={`drop-tier-${tier}`}>
            <div className="flex items-baseline justify-between mb-2 pb-1.5 border-b border-white/5">
              <span
                className={`text-[11px] font-black uppercase tracking-[0.22em] ${headerColorClass}`}
                style={headerStyle}
              >
                {TIER_META[tier].label}
              </span>
              <span
                className={`text-[11px] font-bold tabular-nums ${headerColorClass}`}
                style={headerStyle}
              >
                {tierTotal.toFixed(1)}%
              </span>
            </div>
            <div className="space-y-0">
              {items.map((item) => <DropRow key={item.id} item={item} />)}
            </div>
          </div>
        );
      })}

      {/* Disclosure footer — Apple/Google loot box compliance */}
      <div className="pt-4 mt-2 border-t border-white/5 text-[11px] leading-relaxed text-zinc-500">
        <p>
          Drop rates are exact and apply to every box opened. Each item in this
          box has an independent chance to drop based on the rate shown above.
          Owned/duplicate items follow the standard duplicate policy.
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Main modal
// =============================================================================
export default function BoxDetailModal({ boxId, onClose, onOpen, userGems = 0 }) {
  const box = boxId ? BOXES_BY_ID[boxId] : null;
  const [showRates, setShowRates] = useState(false);

  // Lock body scroll while open
  useEffect(() => {
    if (!box) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [box]);

  // Reset collapsible when switching boxes
  useEffect(() => { setShowRates(false); }, [boxId]);

  // ESC closes
  useEffect(() => {
    if (!box) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [box, onClose]);

  const canAfford = box ? userGems >= box.cost : false;

  return (
    <AnimatePresence>
      {box && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-stretch justify-center"
          style={{ background: 'rgba(5, 8, 13, 0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
          data-testid="box-detail-modal"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="relative w-full max-w-md mx-auto flex flex-col overflow-y-auto"
            style={{
              background: '#0A0E14',
              borderLeft: '1px solid rgba(59, 130, 246, 0.18)',
              borderRight: '1px solid rgba(59, 130, 246, 0.18)',
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid={`box-detail-modal-${boxId}`}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              data-testid="box-modal-close-btn"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>

            {/* Hero: box art */}
            <div className="pt-12 pb-6 flex flex-col items-center px-6">
              <LargeBoxArt boxId={box.id} />

              {/* Name */}
              <div className="mt-6 flex items-center gap-2" data-testid="box-modal-name">
                {box.id === 'phase' && (
                  <Star className="w-3.5 h-3.5 text-[#BFD9FF]" fill="#BFD9FF" strokeWidth={0} />
                )}
                <h2
                  className="text-[11px] font-black uppercase leading-none"
                  style={{ color: '#DCE7FA', letterSpacing: '0.22em' }}
                >
                  {box.label}
                </h2>
              </div>
              <h1
                className="mt-2 text-2xl font-black text-white text-center"
                style={{ fontFamily: "'Satoshi', sans-serif" }}
              >
                {box.name}
              </h1>
              <p className="mt-1 text-[12px] text-zinc-500 text-center">
                Drops {box.dropsPerOpen} items per open
              </p>

              {/* Cost */}
              <div
                className="mt-5 flex items-center gap-1.5 px-4 py-2 rounded-full"
                style={{ background: 'rgba(10, 14, 20, 0.85)', border: '1px solid rgba(59, 130, 246, 0.4)' }}
                data-testid="box-modal-cost"
              >
                <Gem className="w-4 h-4 text-[#4D8EF0]" strokeWidth={2.4} />
                <span className="text-[15px] font-bold text-[#A6C7FF] tabular-nums leading-none">
                  {box.cost}
                </span>
              </div>
            </div>

            {/* Primary CTA */}
            <div className="px-6 pb-4">
              <button
                onClick={() => onOpen?.(box.id)}
                disabled={!canAfford}
                className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  background: canAfford
                    ? 'linear-gradient(180deg, #2C7BFF 0%, #1B6AE4 100%)'
                    : 'rgba(27, 106, 228, 0.2)',
                  color: '#FFFFFF',
                  boxShadow: canAfford ? '0 0 24px rgba(59, 130, 246, 0.35)' : 'none',
                  letterSpacing: '0.04em',
                }}
                data-testid="box-modal-open-btn"
              >
                {canAfford ? (
                  <>Open Box</>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    Need {box.cost - userGems} more gems
                  </>
                )}
              </button>
            </div>

            {/* Collapsible: View Drop Rates */}
            <div className="px-6 pb-12">
              <button
                onClick={() => setShowRates((v) => !v)}
                className="w-full flex items-center justify-between py-3 px-4 rounded-xl transition-colors hover:bg-white/[0.03]"
                style={{ background: 'rgba(10, 14, 20, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
                data-testid="drop-rates-toggle"
                aria-expanded={showRates}
              >
                <span className="text-[12px] font-bold text-zinc-300 uppercase tracking-[0.16em]">
                  View Drop Rates
                </span>
                <motion.span
                  animate={{ rotate: showRates ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center"
                >
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {showRates && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="pt-5 pb-2">
                      <DropRatesSection box={box} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
