// Weekly-league tier identity — per the leaderboard handoff spec (§A.5).
// This is the league's OWN 10-tier ladder (Bronze -> Prime), separate from the
// XP-level rank ladder in ./levels.js. Each tier has a full-saturation colour
// pair (primary `a` + darker gradient partner `b`) that drives the emblem fill
// and its glow, plus an emblem shape key consumed by <TierEmblem/>.
export const LEADERBOARD_TIERS = [
  { n: 1,  key: 'Bronze',   a: '#c9793f', b: '#8a4a1f', em: 'crown3'     },
  { n: 2,  key: 'Silver',   a: '#c7cbd6', b: '#8b90a3', em: 'crown3b'    },
  { n: 3,  key: 'Gold',     a: '#ffcc4d', b: '#e0972b', em: 'crown4'     },
  { n: 4,  key: 'Platinum', a: '#8fe3ff', b: '#3ea8d8', em: 'gemEmerald' },
  { n: 5,  key: 'Nova',     a: '#7cf0d6', b: '#22b899', em: 'gemRound'   },
  { n: 6,  key: 'Eclipse',  a: '#a889ff', b: '#6a3fd8', em: 'gemOrbital' },
  { n: 7,  key: 'Zenith',   a: '#ff8a5c', b: '#e0432b', em: 'flame1'     },
  { n: 8,  key: 'Vertex',   a: '#ff6b6b', b: '#d81f4b', em: 'flame2'     },
  { n: 9,  key: 'Apex',     a: '#ff4d94', b: '#c81fb0', em: 'flameWing'  },
  { n: 10, key: 'Prime',    a: '#ffd85c', b: '#a855ff', em: 'crownGrand' },
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
