import { Gem, Star } from 'lucide-react';
import PhaseBoxArt, { tierFor } from './PhaseBoxArt';

// Single source of truth for box data — shared across all shop tabs
export const MYSTERY_BOXES = [
  { id: 'starter', label: 'STARTER', cost: 100, starred: false },
  { id: 'delta', label: 'DELTA', cost: 500, starred: false },
  { id: 'phase', label: 'PHASE', cost: 2000, starred: true, legendary: true },
];

// v3 — flat card treatment, matching the rest of the v2 UI (solid --gm-card
// fill + real elevation shadow, no neon glow / rays / shimmer / pulse). Tier
// identity is carried by ONE restrained accent: the box emblem, the label
// colour, and — for Phase only — a persistent thin accent border (prestige
// cue, no animation).
function BoxCard({ box, onOpen }) {
  const t = tierFor(box.id);
  const a = t.accent;
  const legendary = !!t.legendary;

  return (
    <div className="flex flex-col items-center gap-2" data-testid={`mystery-box-${box.id}`}>
      <button
        onClick={() => onOpen?.(box.id)}
        className={`relative w-full aspect-[2/3] overflow-hidden rounded-[22px] bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] border transition-all duration-200 active:scale-[0.97] ${
          legendary
            ? 'border-[#DBF67F]/35 hover:border-[#DBF67F]/60'
            : 'border-transparent hover:border-[var(--gm-track)]'
        }`}
        data-testid={`mystery-box-${box.id}-btn`}
        aria-label={`Open ${box.label} box`}
      >
        {/* Box art — centered, sitting flat on the card */}
        <div className="absolute inset-0 flex items-center justify-center p-[16%] pb-[26%]">
          <PhaseBoxArt tier={box.id} className="w-full h-full" />
        </div>

        {/* Gem-cost pill at bottom */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--gm-badge)]"
            data-testid={`mystery-box-${box.id}-cost`}
          >
            <Gem className="w-3 h-3 text-[#95DEE6]" strokeWidth={2.4} />
            <span className="text-[11px] font-['JetBrains_Mono'] font-bold tabular-nums leading-none text-[var(--gm-ink)]">
              {box.cost}
            </span>
          </div>
        </div>
      </button>

      {/* Label BELOW the box — tier accent carries the identity */}
      <div className="flex items-center gap-1 leading-none">
        {box.starred && <Star className="w-2.5 h-2.5" style={{ color: a }} fill={a} strokeWidth={0} />}
        <span
          className="text-[11px] font-['JetBrains_Mono'] font-bold uppercase leading-none"
          style={{ color: a, letterSpacing: '0.18em' }}
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
