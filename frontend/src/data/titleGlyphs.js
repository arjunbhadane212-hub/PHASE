// Title identity: one distinct glyph + one accent colour per title.
//
// Replaces the old plate system, which gave every title in a source the SAME
// silhouette (all streak titles were one flame, all hours titles one dial) and
// leaned on heavy glow/halo/sheen to signal rarity. That read as loud and
// generic. Here the DISTINCTION is the glyph and the colour -- 56 titles, 56
// glyphs -- and rarity only controls how much presentation the chip is allowed.
//
// Glyph house style matches components/ShopIcons.js exactly: 48x48 box, no
// fill, stroke=currentColor, 2.4 weight, round caps/joins, no gradient, no
// glow. Single colour so a glyph sits dark on a solid pastel surface, the same
// way the shop's item tiles do.

/* ── Accent palette ──────────────────────────────────────────────────────────
   Every hue is a v2 pastel in the same family as cyan #95DEE6 / lime #DBF67F /
   purple #A59BCC, and every one is used as a SURFACE with dark ink on top --
   the v2 rule, because these pastels are illegible as text. Soft enough to sit
   quietly on a black profile, saturated enough to be worth flexing. */
export const ACCENTS = {
  mist:   { surface: '#AEB7B8', ink: '#232B2C' },
  slate:  { surface: '#9FB0C3', ink: '#1E2730' },
  ice:    { surface: '#C7E4EA', ink: '#1C3034' },
  cyan:   { surface: '#95DEE6', ink: '#183A3F' },
  teal:   { surface: '#8FD3C4', ink: '#143029' },
  sage:   { surface: '#BFD9A0', ink: '#243208' },
  lime:   { surface: '#DBF67F', ink: '#2A3B0B' },
  sand:   { surface: '#E8D9A8', ink: '#352C10' },
  peach:  { surface: '#F0C9A8', ink: '#3A2614' },
  rose:   { surface: '#E8B4B8', ink: '#3A1F22' },
  purple: { surface: '#A59BCC', ink: '#231D3A' },
  indigo: { surface: '#9AA8D4', ink: '#1C2340' },
};

export function accentFor(key) {
  return ACCENTS[TITLE_VISUALS[key]?.accent] || ACCENTS.mist;
}

/* ── Glyph geometry ──────────────────────────────────────────────────────────
   Each glyph is a list of path `d` strings. Paths only (circles are drawn as
   two arcs) so one <path> renderer covers the whole set and the table stays
   readable instead of 56 bespoke components. */
