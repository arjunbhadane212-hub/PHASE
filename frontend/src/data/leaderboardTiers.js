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
export const LEADERBOARD_TIERS = [
  { n: 1,  key: 'Bronze',   a: '#c9793f', b: '#8a4a1f', fam: 'crown' },
  { n: 2,  key: 'Silver',   a: '#c7cbd6', b: '#8b90a3', fam: 'crown' },
  { n: 3,  key: 'Gold',     a: '#ffcc4d', b: '#e0972b', fam: 'crown' },
  { n: 4,  key: 'Platinum', a: '#8fe3ff', b: '#3ea8d8', fam: 'gem'   },
  { n: 5,  key: 'Nova',     a: '#7cf0d6', b: '#22b899', fam: 'gem'   },
  { n: 6,  key: 'Eclipse',  a: '#a889ff', b: '#6a3fd8', fam: 'gem'   },
  { n: 7,  key: 'Zenith',   a: '#ff8a5c', b: '#e0432b', fam: 'flame' },
  { n: 8,  key: 'Vertex',   a: '#ff6b6b', b: '#d81f4b', fam: 'flame' },
  { n: 9,  key: 'Apex',     a: '#ff4d94', b: '#c81fb0', fam: 'flame' },
  { n: 10, key: 'Prime',    a: '#ffd85c', b: '#a855ff', fam: 'grand' },
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
