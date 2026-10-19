// The title chip — flat, and now UNIFORM SIZE across every rarity.
//
// Rebuilt Oct 2026 (profile remodel, Arjun): premium = flat solid/tonal colour
// + bold type + STRUCTURE, never glow (memory feedback-no-neon-glow).
//
// Oct 2026 sizing fix (Arjun, live review: "some titles are too big, some too
// small — size should be the same, design should be different"): EVERY tier now
// renders at the SAME height, the SAME glyph size, the SAME type size. Prestige
// is expressed only through DESIGN — how the accent is applied — not through
// scale. So a common and a legendary are the same object size; what changes is
// the treatment:
//
//   common     muted glyph + muted name            (base)
//   rare       accent glyph + ink name
//   epic       + inset accent emblem square
//   legendary  + full-height accent emblem block
//   mythic     + full-height emblem block + rank pips
//
// Identity (which title) is still the per-title glyph + accent from
// data/titleGlyphs.js. API unchanged: titleKey / name / tier / size / showTier.

import { TitleGlyph, accentFor } from '../../data/titleGlyphs';

// ONE geometry for all tiers. This is the whole point of the fix: nothing here
// is keyed by rarity, so no title can be taller or shorter than another.
const BASE = { h: 30, font: 12, glyph: 15, radius: 8 };
const SCALE = { sm: 0.84, md: 1, lg: 1.12 };

function alpha(hex, a) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return hex;
  const [r, g, b] = [m[1], m[2], m[3]].map((c) => parseInt(c, 16));
  return `rgba(${r},${g},${b},${a})`;
}

export default function TitlePlate({ titleKey, name, tier = 'common', size = 'md', showTier = false }) {
  const k = SCALE[size] ?? 1;
  const { surface, ink } = accentFor(titleKey);
  const px = (n) => Math.round(n * k * 100) / 100;
  const h = px(BASE.h);

  // Flat dark plate: solid fill, no border, no bevel, no shine. Common is a hair
  // softer so it reads as the base tier without an outline. Same height always.
  const style = {
    display: 'inline-flex', alignItems: 'center', overflow: 'hidden',
    height: h, borderRadius: px(BASE.radius),
    background: tier === 'common' ? alpha('#ffffff', 0.04) : 'var(--gm-card)',
    fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: px(BASE.font),
    letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1,
    whiteSpace: 'nowrap', verticalAlign: 'middle', maxWidth: '100%',
  };

  // Standalone glyph (common/rare), padded from the left edge.
  const glyph = (color) => (
    <span style={{ color, display: 'inline-flex', flex: 'none', paddingLeft: px(10) }}>
      <TitleGlyph titleKey={titleKey} size={px(BASE.glyph)} strokeWidth={2.2} />
    </span>
  );

  // Emblem block holding the glyph. `full` = flush full-height (legendary/mythic);
  // otherwise a smaller inset rounded square (epic). Both are the same chip
  // height — only the emblem's own footprint differs, which is the design cue.
  const emblem = (full) => (
    <span style={{
      width: full ? h : px(BASE.h - 8), height: full ? h : px(BASE.h - 8),
      marginLeft: full ? 0 : px(4), flex: 'none', display: 'grid', placeItems: 'center',
      borderRadius: full ? 0 : px(6), background: surface, color: ink,
    }}>
      <TitleGlyph titleKey={titleKey} size={px(BASE.glyph)} strokeWidth={2.4} />
    </span>
  );

  const nameEl = (color) => (
    <span style={{ padding: `0 ${px(11)}px`, color, overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
  );
  const tierTag = showTier ? (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: px(8.5),
      letterSpacing: '0.12em', color: 'var(--gm-muted)', paddingRight: px(10), flex: 'none',
    }}>{tier}</span>
  ) : null;

  let inner;
  if (tier === 'common') inner = (<>{glyph('var(--gm-muted)')}{nameEl('var(--gm-muted)')}{tierTag}</>);
  else if (tier === 'rare') inner = (<>{glyph(surface)}{nameEl('var(--gm-ink)')}{tierTag}</>);
  else if (tier === 'epic') inner = (<>{emblem(false)}{nameEl('var(--gm-ink)')}{tierTag}</>);
  else if (tier === 'legendary') inner = (<>{emblem(true)}{nameEl('var(--gm-ink)')}{tierTag}</>);
  else inner = (<>
    {emblem(true)}{nameEl('var(--gm-ink)')}
    <span style={{ display: 'inline-flex', gap: px(3), marginRight: px(11), flex: 'none' }}>
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