const ring = (cx, cy, r) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`;

// A flame, parameterised so the streak family escalates structurally rather
// than just getting brighter: more cores = further up the ladder.
const flame = (cx, s = 1) =>
  `M${cx} ${38 - 4 * s}c${-5 * s} 0 ${-8 * s} ${-4 * s} ${-8 * s} ${-8 * s}c0 ${-6 * s} ${8 * s} ${-9 * s} ${8 * s} ${-18 * s}c0 ${9 * s} ${8 * s} ${12 * s} ${8 * s} ${18 * s}c0 ${4 * s} ${-3 * s} ${8 * s} ${-8 * s} ${8 * s}z`;

const GLYPHS = {
  /* ── shop · common ── deliberately plain: one simple mark, nothing else. */
  g_dot:        [ring(24, 24, 9)],
  g_chevron:    ['M12 29 L24 18 L36 29'],
  g_grind:      ['M14 34 L34 14', 'M14 24 L24 14', 'M24 34 L34 24'],
  g_loop:       ['M13 20a11 11 0 0 1 22 2', 'M35 28a11 11 0 0 1-22-2', 'M31 14v8h-8', 'M17 34v-8h8'],
  g_level:      ['M10 24h28', 'M16 17h16', 'M16 31h16'],
  g_sunrise:    ['M10 34h28', 'M17 34a7 7 0 0 1 14 0', 'M24 13v5', 'M13 19l3 3', 'M35 19l-3 3'],

  /* ── shop · rare ── */
  g_bars:       ['M14 32v-8', 'M24 32V18', 'M34 32v-12'],
  g_dblchev:    ['M12 25 L24 14 L36 25', 'M12 35 L24 24 L36 35'],
  g_target:     [ring(24, 24, 12), ring(24, 24, 4), 'M24 6v4', 'M24 38v4', 'M6 24h4', 'M38 24h4'],
  g_shield:     ['M24 7l14 5v11c0 9-6 16-14 19-8-3-14-10-14-19V12z'],
  g_speed:      ['M14 24h20', 'M27 17l7 7-7 7', 'M9 18h6', 'M9 30h6'],
  g_chain:      ['M20 28a7 7 0 0 1 0-10l3-3a7 7 0 0 1 10 10l-2 2', 'M28 20a7 7 0 0 1 0 10l-3 3a7 7 0 0 1-10-10l2-2'],

  /* ── shop · epic ── */
  g_grid:       ['M10 10h28v28H10z', 'M19 19h10v10H19z'],
  g_lotus:      ['M24 34c-8 0-13-5-13-5s5-5 13-5 13 5 13 5-5 5-13 5z', 'M24 24c0-7 4-11 4-11s4 4 4 11', 'M24 24c0-7-4-11-4-11s-4 4-4 11'],
  g_cog:        [ring(24, 24, 7), 'M24 8v6', 'M24 34v6', 'M8 24h6', 'M34 24h6', 'M13 13l4 4', 'M31 31l4 4', 'M35 13l-4 4', 'M17 31l-4 4'],
  g_prism:      ['M24 8l14 16-14 16L10 24z', 'M24 16l7 8-7 8-7-8z'],
  g_compass:    ['M24 9l13 28-13-7-13 7z', 'M24 9v21'],

  /* ── shop · legendary ── */
  g_mountain:   ['M6 36l12-18 7 10 5-7 12 15z', 'M18 18l3 4'],
  g_laurel:     ['M24 38c-9-4-13-12-13-21', 'M24 38c9-4 13-12 13-21', 'M11 17c6 0 9 3 10 7', 'M37 17c-6 0-9 3-10 7'],
  g_ascend:     ['M24 10l12 20H12z', 'M24 40v-4', 'M12 36l3-2', 'M36 36l-3-2'],
  g_zenith:     ['M24 8l4 9 9 1-7 7 2 9-8-5-8 5 2-9-7-7 9-1z'],

  /* ── shop · mythic ── the three biggest flexes in the shop. */
  g_mind:       [ring(24, 24, 5), ring(24, 24, 14), 'M10 24a14 14 0 0 0 28 0', 'M24 10v4', 'M24 34v4'],
  g_infinity:   ['M18 24a6 6 0 1 1 6 6a6 6 0 1 0 6-6a6 6 0 1 0-6 6a6 6 0 1 1-6-6z'],
  g_standard:   ['M14 40V8', 'M14 10h20l-5 7 5 7H14'],

  /* ── streak ladder ── a flame family that grows structurally, then breaks
     into non-flame marks at the very top so the rarest tiers feel different. */
  g_spark:      ['M24 12v8', 'M24 28v8', 'M12 24h8', 'M28 24h8', 'M16 16l5 5', 'M32 32l-5-5', 'M32 16l-5 5', 'M16 32l5-5'],
  g_twobar:     ['M18 34V16', 'M30 34V22'],
  g_pot:        ['M12 24h24v6a8 8 0 0 1-8 8h-8a8 8 0 0 1-8-8z', 'M20 18c0-3 3-3 3-6', 'M28 18c0-3 3-3 3-6'],
  g_flame1:     [flame(24, 1)],
  g_lock:       ['M14 22h20v16H14z', 'M18 22v-5a6 6 0 0 1 12 0v5'],
  g_flame2:     [flame(20, 0.85), flame(30, 0.6)],
  g_bolt:       ['M27 7L13 27h9l-2 14 14-20h-9z'],
  g_flame3:     [flame(17, 0.6), flame(24, 0.9), flame(31, 0.6)],
  g_interlock:  [ring(18, 24, 9), ring(30, 24, 9)],
  g_flamering:  [ring(24, 24, 15), flame(24, 0.55)],
  g_trident:    ['M24 40V16', 'M12 16v-6', 'M36 16v-6', 'M12 16h24', 'M24 16V8', 'M16 22l-4-4', 'M32 22l4-4'],
  g_wisp:       ['M24 38c0-8 10-9 10-17a10 10 0 0 0-20 0c0 5 4 7 7 7a5 5 0 0 0 0-10'],
  g_burst:      ['M24 6v12', 'M24 30v12', 'M6 24h12', 'M30 24h12', 'M11 11l8 8', 'M29 29l8 8', 'M37 11l-8 8', 'M11 37l8-8'],
  g_crown:      ['M10 32h28', 'M10 32L8 14l9 7 7-11 7 11 9-7-2 18'],

  /* ── hours ladder ── a time family. */
  g_clock:      [ring(24, 24, 15), 'M24 15v9l6 4'],
  g_hourglass:  ['M14 8h20', 'M14 40h20', 'M16 8c0 10 8 14 8 16s-8 6-8 16', 'M32 8c0 10-8 14-8 16s8 6 8 16'],
  g_drift:      [ring(28, 24, 12), 'M28 16v8l5 3', 'M6 18h8', 'M4 24h8', 'M6 30h8'],
  g_noHands:    [ring(24, 24, 15), ring(24, 24, 3)],
  g_weave:      ['M10 16c7 0 7 16 14 16s7-16 14-16', 'M10 32c7 0 7-16 14-16s7 16 14 16'],
  g_void:       [ring(24, 24, 14), 'M24 10a14 14 0 0 0 0 28z'],
  g_timecrown:  [ring(24, 27, 11), 'M24 20v7l5 3', 'M11 12l5 4 8-8 8 8 5-4'],
  g_orbit:      [ring(24, 24, 5), ring(24, 24, 15), 'M9 24a15 15 0 0 0 30 0'],
  g_edge:       ['M10 38L34 10l4 4-20 24z', 'M10 38l8-2', ring(32, 14, 3)],

  /* ── loot-box titles ── sharper marks; these are pulls, not grinds. */
  g_fang:       ['M14 10c0 14 4 20 10 28 6-8 10-14 10-28', 'M19 14v8', 'M29 14v8'],
  g_phantom:    ['M12 38V22a12 12 0 0 1 24 0v16l-4-4-4 4-4-4-4 4z', 'M19 22h.01', 'M29 22h.01'],
  g_vandal:     ['M12 12l24 24', 'M36 12L12 36', 'M24 8v4', 'M24 36v4'],
  g_anomaly:    ['M12 12h12v12H12z', 'M24 24h12v12H24z', 'M24 12h12', 'M12 24h12'],
  g_enforcer:   ['M24 7l14 5v11c0 9-6 16-14 19-8-3-14-10-14-19V12z', 'M16 24h16'],
  g_halo:       [ring(24, 28, 9), 'M12 14a12 5 0 0 0 24 0a12 5 0 0 0-24 0'],
  g_antihero:   ['M8 14h32L24 40z', 'M14 24h20'],
  g_impact:     ['M24 4l5 14 14-5-9 11 9 11-14-5-5 14-5-14-14 5 9-11-9-11 14 5z'],
  g_axe:        ['M18 40L34 8', 'M12 18c6-8 16-10 22-8-2 8-8 14-16 15z'],
};

/* ── Title → glyph + accent ──────────────────────────────────────────────────
   Colour is chosen per title, not per rarity, so two Rare titles never look
   like the same object. Within a progression ladder the hue warms or cools as
   you climb, which gives the family a direction without changing its shape. */
export const TITLE_VISUALS = {
  /* shop · common -- neutral/cool, intentionally unremarkable */
  title_starter:     { glyph: 'g_dot',       accent: 'mist'   },
  title_novice:      { glyph: 'g_chevron',   accent: 'mist'   },
  title_grinder:     { glyph: 'g_grind',     accent: 'slate'  },
  title_routine:     { glyph: 'g_loop',      accent: 'slate'  },
  title_steady:      { glyph: 'g_level',     accent: 'mist'   },
  title_early_bird:  { glyph: 'g_sunrise',   accent: 'sand'   },
  /* shop · rare */
  title_consistent:  { glyph: 'g_bars',      accent: 'sage'   },
  title_relentless:  { glyph: 'g_dblchev',   accent: 'peach'  },
  title_focused:     { glyph: 'g_target',    accent: 'ice'    },
  title_ironclad:    { glyph: 'g_shield',    accent: 'slate'  },
  title_momentum:    { glyph: 'g_speed',     accent: 'teal'   },
  title_unbroken:    { glyph: 'g_chain',     accent: 'indigo' },
  /* shop · epic */
  title_disciplined: { glyph: 'g_grid',      accent: 'cyan'   },
  title_monk:        { glyph: 'g_lotus',     accent: 'sage'   },
  title_machine:     { glyph: 'g_cog',       accent: 'slate'  },
  title_untouchable: { glyph: 'g_prism',     accent: 'ice'    },
  title_architect:   { glyph: 'g_compass',   accent: 'purple' },
  /* shop · legendary */
  title_immovable:   { glyph: 'g_mountain',  accent: 'teal'   },
  title_paragon:     { glyph: 'g_laurel',    accent: 'lime'   },
  title_ascendant:   { glyph: 'g_ascend',    accent: 'cyan'   },
  title_zenith:      { glyph: 'g_zenith',    accent: 'sand'   },
  /* shop · mythic */
  title_apex_mind:   { glyph: 'g_mind',      accent: 'purple' },
  title_eternal:     { glyph: 'g_infinity',  accent: 'cyan'   },
  title_the_standard:{ glyph: 'g_standard',  accent: 'lime'   },

  /* streak ladder -- cool mist at day 10, warming through sand/peach/rose as
     the streak gets genuinely hard, ending on lime at 1000 days. */
  streak_rookie:            { glyph: 'g_spark',     accent: 'mist'   },
  streak_contender:         { glyph: 'g_twobar',    accent: 'mist'   },
  streak_cooking:           { glyph: 'g_pot',       accent: 'sage'   },
  streak_burning:           { glyph: 'g_flame1',    accent: 'sand'   },
  streak_locked:            { glyph: 'g_lock',      accent: 'slate'  },
  streak_aflame:            { glyph: 'g_flame2',    accent: 'peach'  },
  streak_agony:             { glyph: 'g_bolt',      accent: 'rose'   },
  streak_blaze:             { glyph: 'g_flame3',    accent: 'peach'  },
  streak_interlocked:       { glyph: 'g_interlock', accent: 'indigo' },
  streak_incinerate:        { glyph: 'g_flamering', accent: 'rose'   },
  streak_infernal:          { glyph: 'g_trident',   accent: 'rose'   },
  streak_ethereal:          { glyph: 'g_wisp',      accent: 'ice'    },
  streak_unreal:            { glyph: 'g_burst',     accent: 'purple' },
  streak_sovereign_overlord:{ glyph: 'g_crown',     accent: 'lime'   },

  /* hours ladder -- stays in the cool half of the palette throughout, so an
     hours title never reads as a streak title at a glance. */
  hours_timekeeper:    { glyph: 'g_clock',     accent: 'mist'   },
  hours_chronos:       { glyph: 'g_hourglass', accent: 'slate'  },
  hours_temporal_drift:{ glyph: 'g_drift',     accent: 'ice'    },
  hours_timeless:      { glyph: 'g_noHands',   accent: 'teal'   },
  hours_era_weaver:    { glyph: 'g_weave',     accent: 'indigo' },
  hours_void_walker:   { glyph: 'g_void',      accent: 'purple' },
  hours_lord_of_time:  { glyph: 'g_timecrown', accent: 'cyan'   },
  hours_chrono_archon: { glyph: 'g_orbit',     accent: 'indigo' },
  hours_eternitys_edge:{ glyph: 'g_edge',      accent: 'cyan'   },

  /* loot-box titles */
  title_savage:      { glyph: 'g_fang',     accent: 'rose'   },
  title_phantom:     { glyph: 'g_phantom',  accent: 'slate'  },
  title_vandal:      { glyph: 'g_vandal',   accent: 'peach'  },
  title_anomaly:     { glyph: 'g_anomaly',  accent: 'purple' },
  title_enforcer:    { glyph: 'g_enforcer', accent: 'indigo' },
  title_god_complex: { glyph: 'g_halo',     accent: 'sand'   },
  title_anti_hero:   { glyph: 'g_antihero', accent: 'rose'   },
  title_cataclysm:   { glyph: 'g_impact',   accent: 'cyan'   },
  title_executioner: { glyph: 'g_axe',      accent: 'slate'  },
};

/* One renderer for all 56. `size` is the rendered box; the geometry is authored
   in a 48x48 space exactly like ShopIcons.js. */
export function TitleGlyph({ titleKey, size = 16, className = '', strokeWidth = 2.4 }) {
  const paths = GLYPHS[TITLE_VISUALS[titleKey]?.glyph] || GLYPHS.g_dot;
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className}
      fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

export default TitleGlyph;
