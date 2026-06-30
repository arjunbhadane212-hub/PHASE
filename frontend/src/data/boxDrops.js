// =============================================================================
// MYSTERY BOX DROP TABLES — single source of truth, App Store / Play Store
// loot-box disclosure compliant. Percentages are EXACT (no weight-to-percent
// rounding) and sum to exactly 100.0% per box.
// =============================================================================

// Items shared between Delta and Phase titles. When dropped, tag with source
// box tier (handled by opening flow).
export const SHARED_TITLES = ['Overkill', 'Vermin', 'Relentless'];

// =============================================================================
// STARTER BOX — drops 2 items per open. No Ultra-Rare tier.
// Tier split: Common 65% / Rare 35% (UR 7% redistributed proportionally).
// =============================================================================
export const STARTER_BOX = {
  id: 'starter',
  name: 'Starter Box',
  label: 'STARTER',
  cost: 100,
  dropsPerOpen: 2,
  tiers: ['common', 'rare'],
  pool: [
    // ---- Common (65%) — 5 items × 13.0% ----
    { id: 'xp_2x_5',   name: 'x2 XP Boost (5 min)',  type: 'boost', tier: 'common', percent: 13.0, meta: { multiplier: 2, duration: 5 } },
    { id: 'xp_2x_10',  name: 'x2 XP Boost (10 min)', type: 'boost', tier: 'common', percent: 13.0, meta: { multiplier: 2, duration: 10 } },
    { id: 'xp_2x_20',  name: 'x2 XP Boost (20 min)', type: 'boost', tier: 'common', percent: 13.0, meta: { multiplier: 2, duration: 20 } },
    { id: 'shield_1',  name: 'Streak Shield',        type: 'shield', tier: 'common', percent: 13.0 },
    { id: 'gems_s',    name: 'Gems (5–15)',          type: 'gems',  tier: 'common', percent: 13.0, meta: { min: 5, max: 15 } },

    // ---- Rare (35%) — 5 Starter-exclusive titles × 5.8% + Banner 6.0% ----
    { id: 'title_sprout', name: 'Sprout',  type: 'title', tier: 'rare', percent: 5.8, source: 'starter' },
    { id: 'title_cinder', name: 'Cinder',  type: 'title', tier: 'rare', percent: 5.8, source: 'starter' },
    { id: 'title_pace',   name: 'Pace',    type: 'title', tier: 'rare', percent: 5.8, source: 'starter' },
    { id: 'title_drift',  name: 'Drift',   type: 'title', tier: 'rare', percent: 5.8, source: 'starter' },
    { id: 'title_spark',  name: 'Spark',   type: 'title', tier: 'rare', percent: 5.8, source: 'starter' },
    { id: 'banner_starter', name: 'Starter Banner', type: 'banner', tier: 'rare', percent: 6.0, source: 'starter' },
  ],
};

// =============================================================================
// DELTA BOX — drops 2 items per open. No Ultra-Rare tier.
// Tier split: Common 65% / Rare 35%.
// Within Rare, shared titles weighted ~1.85× vs unique Delta titles.
// =============================================================================
const DELTA_UNIQUE_TITLES = [
  'Enforcer', 'Vandal', 'Hollow', 'Menace', 'Phantom', 'Savage',
  'Grinder', 'Heavy', 'Stray', 'Rebel', 'Drifter', 'Grit', 'Zero',
];

