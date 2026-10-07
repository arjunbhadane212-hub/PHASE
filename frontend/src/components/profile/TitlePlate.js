// The title chip.
//
// Replaces the five-silhouette plate system. That gave every title in a source
// the same shape and used glow/halo/sheen/incandescence to say "rare", which
// read as loud and samey. Here:
//
//   GLYPH + COLOUR  = which title this is   (56 distinct pairs, data/titleGlyphs.js)
//   RARITY          = how much presentation the chip is allowed
//
// The rarity ladder is a restraint ladder, not a brightness dial. A common is a
// plain outlined tag. The solid pastel surface -- the app's most premium
// gesture, the same one the shop's primary CTA pills use -- is not handed out
// until legendary. So commons genuinely look basic and the top tiers genuinely
// look earned, with no glow anywhere.

import { TitleGlyph, accentFor } from '../../data/titleGlyphs';

const SIZES = {
  sm: { h: 22, px: 7,  gap: 4, glyph: 11, text: 9.5,  radius: 7  },
  md: { h: 28, px: 9,  gap: 5, glyph: 14, text: 11,   radius: 9  },
  lg: { h: 36, px: 12, gap: 7, glyph: 18, text: 13.5, radius: 11 },
};

// alpha() on a #rrggbb accent -- the tinted tiers are the accent at low opacity
// over whatever the surface behind them is, so a chip sits correctly on both
// the black profile and a card.
function alpha(hex, a) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return hex;
  const [r, g, b] = [m[1], m[2], m[3]].map((c) => parseInt(c, 16));
  return `rgba(${r},${g},${b},${a})`;
}

export default function TitlePlate({ titleKey, name, tier = 'common', size = 'md', showTier = false }) {
  const s = SIZES[size] || SIZES.md;
  const { surface, ink } = accentFor(titleKey);

  // Four presentation steps. `solid` is the premium jump at legendary.
  const solid = tier === 'legendary' || tier === 'mythic';
  const style = {
    height: s.h,
    gap: s.gap,
    paddingInline: s.px,
    borderRadius: s.radius,
    fontSize: s.text,
    background:
      tier === 'common' ? 'transparent'
      : tier === 'rare' ? alpha(surface, 0.14)
      : tier === 'epic' ? alpha(surface, 0.24)
      : surface,
    color: solid ? ink : tier === 'common' ? 'var(--gm-muted)' : surface,
    boxShadow:
      tier === 'common' ? `inset 0 0 0 1px var(--gm-track)`
      : tier === 'rare' ? `inset 0 0 0 1px ${alpha(surface, 0.3)}`
      : tier === 'epic' ? `inset 0 0 0 1px ${alpha(surface, 0.45)}`
      : tier === 'legendary' ? `inset 0 0 0 1px ${alpha(ink, 0.18)}`
      : `inset 0 0 0 1px ${alpha(ink, 0.26)}`,
  };

  return (
    <span
      className={`tchip${tier === 'mythic' ? ' tchip--mythic' : ''}`}
      style={style}
      data-testid="title-plate"
      data-title={titleKey}
      data-tier={tier}
      title={name}
    >
      <TitleGlyph titleKey={titleKey} size={s.glyph} strokeWidth={tier === 'common' ? 2.2 : 2.6} />
      <span className="tchip__name">{name}</span>
      {showTier && <span className="tchip__tier" style={{ color: solid ? alpha(ink, 0.55) : alpha(surface, 0.6) }}>{tier}</span>}
    </span>
  );
}
