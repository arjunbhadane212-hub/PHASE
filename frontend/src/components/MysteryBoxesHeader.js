import { Gem, Star } from 'lucide-react';
import PhaseBoxArt, { tierFor } from './PhaseBoxArt';

// Single source of truth for box data — shared across all shop tabs
export const MYSTERY_BOXES = [
  { id: 'starter', label: 'STARTER', cost: 100, starred: false },
  { id: 'delta', label: 'DELTA', cost: 500, starred: false },
  { id: 'phase', label: 'PHASE', cost: 2000, starred: true, legendary: true },
];

function BoxCard({ box, onOpen }) {
  const t = tierFor(box.id);
  const legendary = !!t.legendary;

  return (
    <div className="flex flex-col items-center gap-2" data-testid={`mystery-box-${box.id}`}>
      <button
        onClick={() => onOpen?.(box.id)}
        className={`relative w-full aspect-[2/3] overflow-hidden rounded-[22px] transition-transform active:scale-[0.97] hover:scale-[1.03] ${legendary ? 'phase-legendary-pulse' : ''}`}
        style={{
          background: `radial-gradient(ellipse at 50% 38%, rgba(${t.rgb}, ${legendary ? 0.24 : 0.12}) 0%, rgba(9, 12, 18, 0.98) 68%)`,
          border: `1.5px solid rgba(${t.rgb}, ${legendary ? 0.9 : 0.5})`,
          boxShadow: legendary
            ? undefined // owned by the pulse animation
            : `0 0 22px rgba(${t.rgb}, 0.22), inset 0 0 28px rgba(${t.rgb}, 0.08)`,
        }}
        data-testid={`mystery-box-${box.id}-btn`}
        aria-label={`Open ${box.label} box`}
      >
        {/* Legendary rotating light rays */}
        {legendary && (
          <div
            className="phase-rays"
            style={{
              background: `conic-gradient(from 0deg, transparent 0 14deg, rgba(${t.rgb},0.14) 14deg 20deg, transparent 20deg 34deg, rgba(149,222,230,0.10) 34deg 40deg, transparent 40deg 54deg)`,
            }}
          />
        )}

        {/* Shimmer sweep — legendary only */}
        {legendary && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ borderRadius: '22px' }}>
            <div className="phase-shimmer-sweep" />
          </div>
        )}

        {/* Box art — gently floating */}
        <div className="absolute inset-0 flex items-center justify-center p-[16%] pb-[26%]">
          <PhaseBoxArt tier={box.id} className={`w-full h-full ${legendary ? 'animate-float' : ''}`} />
        </div>

        {/* Gem-cost pill at bottom */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(9, 12, 18, 0.82)', border: `1px solid rgba(${t.rgb}, 0.55)` }}
            data-testid={`mystery-box-${box.id}-cost`}
          >
            <Gem className="w-3 h-3" style={{ color: t.edge }} strokeWidth={2.4} />
            <span className="text-[11px] font-['JetBrains_Mono'] font-bold tabular-nums leading-none" style={{ color: t.edge }}>
              {box.cost}
            </span>
          </div>
        </div>
      </button>

      {/* Label pill BELOW the box */}
      <div
        className="flex items-center gap-1 px-2.5 py-0.5 rounded-md"
        style={{ background: 'rgba(9, 12, 18, 0.7)', border: `1px solid rgba(${t.rgb}, 0.45)` }}
      >
        {box.starred && <Star className="w-2.5 h-2.5" style={{ color: t.edge }} fill={t.edge} strokeWidth={0} />}
        <span
          className="text-[11px] font-['JetBrains_Mono'] font-bold uppercase leading-none"
          style={{ color: t.edge, letterSpacing: '0.18em' }}
        >
          {box.label}
        </span>
      </div>
    </div>
  );
}

export default function MysteryBoxesHeader({ onOpenBox }) {
  return (
    <div
      className="w-full"
      style={{ paddingLeft: 16, paddingRight: 16 }}
      data-testid="mystery-boxes-header"
    >
      <div className="grid grid-cols-3" style={{ gap: 12 }}>
        {MYSTERY_BOXES.map(box => (
          <BoxCard key={box.id} box={box} onOpen={onOpenBox} />
        ))}
      </div>
    </div>
  );
}
