// The title chip — a PRESTIGE ladder.
//
// Identity is unchanged: which title this is still comes from its glyph and its
// accent colour (data/titleGlyphs.js, 56 distinct pairs). What changed (Oct 2026,
// Arjun) is the presentation ladder. The previous version withheld everything
// from the top tiers on purpose and they read as plain; the point of grinding a
// mythic is that it should look like you ground for it.
//
// So presentation now SCALES with rarity_tier — in material and in size:
//
//   common     plain outlined tag, muted ink          30px
//   rare       accent tint + hairline accent border   33px
//   epic       brushed plate, notched emblem holder   38px
//   legendary  solid pastel, diamond emblem, sheen    44px
//   mythic     dark crest plate, laurel flanks, halo  56px
//
// The one hard guardrail: glow must read as a NATURAL glow — a steady,
// same-colour halo, the way a real glowing object looks. No moving rainbow
// gradients, no twinkling sparks, no fast animation. The only motion in the
// whole system is one 5s sheen pass on legendary and a 6s opacity breathe on
// mythic, both of which stop under prefers-reduced-motion.
//
// Two deviations from the approved mock, both deliberate:
//  1. The mock drops the glyph on mythic (crest + name only). That would strip
//     per-title identity from the exact titles where it matters most, so the
//     glyph is kept and the crests flank it.
//  2. The mock's mythic plate is #12202a→#070b10, which is a slate-BLUE. Blue is
//     retired app-wide, so the plate is a neutral near-black carrying a bloom of
//     the title's own accent instead — same depth, no reintroduced blue.

import { TitleGlyph, accentFor } from '../../data/titleGlyphs';

// Base geometry per tier. Prestige is physical: a mythic is a bigger object
// than a common, not the same object painted brighter.
const TIER = {
  common:    { h: 30, font: 13,   glyph: 16, padL: 13, padR: 13, radius: 8,  gap: 9 },
  rare:      { h: 33, font: 13.5, glyph: 17, padL: 14, padR: 14, radius: 9,  gap: 9 },
  epic:      { h: 38, font: 14,   glyph: 16, padL: 7,  padR: 16, radius: 10, gap: 9 },
  legendary: { h: 44, font: 15.5, glyph: 16, padL: 9,  padR: 20, radius: 12, gap: 10 },
  mythic:    { h: 56, font: 19,   glyph: 19, padL: 20, padR: 20, radius: 14, gap: 10 },
};

// Size is a multiplier on the tier's own geometry, so a chip can sit in a dense
// inventory pill without flattening the ladder.
const SCALE = { sm: 0.72, md: 1, lg: 1.18 };

function alpha(hex, a) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return hex;
  const [r, g, b] = [m[1], m[2], m[3]].map((c) => parseInt(c, 16));
  return `rgba(${r},${g},${b},${a})`;
}

// Laurel flanks for mythic. Mirrored via scaleX so one path serves both sides.
function Crest({ size, flip }) {
  return (
    <svg viewBox="0 0 48 24" width={size} height={size / 2} fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" aria-hidden="true"
      style={{ flex: 'none', transform: flip ? 'scaleX(-1)' : undefined }}>
      <path d="M6 20C2 14 3 8 3 4c6 2 9 6 12 12" />
      <path d="M14 21c-3-5-2-9-2-12 5 2 7 5 9 10" />
    </svg>
  );
}

