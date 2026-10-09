// Flat motion ring — the no-glow render for an `anim`/`effect` cosmetic.
//
// Draws one or two SVG rings that spin / pulse / draw / shift colour (classes
// in index.css, .mr-*). Absolutely fills its parent, so the caller just needs a
// position:relative box (an avatar, a shop tile, an inventory preview). Pass
// either an explicit `variant` or the shop `itemKey` (resolved via the map).

import { VARIANTS, CYAN, motionVariantFor } from '../../data/motionVariants';

export default function MotionRing({ variant, itemKey, className = '', style }) {
  const spec = VARIANTS[variant] || VARIANTS[motionVariantFor(itemKey)] || VARIANTS.pulse;
  return (
    <svg
      viewBox="0 0 44 44" aria-hidden="true" focusable="false" className={className}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', ...style }}
    >
      {spec.map((c, i) => (
        <circle
          key={i} cx="22" cy="22" r={c.r} fill="none" stroke={c.stroke || CYAN}
          strokeWidth={c.sw || 2.5} strokeLinecap="round"
          strokeDasharray={c.dash || undefined} className={`mr-ring ${c.cls}`}
        />
      ))}
    </svg>
  );
}
