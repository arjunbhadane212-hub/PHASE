// PLACEHOLDER — Prompt 2 replaces every read of this file with live data from
// get_public_profile (shop_items.rarity_tier). Kept in its own file so it's a
// one-file deletion, not a hunt through components.
//
// The only consumer is the fallback block at the bottom of
// components/profile/FlexBadge.js. Delete this file, delete that block.

export const RARITY_GLOW = {
  common:    { glow: 0.18, sheen: false, halo: false, incandescent: false, a: '#8A93A6', b: '#B8C0D0' },
  rare:      { glow: 0.42, sheen: false, halo: false, incandescent: false, a: '#4E8FDB', b: '#8FC3FF' },
  epic:      { glow: 0.62, sheen: true,  halo: false, incandescent: false, a: '#7C8CF0', b: '#B4C0FF' },
  legendary: { glow: 0.82, sheen: true,  halo: true,  incandescent: false, a: '#F0A84E', b: '#FFCE85' },
  mythic:    { glow: 1.0,  sheen: true,  halo: true,  incandescent: true,  a: '#F2C45A', b: '#FFFFFF' },
};

// Hardcoded so the visual pass is fully testable before Prompt 2 wires real
// data. Names/breakpoints are the REAL confirmed content (Sachin's Notion doc)
// — Prompt 2 inserts these exact rows into shop_items, it does not invent them.
export const STREAK_RARITY_PLACEHOLDER = {
  'Rookie': 'common', 'Contender': 'common', 'Cooking': 'common', 'Burning': 'common', 'Locked': 'common',
  'Aflame': 'rare', 'Agony': 'rare', 'Blaze': 'rare',
  'Interlocked': 'epic', 'Incinerate': 'epic', 'Infernal': 'epic',
  'Ethereal': 'legendary', 'Unreal': 'legendary',
  'The Sovereign Overlord': 'mythic',
};

export const HOURS_RARITY_PLACEHOLDER = {
  'Timekeeper': 'common', 'Chronos': 'common', 'Temporal Drift': 'common',
  'Timeless': 'rare', 'Era Weaver': 'rare',
  'Void Walker': 'epic',
  'Lord of Time': 'legendary', 'Chrono-Archon': 'legendary',
  "Eternity's Edge": 'mythic',
};