export const DELTA_BOX = {
  id: 'delta',
  name: 'Delta Box',
  label: 'DELTA',
  cost: 500,
  dropsPerOpen: 2,
  tiers: ['common', 'rare'],
  pool: [
    // ---- Common (65.0%) — 8 items × 8.125% (rounded to 8.1% display, with 1 at 8.2% to hit 65.0) ----
    { id: 'xp_2x_5_d',  name: 'x2 XP Boost (5 min)',  type: 'boost',  tier: 'common', percent: 8.1, meta: { multiplier: 2, duration: 5 } },
    { id: 'xp_2x_10_d', name: 'x2 XP Boost (10 min)', type: 'boost',  tier: 'common', percent: 8.1, meta: { multiplier: 2, duration: 10 } },
    { id: 'xp_2x_20_d', name: 'x2 XP Boost (20 min)', type: 'boost',  tier: 'common', percent: 8.1, meta: { multiplier: 2, duration: 20 } },
    { id: 'xp_3x_5_d',  name: 'x3 XP Boost (5 min)',  type: 'boost',  tier: 'common', percent: 8.1, meta: { multiplier: 3, duration: 5 } },
    { id: 'xp_3x_10_d', name: 'x3 XP Boost (10 min)', type: 'boost',  tier: 'common', percent: 8.1, meta: { multiplier: 3, duration: 10 } },
    { id: 'xp_3x_20_d', name: 'x3 XP Boost (20 min)', type: 'boost',  tier: 'common', percent: 8.1, meta: { multiplier: 3, duration: 20 } },
    { id: 'shield_d',   name: 'Streak Shield',        type: 'shield', tier: 'common', percent: 8.1 },
    { id: 'gems_m',     name: 'Gems (50–150)',        type: 'gems',   tier: 'common', percent: 8.3, meta: { min: 50, max: 150 } },

    // ---- Rare (35.0%) — Color 4.0 + Banner 4.0 + 13 unique × 1.7 + 3 shared × 1.7 (bumped via separate weight) ----
    // Spec: shared titles "pull from a slightly higher weight". Implemented as:
    //   unique title = 1.5%, shared title = 2.5% (shared ≈ 1.67× unique)
    { id: 'color_delta',  name: 'Delta Avatar Accent Color', type: 'color',  tier: 'rare', percent: 4.0, source: 'delta' },
    { id: 'banner_delta', name: 'Delta Banner',              type: 'banner', tier: 'rare', percent: 4.0, source: 'delta' },
    ...DELTA_UNIQUE_TITLES.map((t) => ({
      id: `title_delta_${t.toLowerCase()}`,
      name: t,
      type: 'title',
      tier: 'rare',
      percent: 1.5,
      source: 'delta',
    })),
    ...SHARED_TITLES.map((t) => ({
      id: `title_shared_${t.toLowerCase()}_delta`,
      name: t,
      type: 'title',
      tier: 'rare',
      percent: 2.5,
      source: 'delta',
      shared: true,
      tierTag: 'DELTA',
    })),
    // Verify rare sum: 4 + 4 + 13×1.5 + 3×2.5 = 4 + 4 + 19.5 + 7.5 = 35.0% ✓
  ],
};

// =============================================================================
// PHASE BOX — drops 3 items per open. Full Common/Rare/Ultra-Rare split.
// Tier split: Common 56% / Rare 31.5% / Ultra-Rare 12.5%.
// (60/33/7 framework relaxed so every UR item meets the ≥0.5% floor while
// no single UR item exceeds 2%, satisfying the per-item rate guidance.)
// =============================================================================
const PHASE_UNIQUE_TITLES = [
  'God-Complex', 'Anti-Hero', 'Anomaly', 'Havoc', 'Despair', 'Malice',
  'Wrath', 'Executioner', 'Nightfall', 'Vengeance', 'Untouchable',
  'Cataclysm', 'Ruin',
];

const PHASE_COLORS = ['Cobalt', 'Sapphire', 'Steel', 'Ice'];

