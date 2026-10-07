// Shared level / rank source of truth (Step 7).
//
// CLAUDE.md rank-ladder NAMES + COLORS, paired with the ported server.py XP
// thresholds. The level is stored in users.rank (computed by the complete_habit
// RPC via level_for_xp) and derived here for display. The rank-ladder colors are
// the LOCKED CLAUDE palette (violet/red/gold at the top tiers are intentional and
// sanctioned — distinct from the generic "bug purple" elsewhere).

// Ranks 1-10 are the original ladder (names/colors unchanged). Ranks 11-15 are the
// "prestige" tiers added 2026-10-07 — sanctioned extension above Apex, mirrored by the
// server's level_for_xp / rank_name_for (migration 20261007000000). Apex's upper bound
// moved from 999999 to 8500 so the new tiers sit above it.
//
// `tier: 'prestige'` marks the endgame ranks the Level page renders with heavier FX.
// `tagline` is short rank flavor used by the remodeled Level page (display only).
export const RANKS = [
  { level: 1,  name: 'Rookie',     min_xp: 0,     max_xp: 100,    color: '#64748B', tagline: 'Everyone starts here. Show up.' },
  { level: 2,  name: 'Novice',     min_xp: 101,   max_xp: 250,    color: '#14B8A6', tagline: 'The habit is forming. Keep moving.' },
  { level: 3,  name: 'Apprentice', min_xp: 251,   max_xp: 500,    color: '#06B6D4', tagline: 'Discipline is becoming a routine.' },
  { level: 4,  name: 'Adept',      min_xp: 501,   max_xp: 900,    color: '#38BDF8', tagline: 'You do this without thinking now.' },
  { level: 5,  name: 'Achiever',   min_xp: 901,   max_xp: 1400,   color: '#3B82F6', tagline: 'Proof you can finish what you start.' },
  { level: 6,  name: 'Expert',     min_xp: 1401,  max_xp: 2100,   color: '#6366F1', tagline: 'Consistency is now your edge.' },
  { level: 7,  name: 'Master',     min_xp: 2101,  max_xp: 3000,   color: '#8B5CF6', tagline: 'Few ever reach this far.' },
  { level: 8,  name: 'Elite',      min_xp: 3001,  max_xp: 4200,   color: '#EF4444', tagline: 'The top tier of the committed.' },
  { level: 9,  name: 'Champion',   min_xp: 4201,  max_xp: 6000,   color: '#A855F7', tagline: 'You set the standard others chase.' },
  { level: 10, name: 'Apex',       min_xp: 6001,  max_xp: 8500,   color: '#FBBF24', tagline: 'The summit of the mortal ladder.' },
  { level: 11, name: 'Ascendant',  min_xp: 8501,  max_xp: 11500,  color: '#F472B6', tagline: 'You climbed past the peak itself.', tier: 'prestige' },
  { level: 12, name: 'Mythic',     min_xp: 11501, max_xp: 15500,  color: '#818CF8', tagline: 'A name spoken, rarely seen.',        tier: 'prestige' },
  { level: 13, name: 'Celestial',  min_xp: 15501, max_xp: 21000,  color: '#22D3EE', tagline: 'Discipline beyond the horizon.',     tier: 'prestige' },
  { level: 14, name: 'Immortal',   min_xp: 21001, max_xp: 28000,  color: '#FB923C', tagline: 'Habits that outlast everything.',    tier: 'prestige' },
  { level: 15, name: 'Eternal',    min_xp: 28001, max_xp: 999999, color: '#EDEFF5', tagline: 'The final form. Legend.',            tier: 'prestige' },
];

export const MAX_LEVEL = 15;

// First prestige level — the threshold where the Level page turns up the drama.
export const PRESTIGE_LEVEL = 11;

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
