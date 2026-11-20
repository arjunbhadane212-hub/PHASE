// Shop v3 — data model shared by the live shop (pages/ShopPage) and the
// preview (/dev/shop). Pure functions: rows in, view model out. The server
// (get_shop_rotation) decides what is in stock; this only shapes it.

export const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary', 'mythic'];

// Flat surfaces with dark ink (v2 rule: these pastels are never text colours).
// Rarity escalates by STRUCTURE — how much of the card the colour is allowed
// to take — not by brightness or glow (memory: feedback-no-neon-glow).
export const RARITY = {
  // UI v3 palette (Nov 2026): sky → pink → sun → ink. No purple. `text` is the
  // deep variant used when the rarity colour has to be TEXT on a light card.
  common:    { label: 'Common',    bg: 'var(--gm-badge)', ink: 'var(--gm-muted)', text: 'var(--gm-muted)', solid: false },
  rare:      { label: 'Rare',      bg: '#9DD3F7', ink: '#0B2E45', text: '#1F6FA3', solid: false },
  epic:      { label: 'Epic',      bg: '#F6B3CE', ink: '#4B1530', text: '#B8436F', solid: false },
  legendary: { label: 'Legendary', bg: '#FFD25E', ink: '#4A3500', text: '#8A6A00', solid: true },
  mythic:    { label: 'Mythic',    bg: 'var(--gm-ink)', ink: 'var(--gm-bg)', text: 'var(--gm-ink)', solid: true },
};
export const tierRank = (t) => Math.max(0, RARITY_ORDER.indexOf(t));
export const rarityOf = (t) => RARITY[t] || RARITY.common;

export const ROTATING = ['title', 'banner', 'anim', 'effect'];

export const CATEGORY_COPY = {
  title: { title: 'Titles', short: 'Titles', one: 'Title', blurb: 'Worn on your profile and in the league.' },
  banner: { title: 'Banners', short: 'Banners', one: 'Banner', blurb: 'The header everyone sees on your profile.' },
  anim: { title: 'Animations', short: 'Anims', one: 'Animation', blurb: 'Motion around your avatar.' },
  effect: { title: 'Profile effects', short: 'Effects', one: 'Effect', blurb: 'A ring effect for your public profile.' },
};

export const EQUIP_FIELD = { title: 'equipped_title', banner: 'equipped_banner', anim: 'equipped_animation', effect: 'equipped_decoration' };

export const DEFAULT_ODDS = { common: 40, rare: 32, epic: 18, legendary: 10, slots: { title: 4, banner: 3, anim: 3, effect: 3 } };

export const fmt = (n) => Number(n || 0).toLocaleString();

const isShopSold = (r) => ROTATING.includes(r.category) && !r.box_only && (r.price_gems || 0) > 0
  && (r.category !== 'title' || r.source_system === 'shop');

const tierOfRow = (r) => r.rarity_tier || r.rarity || 'common';

// "Back after 23 days" / "First drop" — the thing that makes a restock feel
// like news. Cycles are days (shop_cycle_hours = 24).
export function historyLabel({ timesSeen, lastSeenCycle, cycle }) {
  if (!timesSeen) return { kind: 'first', text: 'First drop' };
  const gap = lastSeenCycle != null && cycle != null ? cycle - lastSeenCycle : null;
  if (gap != null && gap >= 7) return { kind: 'back', text: `Back after ${gap}d` };
  return null;
}

// How often an item turns up, from the live odds: each of the section's slots
// rolls this rarity with p%, shared across the items of that rarity.
export function appearEvery({ category, tier }, odds, poolCounts, mythicCount) {
  if (tier === 'mythic') return { vault: true, every: Math.max(1, mythicCount || 1), unit: 'wk' };
  const slots = odds?.slots?.[category] ?? DEFAULT_ODDS.slots[category] ?? 3;
  const p = (odds?.[tier] ?? DEFAULT_ODDS[tier] ?? 0) / 100;
  const n = poolCounts?.[category]?.[tier] || 1;
  const perDay = (slots * p) / n;
  if (!perDay) return null;
  return { vault: false, every: Math.max(1, Math.round(1 / perDay)), unit: 'd' };
}

