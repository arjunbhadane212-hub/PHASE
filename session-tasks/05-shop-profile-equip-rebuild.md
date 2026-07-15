# Session Task: Shop Catalog, Public Profile Rebuild, and Discord-Style Equip Flow

**THIS IS THE MOST IMPORTANT FILE. The shop is the core of Phase's economy and social-flex loop — it must work completely, end to end, with zero placeholder/fake behavior. Read this file fully before writing any code.**

Source: `DEV_PROMPT_2026-07-14_full-fix-and-build.md`, sections 3 and 4. Read `CLAUDE.md` first, and the Notion "📱 PHASE — Master Knowledge Base" pages 05 (Economy System) and 07 (Public Profile Spec) if you have Notion access — otherwise this file has the relevant content already extracted.

**The non-negotiable success criterion for this whole session:** a user should be able to (1) earn gems from completing habits, (2) see those gems reflected instantly and correctly in the shop, (3) buy any item in any category, (4) immediately see that item appear in their personal inventory ("Customize Profile" section), (5) equip it with one click, and (6) see it actually rendered on their Public Profile. Every single step of that chain must work. If you get partway through and something in that chain doesn't work, do not consider this task done — that chain is the whole point.

---

## Why this is scoped as one file despite being large

The shop catalog, shop frontend, equip flow, and Public Profile rebuild are tightly coupled — the profile can't show real equipped items until there's a real catalog to equip from, and the equip flow can't be tested until both exist. Work through Parts A → B → C → D in order. Per `CLAUDE.md`'s rule about scoping one task per session, if you're deep into this and it's not converging, stop and report back rather than looping — but do not stop partway through Part B or C in a state where purchases silently fail or don't grant inventory. That's the one thing that must not ship half-done.

---

## Part A — Database schema

