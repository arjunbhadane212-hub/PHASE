// =============================================================================
// MYSTERY BOX display helpers.
//
// Per-box drop POOLS live in the Supabase catalog (loot_boxes +
// loot_box_drop_table + shop_items) and are built into the modal's `box` shape
// by ShopPage, so displayed "exact" rates + items-per-open match what
// open_loot_box actually rolls. Only tier metadata + grouping remain here.
// =============================================================================

export const TIER_META = {
  common:    { label: 'Common',    order: 0, color: '#9BA09C' },
  rare:      { label: 'Rare',      order: 1, color: '#95DEE6' },
  legendary: { label: 'Legendary', order: 2, color: '#DBF67F' },
  mythic:    { label: 'Mythic',    order: 3, color: '#A59BCC' },
};

export const TIER_ORDER = ['common', 'rare', 'legendary', 'mythic'];

/** Group a box's pool by tier, preserving declaration order within tier. */
export function groupPoolByTier(box) {
  const groups = {};
  TIER_ORDER.forEach((t) => { groups[t] = []; });
  for (const item of box.pool) {
    if (groups[item.tier]) groups[item.tier].push(item);
  }
  return (box.tiers || TIER_ORDER)
    .slice()
    .sort((a, b) => (TIER_META[a]?.order ?? 9) - (TIER_META[b]?.order ?? 9))
    .map((tier) => ({ tier, items: groups[tier] || [] }))
    .filter((g) => g.items.length > 0);
}

/** Aggregate a box pool into per-tier odds (summed percent), high tier first. */
export function tierOdds(box) {
  const sums = {};
  (box.pool || []).forEach((p) => { sums[p.tier] = (sums[p.tier] || 0) + p.percent; });
  return TIER_ORDER
    .filter((t) => sums[t] > 0)
    .map((t) => ({ tier: t, pct: sums[t], ...TIER_META[t] }))
    .sort((a, b) => b.order - a.order);
}