export default function TitlePlate({ titleKey, name, tier = 'common', size = 'md', showTier = false }) {
  const t = TIER[tier] || TIER.common;
  const k = SCALE[size] ?? 1;
  const { surface, ink } = accentFor(titleKey);
  const px = (n) => Math.round(n * k * 100) / 100;

  const solid = tier === 'legendary';
  const isMythic = tier === 'mythic';

  // Mythic cannot truncate (its halo must stay unclipped), so a long name is
  // kept in bounds by stepping the type down. "The Sovereign Overlord" is the
  // longest title in the catalogue and is what these steps are tuned against.
  const len = (name || '').length;
  const nameK = isMythic ? (len > 18 ? 0.68 : len > 13 ? 0.82 : 1) : 1;

  const base = {
    '--acc': surface,
    '--acc-ink': ink,
    height: px(t.h),
    gap: px(t.gap),
    paddingLeft: px(t.padL),
    paddingRight: px(t.padR),
    borderRadius: px(t.radius),
    fontSize: px(t.font * nameK),
  };

  const skin = {
    common: {
      background: 'transparent',
      color: 'var(--gm-muted)',
      boxShadow: 'inset 0 0 0 1px var(--gm-track)',
    },
    rare: {
      background: alpha(surface, 0.15),
      color: surface,
      boxShadow: `inset 0 0 0 1px ${alpha(surface, 0.38)}`,
    },
    epic: {
      // Vertical light only — diagonal gradients are banned app-wide.
      background: `linear-gradient(180deg, ${alpha(surface, 0.26)}, ${alpha(surface, 0.03)}), #0D1115`,
      color: 'var(--gm-ink)',
      boxShadow: `inset 0 1px 0 ${alpha(surface, 0.4)}, inset 0 0 0 1px ${alpha(surface, 0.3)}, 0 6px 18px -10px #000`,
    },
    legendary: {
      background: surface,
      color: ink,
      // A soft natural outer halo in the accent, not a coloured drop shadow.
      boxShadow: `0 0 ${px(34)}px ${px(-10)}px ${alpha(surface, 0.9)}, inset 0 0 0 1px rgba(255,255,255,0.35)`,
    },
    mythic: {
      // Neutral near-black carrying a bloom of the title's own accent. Radial,
      // so it stays inside the no-diagonal-gradients rule.
      background: `radial-gradient(130% 160% at 50% 0%, ${alpha(surface, 0.17)}, rgba(0,0,0,0) 70%), #080B0D`,
      color: '#F6FBFC',
      boxShadow: `0 0 0 1px rgba(255,255,255,0.08), 0 0 ${px(44)}px ${px(-8)}px ${alpha(surface, 0.85)}, inset 0 0 ${px(26)}px ${px(-6)}px ${alpha(surface, 0.5)}`,
    },
  }[tier] || {};

  const glyphEl = <TitleGlyph titleKey={titleKey} size={px(t.glyph)} strokeWidth={tier === 'common' ? 2.2 : 2.6} />;

  return (
    <span
      className={`tchip tchip--${tier}`}
      style={{ ...base, ...skin }}
      data-testid="title-plate"
      data-title={titleKey}
      data-tier={tier}
      title={name}
    >
      {/* Epic: a notched holder. Legendary: the same holder rotated to a diamond,
          with the glyph counter-rotated so it stays upright. */}
      {tier === 'epic' && (
        <span className="tchip__em" style={{
          width: px(26), height: px(26), borderRadius: px(7),
          background: alpha(surface, 0.22), color: surface,
          boxShadow: `inset 0 0 0 1px ${alpha(surface, 0.4)}`,
        }}>{glyphEl}</span>
      )}
      {solid && (
        <span className="tchip__em tchip__em--diamond" style={{
          width: px(30), height: px(30), borderRadius: px(6),
          background: alpha(ink, 0.14), color: ink,
          boxShadow: `inset 0 0 0 1px ${alpha(ink, 0.3)}`,
        }}><span className="tchip__em-inner">{glyphEl}</span></span>
      )}
      {isMythic && <span className="tchip__frame" style={{ borderRadius: px(t.radius), boxShadow: `inset 0 0 0 1px ${alpha(surface, 0.4)}, inset 0 0 ${px(22)}px ${px(-8)}px ${alpha(surface, 0.6)}` }} />}
      {isMythic && <span className="tchip__crest" style={{ color: surface }}><Crest size={px(22)} /></span>}

      {/* Mythic keeps its glyph — it is the title's identity, and dropping it on
          the top tier would make every mythic read the same. */}
      {(tier === 'common' || tier === 'rare' || isMythic) && glyphEl}

      <span
        className="tchip__name"
        style={isMythic ? {
          // Steady same-colour halo: a real glowing object, not an animated gradient.
          textShadow: `0 0 1px ${alpha(surface, 0.9)}, 0 0 ${px(12)}px ${alpha(surface, 0.6)}, 0 0 ${px(26)}px ${alpha(surface, 0.3)}`,
          letterSpacing: '0.07em',
        } : undefined}
      >{name}</span>

      {isMythic && <span className="tchip__crest" style={{ color: surface }}><Crest size={px(22)} flip /></span>}

      {showTier && (
        <span className="tchip__tier" style={{
          color: solid ? alpha(ink, 0.55) : isMythic ? alpha(surface, 0.7) : alpha(surface, 0.6),
        }}>{tier}</span>
      )}
    </span>
  );
}
