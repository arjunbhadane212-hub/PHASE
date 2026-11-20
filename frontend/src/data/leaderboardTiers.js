// Weekly-league tier identity — per the leaderboard handoff spec (§A.5).
// This is the league's OWN 10-tier ladder (Bronze -> Prime), separate from the
// XP-level rank ladder in ./levels.js. Each tier has a full-saturation colour
// pair (primary `a` + darker gradient partner `b`) that drives the emblem fill
// and its glow, plus an emblem FAMILY key consumed by <TierEmblem/>.
//
// Emblem families escalate as you climb, so each stretch of the ladder feels
// like a different class of prize:
//   crown  (Bronze/Silver/Gold)   jewelled regal crowns
//   gem    (Platinum/Nova/Eclipse) faceted brilliant-cut gemstones
//   flame  (Zenith/Vertex)         white-hot flames  ·  Apex gains wings
//   grand  (Prime)                 haloed grand crown — the endgame emblem
// UI v3: recoloured onto the lab palette (no purple). `a` = badge fill,
// `ink` = glyph/text on that fill, `b` = darker partner.
export const LEADERBOARD_TIERS = [
  { n: 1,  key: 'Bronze',   a: '#D9915F', b: '#A8653A', ink: '#3D1F0A', fam: 'crown' },
  { n: 2,  key: 'Silver',   a: '#C3C8D2', b: '#8E94A1', ink: '#262A33', fam: 'crown' },
  { n: 3,  key: 'Gold',     a: '#FFD25E', b: '#E0A72B', ink: '#4A3500', fam: 'crown' },
  { n: 4,  key: 'Platinum', a: '#9DD3F7', b: '#4FAEE6', ink: '#0B2E45', fam: 'gem'   },
  { n: 5,  key: 'Nova',     a: '#7FE0C4', b: '#2FB894', ink: '#0B3A2E', fam: 'gem'   },
  { n: 6,  key: 'Eclipse',  a: '#F6B3CE', b: '#E57AA6', ink: '#4B1530', fam: 'gem'   },
  { n: 7,  key: 'Zenith',   a: '#FF9F82', b: '#F2734F', ink: '#4D1A0B', fam: 'flame' },
  { n: 8,  key: 'Vertex',   a: '#FF6B6B', b: '#D94040', ink: '#4A0B0B', fam: 'flame' },
  { n: 9,  key: 'Apex',     a: '#D4F36B', b: '#A9C93C', ink: '#2B3A06', fam: 'flame' },
  { n: 10, key: 'Prime',    a: '#141416', b: '#000000', ink: '#FFD25E', fam: 'grand' },
];

// Safe lookup — clamps to a valid tier so the UI never renders undefined.
export function tierInfo(n) {
  const t = Number(n);
  const clamped = Number.isFinite(t) ? Math.min(10, Math.max(1, Math.round(t))) : 1;
  return LEADERBOARD_TIERS[clamped - 1];
}

// Map a tier name (e.g. "Gold") back to its number; defaults to 1 if unknown.
export function tierNumByName(name) {
  const t = LEADERBOARD_TIERS.find(x => x.key === name);
  return t ? t.n : 1;
}

// Zone -> semantic colour (kept deliberately separate from tier hues).
export const ZONE_COLORS = { promotion: '#22c55e', holding: '#7d818f', demotion: '#ef4444' };
