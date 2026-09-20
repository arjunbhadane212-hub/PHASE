// Shared loot-box artwork (v3 — "solid object" redesign).
// A matte graphite parcel rendered as a flat-faceted isometric cube: no glow
// filters, no luminous core, no gradients-as-light. Depth comes from three flat
// face tones only. Tier is signalled by ONE restrained accent (steel / cyan /
// lime) on the lid seam + a small front emblem — matching how the rest of the
// v2 UI puts a single accent on a flat surface. Elevation is the card's job
// (--gm-shadow-*), not the art's.
//
// The graphite body is intentionally theme-invariant (like the cyan streak card
// and lime completed rows): the same premium object reads well on both the dark
// #1F2123 and light #F2F3F0 cards it sits on.
export const BOX_TIERS = {
  starter: { key: 'starter', label: 'STARTER', accent: '#9BA09C' },
  delta:   { key: 'delta',   label: 'DELTA',   accent: '#95DEE6' },
  phase:   { key: 'phase',   label: 'PHASE',   accent: '#DBF67F', legendary: true },
};

export const tierFor = (id) => BOX_TIERS[id] || BOX_TIERS.starter;

// Flat graphite face tones — top lit, right mid, left shaded. Solid fills only.
const FACE = { top: '#2B2F35', right: '#20242A', left: '#171A1F', seam: '#0F1114' };

export default function PhaseBoxArt({ tier = 'starter', className = '', style }) {
  const t = tierFor(tier);
  const a = t.accent;
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      aria-hidden="true"
      style={{ overflow: 'visible', ...style }}
    >
      {/* ---- Body: two flat side faces ---- */}
      <path d="M18 40 L60 64 L60 106 L18 82 Z" fill={FACE.left} />
      <path d="M60 64 L102 40 L102 82 L60 106 Z" fill={FACE.right} />

      {/* ---- Lid: top rhombus, split into two flat halves for a soft ridge ---- */}
      <path d="M60 15 L102 39 L60 63 L18 39 Z" fill={FACE.top} />
      <path d="M60 15 L18 39 L60 63 Z" fill={FACE.left} opacity="0.55" />

      {/* ---- Accent lid seam: the one tier signal on the object ---- */}
      <path d="M60 15 L102 39 L60 63 L18 39 Z" fill="none" stroke={a} strokeWidth="2" strokeLinejoin="round" />
      {/* lid ridge line down the middle of the top */}
      <line x1="60" y1="15" x2="60" y2="63" stroke={a} strokeWidth="1.4" opacity="0.55" />

      {/* ---- Body edges: quiet graphite seams (not accent) for form ---- */}
      <line x1="60" y1="63" x2="60" y2="106" stroke={FACE.seam} strokeWidth="1.6" />
      <path d="M18 39 L18 82 M102 39 L102 82" stroke={FACE.seam} strokeWidth="1.2" opacity="0.7" fill="none" />

      {/* ---- Front emblem: small accent diamond, flat, no glow ---- */}
      <path d="M82 66 L88 74 L82 88 L76 74 Z" fill={a} opacity={t.legendary ? 1 : 0.9} />
    </svg>
  );
}