Currently `public.shop_items` has exactly 4 rows total, all in the `Effects` category (Flame Ring, Frost Ring, Lightning Arc, Galaxy Spiral, 3,000 gems each — keep these, don't change them). There is no table at all for loot boxes, an inventory/ownership join table, or an equipped-items tracker. Build all of this out as real, queryable Postgres tables — not JSON blobs stuffed into a single column, since you need to query "does this user own this item" and "what does this user have equipped" efficiently and safely (with RLS).

### A1. Extend `shop_items` (or create a cleaner replacement table — your call, but be consistent)

Each row needs at minimum:
- `id` (uuid, pk)
- `key` (text, unique, machine-readable slug e.g. `color_main_cyan`)
- `category` (text: `boost` | `color_main` | `color_banner` | `anim` | `banner` | `effect` | `title`)
- `name` (text, display name e.g. "Cyan")
- `rarity` (text: `common` | `rare` | `legendary` | `mythic` — item-level rarity tag, see naming rules below)
- `price_gems` (integer, null if not directly purchasable — e.g. title items that only come from loot boxes)
- `hex_value` (text, nullable — populate for every color/banner/effect item, see exact hex table in A2 below)
- `gradient_value` (text, nullable — for banners/effects that are gradients rather than solid colors, store a CSS-compatible gradient string, e.g. `linear-gradient(135deg, #FB923C, #FDE047)`)
- `metadata` (jsonb, nullable — use for anything item-type-specific, e.g. boost duration/multiplier, animation asset reference)
- `max_owned` (integer, nullable — e.g. boosts might cap at 3 owned like the "0/3 owned" pattern seen in the current shop UI; colors/banners/effects/titles should be `1`, since owning 2 of the same cosmetic makes no sense)
- `box_only` (boolean, default false — true for items that can only come from loot boxes, not direct gem purchase, e.g. Phase-tier titles per the locked reward-direction rule)

### A2. Exact colors — use these precise hex values, do not approximate

These were pulled directly from the actual designed screenshots Arjun provided. Do not substitute close-but-different Tailwind default colors — use these exact values so the shop matches the intended design pixel-for-pixel.

**Main Colors** (category `color_main`, solid circle swatches):
| Name | Hex | Rarity | Price (gems) |
|---|---|---|---|
| Cyan | `#22D3EE` | Rare | 300 |
| Green | `#22C55E` | Rare | 300 |
| Lime | `#84CC16` | Rare | 300 |
| Deep Orange | `#EA580C` | Rare | 300 |
| Sky Blue | `#3B82F6` | Main | 300 |
| Indigo | `#6366F1` | Rare | 300 |
| Vibe Amber | `#D97706` | Rare | 300 |
| Vibrant Blue | `#2563EB` | Main | Owned (seed as already-owned default for new accounts, or 0 gems) |
| Teal | `#14B8A6` | Main | 150 |
| Vibrant Rose | `#F43F5E` | Legendary | 600 |
| Deep Crimson | `#DC2626` | Legendary | 600 |
| Orange | `#F97316` | Main | 300 |
| Amber | `#F59E0B` | Rare | 300 |

**Banner Colors** (category `color_banner`, solid circle swatches — separate sub-tab from Main):
| Name | Hex | Rarity | Price (gems) |
|---|---|---|---|
| Vibe Purple | `#A855F7` | Legendary | 600 |
| Deep Violet | `#7C3AED` | Legendary | 600 |
| Rich Purple | `#9333EA` | Legendary | 600 |
| Magenta | `#D946EF` | Legendary | 600 |
| Vibrant Rose | `#F43F5E` | Legendary | 600 |

**Important:** the purple/violet names above (Vibe Purple, Deep Violet, Rich Purple, Magenta) are intentional cosmetic content — do not desaturate or "fix" them per any purple-sweep effort happening elsewhere in the app. Users are meant to be able to choose a purple accent color for their own profile if they want one; that is different from purple appearing in app UI chrome (buttons, nav, loading states), which is what any purple-sweep task is about.

**Anims (profile animations)** — rendered as a glowing circle preview in the shop, category `anim`:
| Name | Rarity | Price (gems) | Glow color (hex, for the ring/glow effect) |
|---|---|---|---|
| Supernova | Mythic | 1200 | `#F472B6` (pink-toned glow per screenshot) |
| Ethereal Glow | Mythic | 1200 | `#60A5FA` |
| Inferno | Mythic | 1500 | `#F59E0B` |
| Divine Light | Mythic | 2000 | `#FDE047` |
| Plasma | Legendary | 700 | `#EC4899` |
| Shadow Flame | Legendary | 700 | `#F43F5E` |
| Lightning Storm | Legendary | 800 | `#60A5FA` |
| Cosmic | Legendary | 800 | `#A78BFA` |
| Golden Aura | Legendary | 800 | `#FBBF24` |

**Banners** (full-width rectangle preview, category `banner`) — use gradients matching what was shown:
| Name | Rarity | Price (gems) | Gradient |
|---|---|---|---|
| Void Walker | Mythic | 1500 | `linear-gradient(135deg, #1E1B2E, #0A0812)` (near-black purple-black, very dark) |
| Northern Lights | Legendary | 600 | `linear-gradient(135deg, #0F766E, #22D3EE)` |
| Crimson Tide | Legendary | 600 | `linear-gradient(135deg, #DC2626, #F43F5E)` |
| Galaxy | Legendary | 800 | `linear-gradient(135deg, #7C3AED, #EC4899)` |
| Midnight | Rare | 300 | `linear-gradient(135deg, #1E293B, #3B82F6)` |
| Sunset Blaze | Rare | 300 | `linear-gradient(135deg, #F97316, #FDE047)` |
| Deep Ocean | Rare | 300 | `linear-gradient(135deg, #0EA5E9, #67E8F9)` |
| Enchanted Forest | Rare | 350 | `linear-gradient(135deg, #16A34A, #4ADE80)` |
| Circuit | Starter (unlockable in Starter box, or 100 gems direct) | — | pattern-style banner, thin blue line-grid on dark background — implement as a background-image SVG pattern if a flat gradient can't represent it, `#3B82F6` lines on `#0A0E14` |
| Grid | Starter | — | similar line-grid pattern, `#3B82F6` on `#0A0E14` |
| Void Fracture | Delta | — | dark background with jagged blue crack lines, `#3B82F6` accent on `#0A0E14` |
| Pulse | Starter | — | concentric ring pattern, `#3B82F6` on `#0A0E14` |

**Effects (profile ring/glow around avatar)** — category `effect`, rendered as a glowing ring around a dark circle:
| Name | Rarity | Price (gems) | Ring glow hex |
|---|---|---|---|
| Void Pulse | Legendary | 900 | `#F97316` (orange-toned per screenshot) |
| Neon Ring | Rare | 350 | `#22D3EE` |
| Aurora | Rare | 350 | `#C084FC` |
| Fire Ring | Rare | 400 | `#F97316` |
| Ice Ring | Rare | 400 | `#38BDF8` |
| Electric | Rare | 400 | `#FDE047` |
| Rainbow | Rare | 450 | multi-color conic-gradient: `conic-gradient(#F43F5E, #F97316, #FDE047, #22C55E, #3B82F6, #A855F7, #F43F5E)` |
| Galaxy Spin | Rare | 450 | `#A855F7` (animated rotation) |
| Ripple | Rare | 400 | `#3B82F6` |
| Vortex | Rare | 450 | `#6366F1` |
| Matrix Rain | Rare | 400 | `#22C55E` |
| Pulse | Common | 150 | `#3B82F6` |
| Flame Ring | Legendary | 3000 | `#F97316` (already exists in DB — keep as-is) |
| Frost Ring | Legendary | 3000 | `#38BDF8` (already exists — keep) |
| Lightning Arc | Legendary | 3000 | `#60A5FA` (already exists — keep) |
| Galaxy Spiral | Legendary | 3000 | `#7C3AED` (already exists — keep; this is the one existing exception where a purple glow is correct cosmetic content) |

**Boosts** (category `boost`, functional items not cosmetic — no hex needed):
| Name | Price (gems) | Max owned | Effect (store in `metadata`) |
|---|---|---|---|
| x2 XP Boost | 80 | 3 | `{"multiplier": 2, "duration_hours": 24}` |
| x3 XP Boost | 150 | 3 | `{"multiplier": 3, "duration_hours": 24}` |
| x5 XP Boost | 300 | 2 | `{"multiplier": 5, "duration_hours": 24}` (Legendary rarity) |
| Streak Shield | 100 | 4 | `{"protects_days": 1}` |
| Streak Revive | 200 | 3 | `{"restores_streak": true}` |

**Titles** (category `title`, box-only — `box_only = true`, `price_gems = null`, cannot be bought directly, only obtained from loot boxes):
- Delta-tier titles: Enforcer, Vandal, Phantom, Savage
- Phase-tier titles: God-Complex, Anti-Hero, Anomaly, Executioner, Cataclysm

### A3. Loot box tables

Create a `loot_boxes` table:
- `id`, `key` (`starter` | `delta` | `phase`), `name`, `price_gems` (100 / 500 / 2000 per existing shop UI), `items_per_open` (2, per the "Drops 2 items per open" copy already shown in the Starter Box modal)

Create a `loot_box_drop_table` table mapping which `shop_items` rows are obtainable from which box, at what weight:
- `id`, `loot_box_id` (fk), `shop_item_id` (fk), `weight` (numeric, used to compute drop probability)

**Reward direction rule (locked, enforce this at the data level, not just by convention):** Starter box's drop table may only reference Starter-tier items plus a "floor" of Delta items at low weight if desired; Delta's drop table may include Delta items plus Starter items as floor; Phase's drop table may include Phase items plus Delta/Starter as floor. Titles from the Phase tier (God-Complex, Anti-Hero, etc.) must never appear in the Starter or Delta box's drop table rows, and Delta titles (Enforcer, Vandal, etc.) must never appear in the Starter box's drop table. Enforce this with a check when you seed the drop table data, and ideally with application-level validation if an admin tool for editing drop tables gets built later.

### A4. User inventory and equipped-items tables

**Do not** try to track this with more columns bolted onto `users` (the current `unlocked_banners`, `unlocked_titles` etc. jsonb array columns are the reason "Banners (6)" showed up as fake data in a prior QA pass — they're easy to get out of sync with reality). Replace with real relational tables:

`user_inventory`:
- `id`, `user_id` (fk to `users`), `shop_item_id` (fk to `shop_items`), `quantity` (integer, relevant for boosts which can own multiple; for cosmetics this will just be `1`), `acquired_at` (timestamp), `acquired_via` (text: `purchase` | `loot_box`)
- Unique constraint on `(user_id, shop_item_id)` for cosmetic categories where owning more than one copy is meaningless — for boosts, allow multiple rows or track via `quantity` instead (pick one pattern and be consistent).

`user_equipped`:
- `id`, `user_id` (fk), `category` (text, matches `shop_items.category` but only for equippable categories: `color_main`, `color_banner`, `anim`, `banner`, `effect`, `title`), `shop_item_id` (fk)
- Unique constraint on `(user_id, category)` — this is what enforces "only one item per category equipped at a time." Equipping a new item in a category is an upsert on this constraint (delete or update the existing row for that category, insert the new one).

Once these tables exist, **migrate away from** the old `unlocked_banners`/`unlocked_titles`/etc. jsonb columns on `users` — don't leave two sources of truth that can drift apart again. If other in-flight work depends on those columns, coordinate, but the end state should be one real source of truth: `user_inventory` for ownership, `user_equipped` for what's currently equipped.

### A5. Rarity naming — read carefully, this has a subtlety

Item-level rarity tags ("Common," "Rare," "Legendary," "Mythic") shown on individual shop items are fine and match the intended design shown in screenshots — use them as specified in the tables above.

**What must never come back:** using "Common/Rare/Ultra-rare" or "Common/Rare/Legendary with 80/15/5 weights" as the naming for the **loot box tiers themselves**. A prior QA pass found a loot box's "View Drop Rates" screen using exactly this banned language ("COMMON 65%, RARE 35%") for the box tier system — that's dead. The loot box tiers stay **Starter / Delta / Phase**, full stop. The item-level rarity tags inside a box's drop table (Common/Rare/Legendary/Mythic on individual items) are a different, allowed system — just don't let it bleed into naming the boxes themselves.

---

## Part B — Backend RPCs and frontend wiring: make every purchase path actually work

This is the part that must not ship half-done. Build these as real Postgres RPC functions (SECURITY DEFINER, following the same pattern as the existing working `complete_habit` RPC — check that function for the established pattern of validating ownership, deducting/adding values atomically, and returning the updated state).

### B1. `purchase_shop_item(p_shop_item_id uuid)` RPC
1. Look up the item's `price_gems` and the calling user's current `gems`.
2. If `price_gems` is null (box-only item like a title) or the user can't afford it, return an error the frontend can show cleanly (e.g. "Need X more gems" — this pattern already exists in the Starter Box modal, reuse that UI treatment).
3. Check `max_owned` against the user's current `user_inventory` quantity for this item — if already at max, reject.
4. Atomically: deduct `price_gems` from `users.gems`, insert (or increment quantity on) the `user_inventory` row for this user+item, set `acquired_via = 'purchase'`.
5. Return the new gem balance and the updated inventory row so the frontend can update immediately without a full refetch.

### B2. `open_loot_box(p_loot_box_id uuid)` RPC
1. Check the user can afford `price_gems`, deduct it.
2. Roll `items_per_open` times against the `loot_box_drop_table` weights for this box (standard weighted-random selection).
3. For each rolled item, insert into `user_inventory` with `acquired_via = 'loot_box'` (increment quantity if it's a boost/stackable type; if it's a cosmetic the user already owns, decide and document a fallback — e.g. convert to a small gem refund — rather than silently doing nothing).
4. Return the list of rolled items so the frontend can play the reveal animation (the "Tap to Open" cube UI already exists and looks good per the screenshots — wire its result to this RPC's actual output, not a mocked/random client-side roll).

### B3. `equip_item(p_shop_item_id uuid)` RPC
1. Verify the calling user actually owns this item (row exists in `user_inventory`) — never allow equipping something not owned, even if the frontend somehow calls this incorrectly.
2. Look up the item's `category`.
3. Upsert into `user_equipped` on the `(user_id, category)` unique constraint — this automatically un-equips whatever was previously equipped in that category.
4. Return the updated equipped state.

### B4. Frontend: shop category tabs must render real inventory-aware data
- Every category tab (Boosts, Colors [Main + Banner sub-tabs], Anims, Banners, Effects, Titles) must query `shop_items` for that category and render the real grid — right now most tabs show only a description card with nothing underneath. Fix this for all six.
- Each item tile must show: swatch/preview (using the exact hex/gradient values from Part A2), name, rarity badge, price, and current state — "Buy" button if affordable and not owned, "Owned" label if owned (already-owned styling exists in the screenshots — reuse it), or a locked/greyed state with "Need X more gems" if unaffordable (also already exists in the Starter Box modal — reuse that pattern app-wide).
- **Confirmed bug to fix:** currently nothing can be purchased from the shop at all, and gems earned from completing habits don't visibly update in the shop's gem counter. After wiring B1-B3, explicitly test: complete a habit elsewhere in the app, navigate to the shop without a full page reload, and confirm the gem counter updates (this means the shop's gem display needs to either subscribe to the same state/context the rest of the app uses for `users.gems`, or refetch on focus/navigation — don't leave it reading a stale snapshot from when the shop page first mounted).
- Loot box opening: wire the existing "Tap to Open" animation to actually call `open_loot_box` and reveal the real rolled items from B2, not a placeholder/mocked animation.

### B5. Verification checklist for this session — do not mark this done until every line here is true
- [ ] Completing a habit increases gems, and the shop reflects the new balance without a manual page refresh.
- [ ] Clicking "Buy" on a color, banner, effect, or anim item deducts the correct gem amount and the item immediately shows "Owned."
- [ ] That purchased item now appears in the user's "Customize Profile" inventory list (Part C) — not just in the shop as "owned," but genuinely listed as something equippable.
- [ ] Clicking "Equip" on an owned item updates `user_equipped` and the Public Profile visibly changes to show it (Part D).
- [ ] Opening a Starter/Delta/Phase box deducts the right gem cost, rolls against the real weighted drop table (not client-side random), and the rolled items land in inventory the same way a direct purchase would.
- [ ] Buying a boost (XP boost, Streak Shield, Streak Revive) increments an owned-count that's visible in the Boosts tab, matching the "1/3 owned" style already shown in the current UI.
- [ ] Attempting to buy something you can't afford shows a clear "need X more gems" state and does not deduct anything or crash.
- [ ] Attempting to buy a `box_only` title directly (if such a UI path is exposed by mistake) is blocked server-side, not just hidden client-side.

---

## Part C — Equip flow: copy Discord's pattern

Explicit direction: model this on Discord's profile customization.

- The existing "Customize Profile" section (in the Settings/Profile area — Titles / Animations / Banners / Profile Effects / Colors, each with an expand arrow) is structurally close to right already. When expanded, each category must list every item the user actually owns (query `user_inventory` joined to `shop_items`, filtered by category — not a hardcoded or fake list), each with its own "Equip" button, and visually mark whichever one is currently equipped (a checkmark, highlighted border, or "Equipped" label instead of the button — don't just show "Equip" on the active one too, that's confusing).
- Clicking "Equip" calls the `equip_item` RPC from B3 and should update the UI immediately (optimistic update is fine, but confirm against the RPC's returned state).
- Only one item per category can be equipped at a time — enforced at the database level by the unique constraint in A4, but the frontend should also disable/hide the "Equip" button on an already-equipped item and show "Equipped" instead.
- This part depends on Parts A and B being fully working first — there's nothing to equip until purchases actually land in real inventory.

---

## Part D — Public Profile rebuild

Current state: clicking "Profile" opens a slide-out drawer, not a dedicated shareable screen, and it shows fake unlock counts. Rebuild against this spec, and make every equipped item from Part C actually render here:

**Header:** Avatar, 96px circle, 4px ring colored by rank tier with matching glow (use `CLAUDE.md`'s Rank Color Ladder — teal/cyan/indigo/violet/Elite-red `#EF4444`/Champion-purple `#A855F7`/Apex-gold `#FBBF24` — confirmed as the correct version over a conflicting all-blue table that exists elsewhere). **If the user has an equipped Effect** (from Part C), render that effect's glow (using the hex/gradient from Part A2) as the ring around the avatar instead of/blended with the rank-tier ring — decide and document which takes visual precedence, since both want to occupy the same ring space. Name (bold white, 24px) + username (muted grey, 14px) underneath, styled in the user's equipped Main Color if one is equipped, else default white/grey.

**Banner:** if the user has an equipped Banner (from Part C), render it as a full-width background behind/above the header using the exact gradient value from Part A2 — this is new, the current drawer has no banner rendering at all.

**Streak Hero Widget** — a separate full-width card, NOT folded into the stat grid: large flame icon + massive streak number + "DAY STREAK" label. Glow tiers: 0 days = dead grey, no glow; 1-6 days = orange (`#F97316`); 7-29 days = amber (`#F59E0B`); 30-99 days = gold (`#FBBF24`) with pulse animation; 100+ days = white-hot core + gold glow, animated loop.

**Secondary stat grid**: exactly three stats — Total XP, Longest Streak, Habits Done. Blue iconography only (`#3B82F6`/`#60A5FA`), no purple/green/yellow icons. (The current drawer has an extra unexplained "Done" stat alongside "Best," and a purple shield icon — remove both; use exactly the three stats listed here.)

**Equipped Title:** if the user has an equipped Title (from Part C), display it next to the username — this is new, nothing currently renders titles anywhere.

**Footer:** "Member since [date]" — small, muted, low visual priority.

**Data integrity — fix as part of this rebuild:** the old drawer was found showing "Banners (6)" unlocked for an account whose `unlocked_banners` jsonb column was actually empty. Once you've migrated to the real `user_inventory`/`user_equipped` tables from Part A4, this class of bug should be structurally impossible — every count shown anywhere (in the shop's "Owned" labels, in the Customize Profile section, on the public profile) must come from a live query against `user_inventory`, never a cached/hardcoded count.

**New feature requests (in scope, not yet built):**
- Custom avatar upload (replacing the default flame icon)
- Image moderation on upload — flag your recommendation (AI vision vs. simpler filter) back to Arjun rather than picking silently, this has cost/complexity tradeoffs worth a quick decision from him.
- A report-user button on the profile.

---

## Suggested internal order

1. Part A (schema + exact catalog data, including the inventory/equipped tables) — nothing else works without this
2. Part B (RPCs + shop frontend wiring + purchase/open-box flow) — verify every item in the B5 checklist before moving on
3. Part C (equip flow, reading from real inventory)
4. Part D (Public Profile rebuild, rendering real equipped items with exact colors/gradients)

---

## Scope note

This session touches the shop-purchase code path, which a separate streak/Shield/Revive session may also touch (Streak Shield and Streak Revive are both `boost`-category shop items per Part A2, and their consumption logic lives partly in Focus Mode code). If both sessions run at the same time, coordinate — the other session's Shield/Revive consumption logic should be built on top of the `purchase_shop_item`/`user_inventory` pattern established here in Part B, not a separate parallel system.