export const PHASE_BOX = {
  id: 'phase',
  name: 'Phase Box',
  label: 'PHASE',
  cost: 2000,
  dropsPerOpen: 3,
  tiers: ['common', 'rare', 'ultra'],
  pool: [
    // ---- Common (56.0%) — 8 items × 7.0% ----
    { id: 'shield_p',   name: 'Streak Shield',        type: 'shield', tier: 'common', percent: 7.0 },
    { id: 'xp_3x_5_p',  name: 'x3 XP Boost (5 min)',  type: 'boost',  tier: 'common', percent: 7.0, meta: { multiplier: 3, duration: 5 } },
    { id: 'xp_3x_10_p', name: 'x3 XP Boost (10 min)', type: 'boost',  tier: 'common', percent: 7.0, meta: { multiplier: 3, duration: 10 } },
    { id: 'xp_3x_20_p', name: 'x3 XP Boost (20 min)', type: 'boost',  tier: 'common', percent: 7.0, meta: { multiplier: 3, duration: 20 } },
    { id: 'xp_4x_5_p',  name: 'x4 XP Boost (5 min)',  type: 'boost',  tier: 'common', percent: 7.0, meta: { multiplier: 4, duration: 5 } },
    { id: 'xp_4x_10_p', name: 'x4 XP Boost (10 min)', type: 'boost',  tier: 'common', percent: 7.0, meta: { multiplier: 4, duration: 10 } },
    { id: 'xp_4x_20_p', name: 'x4 XP Boost (20 min)', type: 'boost',  tier: 'common', percent: 7.0, meta: { multiplier: 4, duration: 20 } },
    { id: 'gems_l',     name: 'Gems (150–400)',       type: 'gems',   tier: 'common', percent: 7.0, meta: { min: 150, max: 400 } },

    // ---- Rare (31.5%) — 4 Phase-exclusive colors × 6.0% + Banner 7.5% ----
    ...PHASE_COLORS.map((c) => ({
      id: `color_phase_${c.toLowerCase()}`,
      name: `${c} Avatar Color`,
      type: 'color',
      tier: 'rare',
      percent: 6.0,
      source: 'phase',
    })),
    { id: 'banner_phase', name: 'Phase Banner', type: 'banner', tier: 'rare', percent: 7.5, source: 'phase' },

    // ---- Ultra-Rare (12.5%) ----
    // 3 marquee unlocks × 1.5% = 4.5%
    { id: 'anim_profile', name: 'Profile Animation Unlock', type: 'animation', tier: 'ultra', percent: 1.5, source: 'phase' },
    { id: 'anim_logo',    name: 'Logo Animation Unlock',    type: 'logo_anim', tier: 'ultra', percent: 1.5, source: 'phase' },
    { id: 'ui_accent',    name: 'Accent UI Color Unlock',   type: 'ui_color',  tier: 'ultra', percent: 1.5, source: 'phase',
      description: 'Recolors progress ring, primary buttons, profile badge glow. Never the app background, nav bar, or core chrome.' },

    // 13 Phase-exclusive titles × 0.5% = 6.5%
    ...PHASE_UNIQUE_TITLES.map((t) => ({
      id: `title_phase_${t.toLowerCase().replace(/[^a-z]/g, '_')}`,
      name: t,
      type: 'title',
      tier: 'ultra',
      percent: 0.5,
      source: 'phase',
    })),

    // 3 shared titles × 0.5% = 1.5%
    ...SHARED_TITLES.map((t) => ({
      id: `title_shared_${t.toLowerCase()}_phase`,
      name: t,
      type: 'title',
      tier: 'ultra',
      percent: 0.5,
      source: 'phase',
      shared: true,
      tierTag: 'PHASE',
    })),
    // Verify UR sum: 3×1.5 + 13×0.5 + 3×0.5 = 4.5 + 6.5 + 1.5 = 12.5% ✓
    // Verify total: 56.0 + 31.5 + 12.5 = 100.0% ✓
  ],
};

// =============================================================================
// Box registry — keyed lookup for the modal and opening flow.
// =============================================================================
export const BOXES_BY_ID = {
  starter: STARTER_BOX,
  delta: DELTA_BOX,
  phase: PHASE_BOX,
};

// =============================================================================
// Helpers
// =============================================================================
export const TIER_META = {
  common: { label: 'Common',     order: 0 },
  rare:   { label: 'Rare',       order: 1 },
  ultra:  { label: 'Ultra-Rare', order: 2 },
};

/** Group a box's pool by tier, preserving declaration order within tier. */
export function groupPoolByTier(box) {
  const groups = { common: [], rare: [], ultra: [] };
  for (const item of box.pool) {
    groups[item.tier].push(item);
  }
  return box.tiers
    .map((tier) => ({ tier, items: groups[tier] }))
    .filter((g) => g.items.length > 0);
}

/** Sum of all percentages in a box (should be 100.0). */
export function totalPercent(box) {
  return box.pool.reduce((s, i) => s + i.percent, 0);
}

/** Sum of percentages within a single tier. */
export function tierPercent(box, tier) {
  return box.pool.filter((i) => i.tier === tier).reduce((s, i) => s + i.percent, 0);
}

// Dev-time sanity check (no-op in production builds).
if (process.env.NODE_ENV !== 'production') {
  for (const box of [STARTER_BOX, DELTA_BOX, PHASE_BOX]) {
    const sum = totalPercent(box);
    if (Math.abs(sum - 100) > 0.001) {
      // eslint-disable-next-line no-console
      console.warn(`[boxDrops] ${box.id} pool sums to ${sum.toFixed(2)}%, expected 100.00%`);
    }
  }
}
