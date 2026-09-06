import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, Gem, Star, Lock } from 'lucide-react';
import { groupPoolByTier, TIER_META } from '../data/boxDrops';
import PhaseBoxArt, { tierFor } from './PhaseBoxArt';

// =============================================================================
// Large box illustration — the shared v2 crystal-box art, scaled up.
// =============================================================================
function LargeBoxArt({ boxId }) {
  const t = tierFor(boxId);
  return (
    <div
      className={`relative ${t.legendary ? 'animate-float' : ''}`}
      style={{ width: 'min(60vw, 240px)', height: 'min(60vw, 240px)' }}
      data-testid={`box-modal-art-${boxId}`}
    >
      <PhaseBoxArt tier={boxId} className="w-full h-full" />
    </div>
  );
}

// =============================================================================
// Item row — single drop entry in the drop-rates list.
// =============================================================================
function DropRow({ item }) {
  return (
    <div
      className="flex items-center justify-between py-1.5"
      data-testid={`drop-row-${item.id}`}
    >
      <span className="text-[13px] font-['General_Sans'] font-medium tracking-wide text-[color:var(--gm-ink)]">
        {item.name}
        {item.shared && (
          <span className="ml-1.5 text-[10px] text-[color:var(--gm-muted)] font-bold tracking-widest uppercase">
            · shared
          </span>
        )}
      </span>
      <span className="text-[13px] font-['JetBrains_Mono'] font-bold tabular-nums text-[color:var(--gm-muted)]">
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
        return (
          <div key={tier} data-testid={`drop-tier-${tier}`}>
            <div className="flex items-baseline justify-between mb-2 pb-1.5 border-b border-[color:var(--gm-track)]">
              <span className="text-[11px] font-['JetBrains_Mono'] font-black uppercase tracking-[0.22em] text-[color:var(--gm-ink)]">
                {TIER_META[tier].label}
              </span>
              <span className="text-[11px] font-['JetBrains_Mono'] font-bold tabular-nums text-[color:var(--gm-muted)]">
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
      <div className="pt-4 mt-2 border-t border-[color:var(--gm-track)] text-[11px] leading-relaxed text-[color:var(--gm-muted)]">
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
export default function BoxDetailModal({ box, onClose, onOpen, userGems = 0 }) {
  const [showRates, setShowRates] = useState(false);

  // Lock body scroll while open
  useEffect(() => {
    if (!box) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [box]);

  // Reset collapsible when switching boxes
  useEffect(() => { setShowRates(false); }, [box?.id]);

  // ESC closes
  useEffect(() => {
    if (!box) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [box, onClose]);

  const canAfford = box ? userGems >= box.cost : false;

  return createPortal(
    <AnimatePresence>
      {box && (
        <>
          {/* Scrim — separate sibling, catches taps to dismiss */}
          <motion.div
            key="box-modal-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 0, 0, 0.75)',
              zIndex: 1000,
              cursor: 'pointer',
              pointerEvents: 'auto',
            }}
            data-testid="box-detail-modal-scrim"
            aria-label="Close modal"
          />

          {/* Fixed viewport-anchored wrapper — flex-centers the card */}
          <div
            key="box-modal-wrapper"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1001,
              pointerEvents: 'none', // let taps around the card fall through to scrim
            }}
            data-testid="box-detail-modal"
          >
            <motion.div
              initial={{ y: 24, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 24, opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="relative flex flex-col"
              style={{
                width: '85%',
                maxWidth: 420,
                height: 'auto',
                borderRadius: 24,
                background: 'var(--gm-card)',
                padding: '32px 24px',
                boxShadow: 'var(--gm-shadow-card)',
                pointerEvents: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
              data-testid={`box-detail-modal-${box?.id}`}
            >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-colors bg-[color:var(--gm-badge)] hover:brightness-95"
              data-testid="box-modal-close-btn"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-[color:var(--gm-ink)]" />
            </button>

            {/* Hero: box art */}
            <div className="pt-12 pb-6 flex flex-col items-center px-6">
              <LargeBoxArt boxId={box.id} />

              {/* Name */}
              <div className="mt-6 flex items-center gap-2" data-testid="box-modal-name">
                {box.id === 'phase' && (
                  <Star className="w-3.5 h-3.5 text-[color:var(--gm-muted)]" fill="currentColor" strokeWidth={0} />
                )}
                <h2
                  className="text-[11px] font-['JetBrains_Mono'] font-black uppercase leading-none text-[color:var(--gm-muted)]"
                  style={{ letterSpacing: '0.22em' }}
                >
                  {box.label}
                </h2>
              </div>
              <h1 className="mt-2 text-2xl font-['Archivo'] font-black text-[color:var(--gm-ink)] text-center">
                {box.name}
              </h1>
              <p className="mt-1 text-[12px] text-[color:var(--gm-muted)] text-center">
                Drops {box.dropsPerOpen} items per open
              </p>

              {/* Cost */}
              <div
                className="mt-5 flex items-center gap-1.5 px-4 py-2 rounded-full bg-[color:var(--gm-badge)]"
                data-testid="box-modal-cost"
              >
                <Gem className="w-4 h-4 text-[#95DEE6]" strokeWidth={2.4} />
                <span className="text-[15px] font-['JetBrains_Mono'] font-bold text-[color:var(--gm-ink)] tabular-nums leading-none">
                  {box.cost}
                </span>
              </div>
            </div>

            {/* Primary CTA */}
            <div className="px-6 pb-4">
              <button
                onClick={() => onOpen?.(box.id)}
                disabled={!canAfford}
                className={`w-full py-3.5 rounded-2xl font-['General_Sans'] font-bold text-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  canAfford ? 'bg-[#95DEE6] text-[#183A3F]' : 'bg-[color:var(--gm-badge)] text-[color:var(--gm-muted)]'
                }`}
                style={{ letterSpacing: '0.04em' }}
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
                className="w-full flex items-center justify-between py-3 px-4 rounded-xl transition-colors bg-[color:var(--gm-badge)] hover:brightness-95"
                data-testid="drop-rates-toggle"
                aria-expanded={showRates}
              >
                <span className="text-[12px] font-['JetBrains_Mono'] font-bold text-[color:var(--gm-ink)] uppercase tracking-[0.16em]">
                  View Drop Rates
                </span>
                <motion.span
                  animate={{ rotate: showRates ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center"
                >
                  <ChevronDown className="w-4 h-4 text-[color:var(--gm-muted)]" />
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
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