export function buildShopModel({ catalog = [], rotation = null, owned = {}, equippedIds = new Set(), user = null, wishlist = new Set() }) {
  const byId = {};
  catalog.forEach((r) => { byId[r.id] = r; });
  const cycle = rotation?.cycle ?? null;
  const odds = rotation?.odds?.common != null ? rotation.odds : DEFAULT_ODDS;

  const inDrop = new Map((rotation?.items || []).map((x) => [x.shop_item_id, x]));
  const inVault = new Map((rotation?.vault?.items || []).map((x) => [x.shop_item_id, x]));

  const toItem = (r) => {
    const rr = inDrop.get(r.id);
    const vv = inVault.get(r.id);
    const tier = tierOfRow(r);
    return {
      id: r.id, key: r.key, name: r.name, category: r.category, tier,
      price: r.price_gems, dealPrice: rr?.deal_price ?? null, featured: !!rr?.featured,
      owned: (owned[r.id] || 0) > 0,
      equipped: equippedIds.has(r.id) || (user?.[EQUIP_FIELD[r.category]] === r.key),
      wish: wishlist.has(r.id),
      inDrop: !!rr, inVault: !!vv, vaultSlot: vv?.slot || null,
      history: rr ? historyLabel({ timesSeen: rr.times_seen, lastSeenCycle: rr.last_seen_cycle, cycle }) : null,
      position: rr?.position ?? vv?.position ?? 0,
      source: r.source_system || 'shop', meta: r.metadata || {},
      sold: isShopSold(r),
    };
  };

  const shelves = { title: [], banner: [], anim: [], effect: [] };
  let featured = null; let deal = null;
  (rotation?.items || []).forEach((x) => {
    const r = byId[x.shop_item_id];
    if (!r || !shelves[r.category]) return;
    const it = toItem(r);
    shelves[r.category].push(it);
    if (it.featured) featured = it;
    if (it.dealPrice != null) deal = it;
  });
  ROTATING.forEach((c) => shelves[c].sort((a, b) => a.position - b.position));

  const vault = (rotation?.vault?.items || [])
    .map((x) => byId[x.shop_item_id] && toItem(byId[x.shop_item_id]))
    .filter(Boolean)
    .sort((a, b) => a.position - b.position);

  // The whole sheet: every item the shop can ever sell, plus earned titles
  // (shown locked, never sold) so the Titles index is complete.
  const poolCounts = { title: {}, banner: {}, anim: {}, effect: {} };
  let mythicCount = 0;
  catalog.forEach((r) => {
    if (!isShopSold(r)) return;
    const t = tierOfRow(r);
    poolCounts[r.category][t] = (poolCounts[r.category][t] || 0) + 1;
    if (t === 'mythic') mythicCount += 1;
  });

  const index = { title: [], banner: [], anim: [], effect: [] };
  catalog.forEach((r) => {
    if (!index[r.category]) return;
    const sold = isShopSold(r);
    const earned = r.category === 'title' && ['streak', 'hours', 'box'].includes(r.source_system);
    if (!sold && !earned) return;
    const it = toItem(r);
    it.appear = sold ? appearEvery(it, odds, poolCounts, mythicCount) : null;
    index[r.category].push(it);
  });
  ROTATING.forEach((c) => index[c].sort((a, b) =>
    (a.sold === b.sold ? 0 : a.sold ? -1 : 1) || tierRank(b.tier) - tierRank(a.tier) || (a.price || 0) - (b.price || 0) || a.name.localeCompare(b.name)));

  const collection = {};
  let have = 0; let total = 0;
  ROTATING.forEach((c) => {
    const pool = index[c].filter((i) => i.sold);
    const n = pool.filter((i) => i.owned).length;
    collection[c] = { have: n, total: pool.length };
    have += n; total += pool.length;
  });

  const dropTiers = {};
  [...ROTATING.flatMap((c) => shelves[c])].forEach((i) => { dropTiers[i.tier] = (dropTiers[i.tier] || 0) + 1; });

  const wishInStock = [...ROTATING.flatMap((c) => shelves[c]), ...vault].filter((i) => i.wish && !i.owned);

  return {
    cycle, dropNumber: rotation?.drop_number ?? null, odds,
    endsAt: rotation?.ends_at || null, vaultEndsAt: rotation?.vault?.ends_at || null, vaultWeek: rotation?.vault?.week ?? null,
    shelves, featured, deal, vault, index, collection: { ...collection, have, total },
    dropTiers, dropCount: ROTATING.reduce((s, c) => s + shelves[c].length, 0), wishInStock,
    allLive: [...ROTATING.flatMap((c) => shelves[c]), ...vault],
  };
}

// The order the drop reveals in: worst first, best last (same rule as the
// box opening) — so the scroll down the page is a climb.
export function revealOrder(model) {
  return model.allLive
    .filter((i) => i.inDrop)
    .slice()
    .sort((a, b) => tierRank(a.tier) - tierRank(b.tier));
}
