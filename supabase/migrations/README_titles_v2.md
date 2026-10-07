# Titles v2 + unified inventory + profile colours retired (Oct 2026)

Applied to project `dnfcrpthpinilibvqwtf`:

| version | name |
|---|---|
| 20261007… | `shop_items_is_active_and_retire_profile_colors` |
| 20261007… | `shop_purchasable_titles_catalog` |

## 1. `is_active`

New column on `shop_items`, the catalogue's on/off switch. Retiring a category
must never mean hard-deleting rows — users paid gems for them and
`user_inventory` has an FK. **Every `shop_items` read must filter
`.eq('is_active', true)`** or retired items reappear.

## 2. Profile colours retired

`color_main` (13) + `color_banner` (5) → `is_active = false`. Every user's
`selected_main_color` / `selected_banner_color` reset to the `#1F2937` sentinel
(the column is NOT NULL, so it cannot be nulled). `user_equipped` rows for both
categories deleted. Ownership rows kept — fully reversible.

The profile is black. The only colour on it now comes from title chips.

## 3. The title catalogue — 56 titles

`source_system` gained a fourth value, `shop`:

| source | count | how you get it | in shop |
|---|---|---|---|
| `shop` | 24 | buy with gems | buyable |
| `streak` | 14 | day breakpoint | locked, shows `N-day streak` |
| `hours` | 9 | hours breakpoint | locked, shows `N hours tracked` |
| `box` | 9 | loot box | locked, shows `PHASE box` etc. |

Price ladder, flat per rarity so cost always tells you the tier:
`common 400 / rare 900 / epic 1800 / legendary 3200 / mythic 6000`.

**Earned and box titles stay `box_only = true`.** `purchase_shop_item` rejects
`box_only` rows, so the streak ladder cannot be bought past — but the Titles tab
still shows all 56 so the catalogue reads as complete rather than full of holes.

Shop-title rarity spread: 6 / 6 / 5 / 4 / 3.
The streak (5/3/3/2/1) and hours (3/2/1/2/1) pyramids are **unchanged** — do not
rebalance them into even splits.

## 4. Visual system (frontend)

`data/titleGlyphs.js` — 56 distinct glyphs, 1:1 with the DB keys, plus a
12-hue pastel accent palette. Glyph house style matches `components/ShopIcons.js`
(48×48, no fill, `currentColor`, 2.4 stroke).

Rarity is a **restraint** ladder, not a brightness dial: common outlined →
legendary/mythic solid pastel surface. No glow anywhere. See CLAUDE.md.

Deleted: `data/titleSigils.js`, `data/hourglassStages.js`, the five-silhouette
plate CSS and the sigil keyframes (~300 lines of `index.css`), and
`TITLE_STYLES`/`RARITY_GLOW`/`resolveTitleSource`/`styleFromRarity` from
`data/profileIdentity.js`.

## 5. Unified inventory

`components/Inventory.js` is now the single implementation, rendered by both
SettingsPage and the MyProfilePage panel. Previously two copies disagreed —
Settings had no Effects section, so a purchased Profile Effect wrote a real
`user_inventory` row that screen never rendered. Add a category to `SECTIONS`
once and it appears on both surfaces.

## Still open

**Hours titles cannot be earned.** No source of truth for hours exists (no
`focus_sessions` table, no start/end timestamps; `habits.session_duration` is
planned length, not time served). The 9 hours titles are seeded, render, and sit
locked. Switch-on: `README_progress_titles.md`.
