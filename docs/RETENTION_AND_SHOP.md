# Phase — shop, retention and notifications (Nov 2026 overhaul)

What was built, where it lives, and the numbers it runs on. Everything here is
enforced server-side in Supabase; the UI only displays it.

## The shop — v3 "Drops" (2026-11-19, supersedes the Nov 11 rotation)

Full item sheet + per-item frequencies: **docs/SHOP_CATALOG.md**.

| Section | What's in it | Stock |
|---|---|---|
| **Today** | the drop's rarest piece (featured) + a **30%-off deal** on a rare-or-better | daily drop |
| **The Sanctum** | 1 **mythic** + 1 legendary from another section — the ONLY place mythics are sold | weekly, Monday 00:00 UTC |
| **Mystery boxes** | Starter (100) · Delta (500) · Phase (2,000) | always |
| **Titles** | 4 of 37 | daily drop |
| **Banners** | 3 of 25 | daily drop |
| **Animations** | 3 of 25 | daily drop |
| **Profile effects** | 3 of 30 | daily drop |
| **Essentials** | 2× / 3× / 5× XP boost (24h), Streak Shield, Streak Revive | always |

- **Restock:** a new numbered drop ("Drop #009") every day at 00:00 UTC, same
  shop for everyone; the clock uses the server time.
- **Rarity = how hard it is to SEE:** each slot rolls a rarity first — common
  40 · rare 32 · epic 18 · legendary 10 — then picks an item of that rarity.
  Mythics never drop daily. Every drop holds at least one epic-or-better.
- **Fresh stock:** an item shown in the last 3 drops sits out; if a whole
  rarity is cooling down, the item gone longest comes back.
- **History:** each drop item carries `times_seen` / `last_seen_cycle`, so the
  UI says "First drop" or "Back after 23d".
- **Enforced:** `purchase_shop_item` refuses anything not in today's drop or
  this week's Sanctum (5-minute grace at each edge) and charges the deal price.
- **Wishlist:** `shop_wishlist` (RLS own-rows). The shop flags a wishlisted
  item the moment it's in stock.
- **Earned titles are never sold** (streak / hours ladders, box titles).
- **Tunable without a deploy:** `game_config` keys `shop_cycle_hours`,
  `shop_slots_title|banner|anim|effect`, `shop_odds_common|rare|epic|legendary`,
  `shop_cooldown_cycles`, `shop_vault_cooldown_weeks`, `shop_deal_pct`.
- Tables/RPCs: `shop_rotations`, `shop_vault`, `shop_wishlist`,
  `get_shop_rotation()`, `ensure_shop_rotation()`, `ensure_shop_vault()`,
  pg_cron `shop_prebuild_next` (23:50 UTC). Internally the Sanctum is "vault".

### The shop UI (components/shop/)

- **Drop intro** (`DropIntro`): first visit to each drop — "#009" slams, the
  rarity tally ticks in worst → best, Mondays the Sanctum bar wipes across,
  shutters lift. ~2.5s, tap to skip. Once per drop per user (localStorage).
- **Sealed cards** (`ShopPieces/ShopCard`): on a new drop every drop card is
  face-down — a "?" plate whose rarity strip HEIGHT hints the pull. Cards flip
  as they scroll into view, worst → best within each shelf; epic+ gets a hit
  (solid flash + punch). "Reveal N" in the sticky bar opens the rest.
- **Collection index** (`CatalogIndex`): every item, owned/total per section,
  in-stock/Sanctum tags, "~every N days" from the live odds, wishlist toggle.
- **Buy stamp** (`ItemSheet`): a solid rarity panel + "YOURS" + flat confetti,
  then "Equip now". Flat film language only — no glow (house rule).
- Preview on fixtures, no sign-in: **/dev/shop** (non-production builds).

## Why people come back (Duolingo / Strava / Cal AI patterns, implemented)

| Pattern | Phase implementation |
|---|---|
| Streak loss aversion | Streak card turns dark with a **live countdown to midnight** until you check in; turns lime once done (UI v3). 20:45 local push if the streak is about to end. |
| The streak moment | Full-screen **"N-day streak"** screen on the first check-in of each day (number ticks up, week row fills). |
| Milestones | 3/7/14/30/50/100/200/365 days pay **25 → 1,000 gems**, once ever (`user_rewards`). Next milestone + reward shown on the streak card. |
| Levels that matter | Level N pays **25·N + 25 gems** the first time you reach it (75 → 400). Shown on Home ("LV.5 +150") and on every rank in the Level page. |
| Daily quests | 3 per day from real data: "Complete 1 habit" + one rotating (hard habit / 3 habits / before noon / 60 XP / 30 focus min) + "Finish every habit". Claim for gems (up to 30/day). |
| Streak freeze | Streak Shield (max 4) auto-covers missed days; Streak Revive restores a broken streak. |
| Leagues | Weekly league (already built) + push in the last 10h: promotion zone / drop zone / chasing. |
| Scarcity / FOMO | Daily shop rotation, featured item, 30%-off deal, restock timer. |
| Soft permission ask | Reminder opt-in appears **after** your first streak moment, not on install. "Not now" re-asks after 3 days at most. |

## Phone notifications

- **Tech:** Web Push (VAPID). Android Chrome, desktop browsers, and **iPhone
  iOS 16.4+ once Phase is added to the Home Screen** (Apple only allows web push
  for installed web apps). No paid provider: Supabase Edge Function
  `push-dispatch` + pg_cron every 15 minutes.
- **When:** daily reminder ~30 min before your usual check-in time (median of
  last 3 weeks, default 18:00 local) · streak-at-risk at 20:45 local · league
  closing (last 10h, Game Mode) · comeback at 2/3/5/7/14 days away, then one
  honest "we'll stop sending these" at 21 days and silence.
- **Caps:** max 2 a day, only 08:00–22:00 local, respects Settings toggles.
- **Never the same line twice:** ~80 messages in `push_copy` (Game = loud and
  competitive, Focus = quiet and personal); the last 12 a user saw are skipped.
  Placeholders: `{streak} {next} {prev} {habit} {left} {pos} {tier} {hours} {days}`.
  Edit copy with SQL — no deploy needed.
- **Settings → Phone notifications:** per-device on/off and **Send test**.
- **Secrets:** VAPID private key + dispatch secret live in Supabase Vault
  (`push_vapid_*`, `push_dispatch_secret`). Public key is in `src/lib/push.js`.

## Icon system

One drawing system for every icon: `src/components/icons/paths.js` (geometry)
+ `src/components/icons/index.js` (the only module the app imports icons from).
24px grid, 2px stroke, round caps, straight-cut "facet" shapes with at most one
inner cut line; XP / Loot box / Settings share one hexagon frame. League tier
emblems (`data/tierEmblemArt.js`) use the same language. Preview: `/dev/icons`
(dev builds only).
