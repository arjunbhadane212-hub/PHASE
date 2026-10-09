// The title chip — a compact, FLAT prestige ladder.
//
// Rebuilt Oct 2026 (profile remodel, Arjun). Standing rules (memory
// feedback-no-neon-glow): premium is flat solid/tonal colour + bold type +
// STRUCTURE, never glow. Later refinement pass (Arjun, live review): drop the
// shine, drop the hairline border, dial the weight back, keep proportions
// clean. So each tier is a plain dark plate with NO border and NO bevel; the
// accent shows only through the glyph and, from epic up, a solid emblem block.
// Prestige climbs by structure, not brightness, size, or outline:
//
//   common     dark plate, muted glyph + name
//   rare       dark plate, accent glyph
//   epic       + inset accent emblem
//   legendary  + full-height accent emblem block
//   mythic     + emblem block + rank pips
//
// Identity (which title) is still the per-title glyph + accent from
// data/titleGlyphs.js. API unchanged: titleKey / name / tier / size / showTier.

import { TitleGlyph, accentFor } from '../../data/titleGlyphs';

// Base geometry per tier (md). Heights stay close so the ladder reads as one
// family; prestige is the emblem/pips, not size.
const TIER = {
  common:    { h: 28, font: 11.5, glyph: 14, radius: 7 },
  rare:      { h: 28, font: 12,   glyph: 15, radius: 7 },
  epic:      { h: 30, font: 12.5, glyph: 16, radius: 8 },
  legendary: { h: 32, font: 13,   glyph: 17, radius: 8 },
  mythic:    { h: 36, font: 13.5, glyph: 14, radius: 9 },
};
const SCALE = { sm: 0.84, md: 1, lg: 1.12 };

function alpha(hex, a) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return hex;
  const [r, g, b] = [m[1], m[2], m[3]].map((c) => parseInt(c, 16));
  return `rgba(${r},${g},${b},${a})`;
}

export default function TitlePlate({ titleKey, name, tier = 'common', size = 'md', showTier = false }) {
  const t = TIER[tier] || TIER.common;
  const k = SCALE[size] ?? 1;
  const { surface, ink } = accentFor(titleKey);
  const px = (n) => Math.round(n * k * 100) / 100;
  const h = px(t.h);

  // Flat dark plate: a solid fill, no border, no bevel, no shine. Common is a
  // hair softer so it reads as the base tier without an outline.
  const style = {
    display: 'inline-flex', alignItems: 'center', overflow: 'hidden',
    height: h, borderRadius: px(t.radius), background: tier === 'common' ? alpha('#ffffff', 0.04) : 'var(--gm-card)',
    fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: px(t.font),
    letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1,
    whiteSpace: 'nowrap', verticalAlign: 'middle',
  };

  const glyph = (color, sw = 2.2) => (
    <span style={{ color, display: 'inline-flex', paddingLeft: px(10) }}>
      <TitleGlyph titleKey={titleKey} size={px(t.glyph)} strokeWidth={sw} />
    </span>
  );
  // Emblem block. `full` = flush full-height (legendary/mythic); otherwise a
  // smaller inset rounded square (epic).
  const emblem = (full) => (
    <span style={{
      width: full ? h : px(t.h - 10), height: full ? h : px(t.h - 10),
      marginLeft: full ? 0 : px(5), flex: 'none', display: 'grid', placeItems: 'center',
      borderRadius: full ? 0 : px(6), background: surface, color: ink,
    }}>
      <TitleGlyph titleKey={titleKey} size={px(t.glyph)} strokeWidth={2.4} />
    </span>
  );
  const nameEl = (color) => <span style={{ padding: `0 ${px(11)}px`, color }}>{name}</span>;
  const tierTag = showTier ? (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: px(8.5),
      letterSpacing: '0.12em', color: 'var(--gm-muted)', paddingRight: px(10),
    }}>{tier}</span>
  ) : null;

  let inner;
  if (tier === 'common') inner = (<>{glyph('var(--gm-muted)')}{nameEl('var(--gm-muted)')}{tierTag}</>);
  else if (tier === 'rare') inner = (<>{glyph(surface)}{nameEl('var(--gm-ink)')}{tierTag}</>);
  else if (tier === 'epic') inner = (<>{emblem(false)}{nameEl('var(--gm-ink)')}{tierTag}</>);
  else if (tier === 'legendary') inner = (<>{emblem(true)}{nameEl('var(--gm-ink)')}{tierTag}</>);
  else inner = (<>
    {emblem(true)}{nameEl('var(--gm-ink)')}
    <span style={{ display: 'inline-flex', gap: px(3), marginRight: px(11) }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: px(4), height: px(4), borderRadius: 999, background: i === 1 ? surface : alpha(surface, 0.5) }} />
      ))}
    </span>
    {tierTag}
  </>);

  return (
    <span style={style} data-testid="title-plate" data-title={titleKey} data-tier={tier} title={name}>
      {inner}
    </span>
  );
}
