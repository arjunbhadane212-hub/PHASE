// Shared loot-box artwork (v2). A bright, glowing crystal vault — one component,
// tier-driven, cyan/lime only (no purple). Starter = cyan, Delta = lime,
// Phase = legendary cyan body + lime lid with a white-hot core.
export const BOX_TIERS = {
  starter: { key: 'starter', label: 'STARTER', edge: '#BFF0F5', lid: '#A8E8EF', faceTop: '#6FCAD6', faceBot: '#123E44', core: '#EAFDFF', rgb: '149,222,230' },
  delta:   { key: 'delta',   label: 'DELTA',   edge: '#EDFBB0', lid: '#E6FB9C', faceTop: '#C2E86A', faceBot: '#35461A', core: '#F7FFDC', rgb: '219,246,127' },
  phase:   { key: 'phase',   label: 'PHASE',   edge: '#E6FB9C', lid: '#E6FB9C', faceTop: '#95DEE6', faceBot: '#173F45', core: '#FFFFFF', rgb: '219,246,127', legendary: true },
};

export const tierFor = (id) => BOX_TIERS[id] || BOX_TIERS.starter;

export default function PhaseBoxArt({ tier = 'starter', className = '', style }) {
  const t = tierFor(tier);
  const g = `pb-${t.key}`;
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      aria-hidden="true"
      style={{ filter: `drop-shadow(0 0 20px rgba(${t.rgb},0.6))`, overflow: 'visible', ...style }}
    >
      <defs>
        <linearGradient id={`${g}-fl`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.faceTop} stopOpacity="0.95" />
          <stop offset="100%" stopColor={t.faceBot} stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id={`${g}-fr`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.faceTop} stopOpacity="1" />
          <stop offset="100%" stopColor={t.faceBot} stopOpacity="1" />
        </linearGradient>
        <linearGradient id={`${g}-lid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.lid} stopOpacity="1" />
          <stop offset="100%" stopColor={t.faceTop} stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id={`${g}-core`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={t.core} stopOpacity="1" />
          <stop offset="45%" stopColor={t.lid} stopOpacity="0.6" />
          <stop offset="100%" stopColor={t.lid} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Body — bright glowing faces (left dimmer than right for depth) */}
      <path d="M20 43 L60 66 L60 108 L20 85 Z" fill={`url(#${g}-fl)`} stroke={t.edge} strokeWidth="2" strokeLinejoin="round" opacity="0.9" />
      <path d="M60 66 L100 43 L100 85 L60 108 Z" fill={`url(#${g}-fr)`} stroke={t.edge} strokeWidth="2" strokeLinejoin="round" />

      {/* Faceted glossy lid */}
      <path d="M60 20 L100 43 L60 43 Z" fill={`url(#${g}-lid)`} stroke={t.edge} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M60 20 L20 43 L60 43 Z" fill={`url(#${g}-lid)`} stroke={t.edge} strokeWidth="1.8" strokeLinejoin="round" opacity="0.82" />
      <path d="M20 43 L60 66 L60 43 Z" fill={t.faceTop} stroke={t.edge} strokeWidth="1.4" strokeLinejoin="round" opacity="0.55" />
      <path d="M100 43 L60 66 L60 43 Z" fill={t.faceTop} stroke={t.edge} strokeWidth="1.4" strokeLinejoin="round" opacity="0.72" />

      {/* Luminous core */}
      <circle cx="60" cy="62" r="24" fill={`url(#${g}-core)`} />

      {/* Bright rim highlights on the top edges */}
      <path d="M60 20 L100 43 M60 20 L20 43" stroke={t.core} strokeWidth="1.4" opacity="0.85" fill="none" strokeLinecap="round" />

      {/* Front seam */}
      <line x1="60" y1="66" x2="60" y2="108" stroke={t.edge} strokeWidth="1.2" opacity="0.65" />

      {/* Glowing gem emblem on the front */}
      <path d="M60 74 L69 85 L60 101 L51 85 Z" fill={t.core} stroke={t.edge} strokeWidth="1.2"
        style={{ filter: `drop-shadow(0 0 6px ${t.edge})` }} />
      <path d="M51 85 L69 85" stroke={t.faceBot} strokeWidth="1" opacity="0.5" />
    </svg>
  );
}
