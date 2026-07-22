// =============================================================================
// MYSTERY BOX display helpers.
//
// The per-box drop POOLS live in the Supabase catalog (loot_boxes +
// loot_box_drop_table + shop_items) and are built into the modal's `box` shape
// by ShopPage (Step 5), so the displayed "exact" drop rates and items-per-open
// match exactly what open_loot_box actually rolls. Only the tier metadata and
// the grouping helper remain here.
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
    if (groups[item.tier]) groups[item.tier].push(item);
  }
  return box.tiers
    .map((tier) => ({ tier, items: groups[tier] }))
    .filter((g) => g.items.length > 0);
}
