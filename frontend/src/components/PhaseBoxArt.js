// Shared loot-box artwork (v4 — cyan/lime UI match).
// A flat-faceted isometric parcel whose whole body is built from the tier's own
// UI colour (steel / cyan / lime) in three solid face shades — no gradient
// shine, no glow filter at rest. The lid is a separate group so the opening
// sequence can lift/blow it off, revealing an inner light (only while opening).
export const BOX_TIERS = {
  starter: { key: 'starter', label: 'STARTER', accent: '#9BA09C',
    top: '#C9CCC6', right: '#9BA09C', left: '#5F625F', edge: '#E4E6E1', ink: '#20242A', glow: '#E4E6E1' },
  delta: { key: 'delta', label: 'DELTA', accent: '#95DEE6',
    top: '#95DEE6', right: '#5AAAB4', left: '#2C6870', edge: '#C7F0F5', ink: '#0C2A2E', glow: '#C7F0F5' },
  phase: { key: 'phase', label: 'PHASE', accent: '#DBF67F', legendary: true,
    top: '#DBF67F', right: '#A6C64B', left: '#59691F', edge: '#ECFAB8', ink: '#26310A', glow: '#ECFAB8' },
};

export const tierFor = (id) => BOX_TIERS[id] || BOX_TIERS.starter;

export default function PhaseBoxArt({ tier = 'starter', className = '', style, lidLift = 0, lidSpin = 0 }) {
  const t = tierFor(tier);
  const lidY = -lidLift * 34;            // px in viewBox units the lid rises
  const gapOpacity = Math.min(lidLift * 1.1, 1);
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true" style={{ overflow: 'visible', ...style }}>
      {/* ---- Body: two flat side faces (the tier colour) ---- */}
      <path d="M18 40 L60 64 L60 106 L18 82 Z" fill={t.left} />
      <path d="M60 64 L102 40 L102 82 L60 106 Z" fill={t.right} />

      {/* ---- Inner light in the mouth — only visible as the lid lifts ---- */}
      {lidLift > 0.01 && (
        <path d="M60 21 L96 40 L60 59 L24 40 Z" fill={t.glow} opacity={gapOpacity} />
      )}

      {/* ---- Body top rim (the open mouth edge) ---- */}
      <path d="M60 15 L102 39 L60 63 L18 39 Z" fill="none" stroke={t.edge} strokeWidth="1" opacity={lidLift > 0.01 ? 0.9 : 0} />

      {/* ---- Lid group (lifts / spins off) ---- */}
      <g style={{ transform: `translateY(${lidY}px) rotate(${lidSpin}deg)`, transformOrigin: '60px 39px', transition: 'transform 0.28s cubic-bezier(.2,1.3,.3,1)' }}>
        <path d="M60 15 L102 39 L60 63 L18 39 Z" fill={t.top} />
        <path d="M60 15 L18 39 L60 63 Z" fill={t.left} opacity="0.5" />
        <path d="M60 15 L102 39 L60 63 L18 39 Z" fill="none" stroke={t.edge} strokeWidth="2" strokeLinejoin="round" />
        <line x1="60" y1="15" x2="60" y2="63" stroke={t.edge} strokeWidth="1.2" opacity="0.45" />
      </g>

      {/* ---- Body vertical + side edges (quiet, darker) ---- */}
      <line x1="60" y1="63" x2="60" y2="106" stroke={t.left} strokeWidth="1.6" opacity="0.9" />
      <path d="M18 39 L18 82 M102 39 L102 82" stroke={t.left} strokeWidth="1.1" opacity="0.7" fill="none" />

      {/* ---- Front emblem: flat diamond in the tier's dark ink (no glow) ---- */}
      <path d="M82 66 L88 74 L82 88 L76 74 Z" fill={t.ink} opacity="0.9" />
    </svg>
  );
}
