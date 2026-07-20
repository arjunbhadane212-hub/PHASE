// Boost shop-item icons (Step 2b of the Supabase migration).
//
// Ported from the old backend SHOP_POWER_UPS `icon` field (backend/server.py):
// the XP boosts used "zap" (lightning_boost.png) and the streak shield used
// "shield" (shield_item.png). `streak_revive` had no icon in the old catalog;
// it reuses the existing hourglass_xp asset (approved by Sachin). Every PNG
// referenced here already lives in public/shop-icons/ — no invented assets.
// Unknown keys fall back to the default crystal image.

const SHOP_ICON_BASE = '/shop-icons/';

export const DEFAULT_SHOP_ICON = SHOP_ICON_BASE + 'crystal_cluster.png';

const BOOST_ICON_FILES = {
  boost_xp_2x: 'lightning_boost.png',
  boost_xp_3x: 'lightning_boost.png',
  boost_xp_5x: 'lightning_boost.png',
  streak_shield: 'shield_item.png',
  streak_revive: 'hourglass_xp.png',
};

// Resolve a boost item's key to a full public asset path (default on miss).
export function boostIconFor(key) {
  const file = BOOST_ICON_FILES[key];
  return file ? SHOP_ICON_BASE + file : DEFAULT_SHOP_ICON;
}
