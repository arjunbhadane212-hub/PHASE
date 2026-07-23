// Shared level / rank source of truth (Step 7).
//
// CLAUDE.md rank-ladder NAMES + COLORS, paired with the ported server.py XP
// thresholds. The level is stored in users.rank (computed by the complete_habit
// RPC via level_for_xp) and derived here for display. The rank-ladder colors are
// the LOCKED CLAUDE palette (violet/red/gold at the top tiers are intentional and
// sanctioned — distinct from the generic "bug purple" elsewhere).

export const RANKS = [
  { level: 1,  name: 'Rookie',     min_xp: 0,    max_xp: 100,    color: '#64748B' },
  { level: 2,  name: 'Novice',     min_xp: 101,  max_xp: 250,    color: '#14B8A6' },
  { level: 3,  name: 'Apprentice', min_xp: 251,  max_xp: 500,    color: '#06B6D4' },
  { level: 4,  name: 'Adept',      min_xp: 501,  max_xp: 900,    color: '#38BDF8' },
  { level: 5,  name: 'Achiever',   min_xp: 901,  max_xp: 1400,   color: '#3B82F6' },
  { level: 6,  name: 'Expert',     min_xp: 1401, max_xp: 2100,   color: '#6366F1' },
  { level: 7,  name: 'Master',     min_xp: 2101, max_xp: 3000,   color: '#8B5CF6' },
  { level: 8,  name: 'Elite',      min_xp: 3001, max_xp: 4200,   color: '#EF4444' },
  { level: 9,  name: 'Champion',   min_xp: 4201, max_xp: 6000,   color: '#A855F7' },
  { level: 10, name: 'Apex',       min_xp: 6001, max_xp: 999999, color: '#FBBF24' },
];

export const MAX_LEVEL = 10;

// Derive level from XP — mirrors the SQL level_for_xp used by complete_habit.
export function levelForXp(xp) {
  const x = xp || 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (x >= RANKS[i].min_xp) return RANKS[i].level;
  }
  return 1;
}

// Rank metadata for a stored level (users.rank), clamped to 1..10.
export function rankInfo(level) {
  const lvl = Math.min(MAX_LEVEL, Math.max(1, level || 1));
  return RANKS[lvl - 1];
}
