import { Gem, Star } from 'lucide-react';

// Single source of truth for box data — shared across all shop tabs
export const MYSTERY_BOXES = [
  {
    id: 'starter',
    label: 'STARTER',
    cost: 100,
    borderOpacity: 0.6,
    glowOpacity: 0.18,
    innerGlowOpacity: 0.08,
    starred: false,
  },
  {
    id: 'delta',
    label: 'DELTA',
    cost: 500,
    borderOpacity: 0.85,
    glowOpacity: 0.28,
    innerGlowOpacity: 0.14,
    starred: false,
  },
  {
    id: 'phase',
    label: 'PHASE',
    cost: 2000,
    borderOpacity: 1.0,
    glowOpacity: 0.4,
    innerGlowOpacity: 0.22,
    starred: true,
    shimmer: true,
  },
];

// Placeholder box icon — controlled SVG, no stock VFX. Final art will be swapped in.
function BoxIcon({ tierIntensity = 0.6 }) {
  const lid = `rgba(77, 142, 240, ${0.55 + tierIntensity * 0.35})`;
  const body = `rgba(27, 106, 228, ${0.18 + tierIntensity * 0.22})`;
  const stroke = `rgba(77, 142, 240, ${0.7 + tierIntensity * 0.3})`;
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
      <defs>
        <linearGradient id={`box-grad-${tierIntensity}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={body} />
          <stop offset="100%" stopColor="rgba(10,14,20,0.95)" />
        </linearGradient>
      </defs>
      {/* Box body */}
      <path
        d="M20 50 L60 35 L100 50 L100 95 L60 110 L20 95 Z"
        fill={`url(#box-grad-${tierIntensity})`}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Box lid top face */}
      <path
        d="M20 50 L60 35 L100 50 L60 65 Z"
        fill={lid}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Center vertical seam */}
      <line x1="60" y1="65" x2="60" y2="110" stroke={stroke} strokeWidth="1" opacity="0.6" />
      {/* Subtle ribbon highlight */}
      <path d="M55 35 L55 65 L65 65 L65 35 Z" fill={`rgba(77, 142, 240, ${0.35 + tierIntensity * 0.25})`} opacity="0.7" />
      <line x1="60" y1="35" x2="60" y2="65" stroke={stroke} strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

function BoxCard({ box, onOpen }) {
  const borderColor = `rgba(59, 130, 246, ${box.borderOpacity})`;
  const outerGlow = `0 0 24px rgba(59, 130, 246, ${box.glowOpacity})`;
  const innerGlow = `inset 0 0 32px rgba(59, 130, 246, ${box.innerGlowOpacity})`;
  const tierIntensity = box.borderOpacity; // 0.6, 0.85, 1.0

  return (
    <div className="flex flex-col items-center gap-2" data-testid={`mystery-box-${box.id}`}>
      <button
        onClick={() => onOpen?.(box.id)}
        className="relative w-full aspect-[2/3] overflow-hidden transition-transform active:scale-[0.97] hover:scale-[1.02]"
        style={{
          background: '#0A0E14',
          border: `1.5px solid ${borderColor}`,
          borderRadius: '20px',
          boxShadow: `${outerGlow}, ${innerGlow}`,
        }}
        data-testid={`mystery-box-${box.id}-btn`}
        aria-label={`Open ${box.label} box`}
      >
        {/* Inner radial backdrop — controlled, no stock VFX */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center 40%, rgba(59, 130, 246, ${0.06 + tierIntensity * 0.08}) 0%, transparent 65%)`,
          }}
        />

        {/* Shimmer sweep — only for PHASE tier */}
        {box.shimmer && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ borderRadius: '20px' }}>
            <div className="phase-shimmer-sweep" />
          </div>
        )}

        {/* Box icon centered */}
        <div className="absolute inset-0 flex items-center justify-center p-[18%] pb-[28%]">
          <BoxIcon tierIntensity={tierIntensity} />
        </div>

        {/* Gem-cost pill at bottom */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full"
            style={{
              background: 'rgba(10, 14, 20, 0.85)',
              border: `1px solid rgba(59, 130, 246, ${0.45 + tierIntensity * 0.3})`,
              backdropFilter: 'blur(6px)',
            }}
            data-testid={`mystery-box-${box.id}-cost`}
          >
            <Gem className="w-3 h-3 text-[#4D8EF0]" strokeWidth={2.4} />
            <span className="text-[11px] font-bold text-[#A6C7FF] tabular-nums leading-none">
              {box.cost}
            </span>
          </div>
        </div>
      </button>

      {/* Label pill BELOW the box */}
      <div
        className="flex items-center gap-1 px-2.5 py-0.5 rounded-md"
        style={{
          background: 'rgba(10, 14, 20, 0.7)',
          border: `1px solid rgba(59, 130, 246, ${box.borderOpacity * 0.5})`,
        }}
      >
        {box.starred && <Star className="w-2.5 h-2.5 text-[#A6C7FF]" fill="#A6C7FF" strokeWidth={0} />}
        <span
          className="text-[11px] font-bold uppercase leading-none"
          style={{
            color: '#DCE7FA',
            letterSpacing: '0.18em',
          }}
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
