// Shared loot-box artwork (v2 structural rework). A faceted, glowing crystal
// vault — one component, tier-driven. Starter = cyan, Delta = purple, Phase =
// legendary lime. Used by the shop grid, the detail modal, and the opening.
export const BOX_TIERS = {
  starter: { key: 'starter', label: 'STARTER', edge: '#95DEE6', mid: '#245A61', core: '#E4FBFE', rgb: '149,222,230' },
  delta:   { key: 'delta',   label: 'DELTA',   edge: '#BBA9EC', mid: '#352A57', core: '#EFE9FE', rgb: '165,155,204' },
  phase:   { key: 'phase',   label: 'PHASE',   edge: '#DBF67F', mid: '#3A4A12', core: '#F6FFD6', rgb: '219,246,127', legendary: true },
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
      style={{ filter: `drop-shadow(0 0 16px rgba(${t.rgb},0.55))`, overflow: 'visible', ...style }}
    >
      <defs>
        <linearGradient id={`${g}-face`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.mid} stopOpacity="0.95" />
          <stop offset="100%" stopColor="#080B10" stopOpacity="0.98" />
        </linearGradient>
        <linearGradient id={`${g}-lid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.edge} stopOpacity="0.9" />
          <stop offset="100%" stopColor={t.mid} stopOpacity="0.92" />
        </linearGradient>
        <radialGradient id={`${g}-core`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={t.core} stopOpacity="1" />
          <stop offset="55%" stopColor={t.edge} stopOpacity="0.45" />
          <stop offset="100%" stopColor={t.edge} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Body — left + right faces (right slightly brighter for depth) */}
      <path d="M20 43 L60 66 L60 108 L20 85 Z" fill={`url(#${g}-face)`} stroke={t.edge} strokeWidth="1.6" strokeLinejoin="round" opacity="0.92" />
      <path d="M60 66 L100 43 L100 85 L60 108 Z" fill={`url(#${g}-face)`} stroke={t.edge} strokeWidth="1.6" strokeLinejoin="round" />

      {/* Faceted lid — four triangles catching light at different intensities */}
      <path d="M60 20 L100 43 L60 43 Z" fill={`url(#${g}-lid)`} stroke={t.edge} strokeWidth="1.4" strokeLinejoin="round" opacity="0.98" />
      <path d="M60 20 L20 43 L60 43 Z" fill={`url(#${g}-lid)`} stroke={t.edge} strokeWidth="1.4" strokeLinejoin="round" opacity="0.78" />
      <path d="M20 43 L60 66 L60 43 Z" fill={t.mid} stroke={t.edge} strokeWidth="1.3" strokeLinejoin="round" opacity="0.62" />
      <path d="M100 43 L60 66 L60 43 Z" fill={t.mid} stroke={t.edge} strokeWidth="1.3" strokeLinejoin="round" opacity="0.85" />

      {/* Glowing core where the lid meets the body */}
      <circle cx="60" cy="64" r="19" fill={`url(#${g}-core)`} />

      {/* Front vertical seam */}
      <line x1="60" y1="66" x2="60" y2="108" stroke={t.edge} strokeWidth="1.1" opacity="0.6" />

      {/* Emblem — a bright faceted gem on the front */}
      <path d="M60 76 L68 86 L60 100 L52 86 Z" fill={t.core} stroke={t.edge} strokeWidth="1"
        style={{ filter: `drop-shadow(0 0 5px ${t.edge})` }} />
      <path d="M52 86 L68 86" stroke={t.edge} strokeWidth="0.8" opacity="0.7" />
    </svg>
  );
}
