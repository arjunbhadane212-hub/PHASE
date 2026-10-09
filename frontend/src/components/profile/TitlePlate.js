// The title chip — a compact, FLAT prestige ladder.
//
// Rebuilt Oct 2026 (profile remodel, Arjun): the previous version leaned on
// halo / sheen / breathing glow to signal rarity, which read as "AI", and its
// top tiers were oversized and too bright. New rule (see memory
// feedback-no-neon-glow): premium comes from flat solid/tonal colour, bold
// Archivo type and STRUCTURE — never glow. So every tier is a compact dark
// plate where the accent is an edge, a glyph or a small emblem, and prestige
// climbs by structure, not by getting brighter or bigger:
//
//   common     outlined tag, muted                         26px
//   rare       dark plate, accent left bar + accent glyph   28px
//   epic       dark plate, solid accent emblem block        30px
//   legendary  + accent name + accent base rule             33px
//   mythic     + accent top rule + rank pips                37px
//
// Identity (which title this is) is still the per-title glyph + accent from
// data/titleGlyphs.js. API is unchanged: callers pass titleKey/name/tier/size.

import { TitleGlyph, accentFor } from '../../data/titleGlyphs';

// Base geometry per tier (md). Prestige is structure, so heights stay close —
// a mythic is only a touch taller than a common, not double.
const TIER = {
  common:    { h: 26, font: 11.5, glyph: 13 },
  rare:      { h: 28, font: 12,   glyph: 14 },
  epic:      { h: 30, font: 12.5, glyph: 16 },
  legendary: { h: 33, font: 13.5, glyph: 17 },
  mythic:    { h: 37, font: 14,   glyph: 13 },
};
const SCALE = { sm: 0.82, md: 1, lg: 1.14 };

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

  const base = {
    display: 'inline-flex', alignItems: 'center', overflow: 'hidden',
    height: h, borderRadius: px(tier === 'common' ? 7 : tier === 'mythic' ? 10 : 8),
    fontFamily: "'Archivo', sans-serif", fontWeight: tier === 'common' ? 800 : 900,
    fontSize: px(t.font), letterSpacing: '0.05em', textTransform: 'uppercase',
    lineHeight: 1, whiteSpace: 'nowrap', verticalAlign: 'middle',
    // flat bevel = a crisp opaque top highlight, never a blurred colour glow
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
  };

  const glyphEl = (color, sw = 2) => (
    <span style={{ color, display: 'inline-flex' }}>
      <TitleGlyph titleKey={titleKey} size={px(t.glyph)} strokeWidth={sw} />
    </span>
  );
  const emblem = (dim) => (
    <span style={{
      width: h, height: h, flex: 'none', display: 'grid', placeItems: 'center',
      background: surface, color: ink,
      boxShadow: dim ? 'inset -1px 0 0 rgba(0,0,0,0.18)' : undefined,
    }}>{glyphEl(ink, 2.4)}</span>
  );
  const nameEl = (color) => (
    <span style={{ padding: `0 ${px(11)}px`, color }}>{name}</span>
  );
  const tierTag = showTier ? (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: px(8.5),
      letterSpacing: '0.12em', opacity: 0.55, paddingRight: px(10),
    }}>{tier}</span>
  ) : null;

  let style = base, inner = null;
  if (tier === 'common') {
    style = { ...base, boxShadow: 'inset 0 0 0 1px var(--gm-track)', color: 'var(--gm-muted)' };
    inner = (<>
      <span style={{ paddingLeft: px(9), display: 'inline-flex' }}>{glyphEl('var(--gm-muted)', 2.2)}</span>
      {nameEl('var(--gm-muted)')}{tierTag}
    </>);
  } else if (tier === 'rare') {
    style = { ...base, background: 'var(--gm-card)', boxShadow: `${base.boxShadow}, inset 0 0 0 1px var(--gm-track)` };
    inner = (<>
      <span style={{ width: px(3), alignSelf: 'stretch', background: surface, flex: 'none' }} />
      <span style={{ paddingLeft: px(9), display: 'inline-flex' }}>{glyphEl(surface)}</span>
      {nameEl('var(--gm-ink)')}{tierTag}
    </>);
  } else if (tier === 'epic') {
    style = { ...base, background: 'var(--gm-card)', boxShadow: `${base.boxShadow}, inset 0 0 0 1px var(--gm-track)` };
    inner = (<>{emblem(true)}{nameEl('var(--gm-ink)')}{tierTag}</>);
  } else if (tier === 'legendary') {
    style = { ...base, background: 'var(--gm-card)',
      boxShadow: `${base.boxShadow}, inset 0 0 0 1px ${alpha(surface, 0.32)}, inset 0 -2px 0 ${alpha(surface, 0.5)}` };
    inner = (<>{emblem(true)}{nameEl(surface)}{tierTag}</>);
  } else { // mythic
    style = { ...base, background: 'var(--gm-card)', color: 'var(--gm-ink)',
      boxShadow: `inset 0 2px 0 ${alpha(surface, 0.55)}, inset 0 0 0 1px var(--gm-track)` };
    inner = (<>
      <span style={{
        width: px(22), height: px(22), marginLeft: px(11), flex: 'none', display: 'grid',
        placeItems: 'center', borderRadius: px(6), background: surface, color: ink,
      }}>{glyphEl(ink, 2.4)}</span>
      {nameEl('var(--gm-ink)')}
      <span style={{ display: 'inline-flex', gap: px(3), marginRight: px(11) }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: px(4), height: px(4), borderRadius: 999, background: i === 1 ? surface : alpha(surface, 0.55) }} />
        ))}
      </span>
      {tierTag}
    </>);
  }

  return (
    <span style={style} data-testid="title-plate" data-title={titleKey} data-tier={tier} title={name}>
      {inner}
    </span>
  );
}
