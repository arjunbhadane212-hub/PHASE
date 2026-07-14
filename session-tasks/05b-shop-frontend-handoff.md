# Shop rebuild — Part A + B(backend) DONE; frontend handoff (B4/B5, C, D)

Session date: 2026-07-14. Companion to `05-shop-profile-equip-rebuild.md` (updated spec).

## What is DONE and verified (server-side, via Supabase MCP)

All DB work is applied to project `dnfcrpthpinilibvqwtf` and committed as migrations
`20260714030000`…`20260714034000`. Every path below was tested end-to-end inside
rolled-back transactions (JWT context set, gems funded, all reverted):

- **shop_items** extended: `rarity`, `hex_value`, `gradient_value`, `max_owned`,
  `box_only`; `price_gems` now nullable. Category taxonomy is now lowercase-singular:
  `boost | color_main | color_banner | anim | banner | effect | title`.
- **Catalog seeded (69 rows)** with EXACT hex/gradient values from the spec:
  5 boost, 13 color_main, 5 color_banner, 9 anim, 12 banner, 16 effect, 9 title.
  The 4 original premium Effects (flame/frost/lightning/galaxy_spiral, 3000) kept.
- **loot_boxes** (starter 100 / delta 500 / phase 2000, 2 per open) +
  **loot_box_drop_table** (weighted). Reward-direction rule enforced & asserted:
  no phase titles in starter/delta, no delta titles in starter.
- **user_inventory** + **user_equipped** relational tables (RLS: read-own; all writes
  via SECURITY DEFINER RPCs). Existing jsonb ownership migrated in; Vibrant Blue
  seeded as default-owned + equipped main color for all users.
- **RPCs** (call via `supabase.rpc(...)`, same pattern as `complete_habit`):

### RPC contracts for the frontend

```
purchase_shop_item(p_shop_item_id uuid) -> json
  { gems, item_key, name, category, quantity, max_owned }
  errors: 'Need N more gems' | 'You already own the maximum of this item (x/y)'
          | 'This item can only be obtained from loot boxes' | 'Not authenticated'

equip_item(p_shop_item_id uuid) -> json
  { equipped: <key>, category, name, hex, gradient }
  errors: 'You do not own this item' | 'This item type cannot be equipped'
  (upsert on (user_id, category) => auto-unequips previous item in that category)

open_loot_box(p_loot_box_id uuid) -> json
  { box, gems, total_refund, items: [ { item_key, name, category, rarity,
      hex, gradient, duplicate:bool, refund? } ] }
  errors: 'Need N more gems'
```

Read models the UI should query directly (RLS-guarded, own rows):
- catalog: `supabase.from('shop_items').select('*')` (world-readable)
- boxes: `from('loot_boxes')`, `from('loot_box_drop_table')` (world-readable — use
  weights to render "View Drop Rates" as %; DO NOT reintroduce banned tier names)
- ownership: `from('user_inventory').select('*, shop_items(*)')`
- equipped: `from('user_equipped').select('*, shop_items(*)')`
- gems: `users.gems` (already on the AuthContext user object)

## TODO — B4/B5 (shop frontend) — cannot be built here (no local Node toolchain)

`frontend/src/pages/ShopPage.js` and `contexts/GameContext.js` still call the DEAD
FastAPI backend via `axios.get(process.env.REACT_APP_BACKEND_URL + '/api/...')`
(`REACT_APP_BACKEND_URL` is empty → returns the SPA's index.html → shop renders
nothing, nothing purchasable, gem counter stale). This is the root cause of the
"nothing buys / gems don't update" bug. Rewire it:

1. Replace all `axios` shop calls with Supabase:
   - `fetchShop` → `supabase.from('shop_items').select('*')` grouped by `category`
     into the six tabs. TABS id→category map: `powerups→boost`, `colors→color_main`
     + `color_banner` (Main/Banner sub-tabs), `anims→anim`, `banners→banner`,
     `decos→effect`, `titles→title`.
   - `handleBuy` → `supabase.rpc('purchase_shop_item', { p_shop_item_id: item.id })`.
   - color/profile-item buys → same RPC (categories are just data now; the separate
     `buy-color`/`buy-profile-item` endpoints are obsolete).
   - box open → `supabase.rpc('open_loot_box', { p_loot_box_id })`; feed returned
     `items` to the existing `BoxOpening` reveal (stop using any client-side roll).
2. Item tiles: render swatch from `hex_value` (solid circle) / `gradient_value`
   (banner/effect/rainbow-conic), `rarity` badge, price, and state from a live
   `user_inventory` query: Owned when `quantity >= max_owned`, "N/max owned" for
   boosts, greyed "Need X more gems" when unaffordable, hide Buy on `box_only`.
3. **Gem counter refresh bug:** the shop must read gems from the same source the
   rest of the app updates (AuthContext `user.gems` via `refreshUser()`), not a
   snapshot fetched on mount. After any purchase/box-open, call `refreshUser()` and
   re-query inventory. GameContext's `fetchGameStatus`/`fetchShopItems` (axios) are
   dead — repoint gems to `useAuth().user.gems` or a Supabase read.
4. Run the B5 checklist in the spec before calling B done.

## TODO — Part C (equip flow, Discord-style)
`SettingsPage.js` "Customize Profile" section: for each category, list rows from
`user_inventory ⋈ shop_items` filtered by category; each with an Equip button that
calls `equip_item`. Mark the currently-equipped one (from `user_equipped`) with
"Equipped" instead of a button. One-per-category is DB-enforced.

## TODO — Part D (Public Profile rebuild)
Rebuild `PublicProfilePage.js` per spec §Part D. Render REAL equipped items from
`user_equipped ⋈ shop_items`: banner (gradient_value bg), avatar ring (equipped
effect hex glow, else rank-tier color — document precedence), name in equipped
color_main hex, equipped title next to username. Streak Hero widget + exactly 3
blue stats (Total XP / Longest Streak / Habits Done). All counts from live
`user_inventory` queries — the "Banners (6)" fake-count bug is now structurally
impossible if you never read the deprecated jsonb columns.

- **Avatar upload moderation — DECISION NEEDED FROM ARJUN:** recommendation is to
  start with the cheap/free path — client-side type/size validation + a serverless
  hash check against known-bad hashes (e.g. PhotoDNA-style list) — and defer paid
  AI vision moderation until there's real UGC volume. AI vision (e.g. a vision model
  per upload) is more robust but costs per-image and adds latency; given the
  "everything free" constraint, flag before wiring anything paid.

## Cross-session reconciliation (concurrent Shield/Revive session)
- That session added `streak_shields`/`streak_revives` integer counters + rows and
  its own `buy_item`/`use_streak_revive`/`buy_focus_shield`/`evaluate_streak`.
- `purchase_shop_item` and `open_loot_box` **dual-write** those counters for
  `streak_shield`/`streak_revive` so Focus Mode consumption keeps working while both
  systems coexist. End state: consumption should read `user_inventory`; then drop the
  counters, the legacy `unlocked_*`/`equipped_*` jsonb columns, `boost_inventory`,
  and the legacy `buy_item` RPC. Don't drop them until that session is migrated.

## Also flagged: `frontend/src/data/boxDrops.js` uses BANNED tier naming
It labels box tiers "Common 65% / Rare 35% / Ultra-Rare" and exports `TIER_META`
with an `Ultra-Rare` label — exactly the dead naming CLAUDE.md forbids and the QA
"View Drop Rates" bug. When wiring box UI to `loot_box_drop_table`, replace this file
/ the drop-rates screen with Starter/Delta/Phase + per-item rarity tags only.
