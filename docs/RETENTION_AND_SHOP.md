# Phase — shop, retention and notifications (Nov 2026 overhaul)

What was built, where it lives, and the numbers it runs on. Everything here is
enforced server-side in Supabase; the UI only displays it.

## The shop — sections (top → bottom, also the sticky jump-list)

| Section | What's in it | Stock |
|---|---|---|
| **Today** | 1 featured item (legendary/mythic when the draw has one) + 1 **daily deal at 30% off** | rotates daily |
| **Mystery boxes** | Starter (100) · Delta (500) · Phase (2,000) | always |
| **Titles** | 4 buyable titles | rotates daily, from 37 |
| **Banners** | 3 profile banners | rotates daily, from 21 |
| **Animations** | 2 avatar animations | rotates daily, from 14 |
| **Profile effects** | 3 ring effects | rotates daily, from 22 |
| **Essentials** | 2× / 3× / 5× XP boost (24h), Streak Shield, Streak Revive | always |

- **Restock:** every day at 00:00 UTC, same shop for everyone. The small timer
  under "Shop" counts down using the server clock.
- **Fresh stock:** items shown yesterday go to the back of the draw, so a
  restock always brings something new. Rarer items appear less often
  (weights common 6 · rare 5 · epic 3.5 · legendary 2.2 · mythic 1).
- **Enforced:** `purchase_shop_item` refuses a rotating item that isn't in
  today's shop (5-minute grace after a restock) and charges the deal price.
- **Earned titles are never sold** (streak / hours ladders, box titles). The
  shop shows how close the next earned one is.
- **Tunable without a deploy:** `game_config` keys `shop_cycle_hours`,
  `shop_slots_title|banner|anim|effect`, `shop_deal_pct`.
- Tables/RPCs: `shop_rotations`, `get_shop_rotation()`, `ensure_shop_rotation()`,
  pg_cron `shop_prebuild_next` (23:50 UTC).

## Why people come back (Duolingo / Strava / Cal AI patterns, implemented)

| Pattern | Phase implementation |
|---|---|
| Streak loss aversion | Streak card turns dark with a **live countdown to midnight** until you check in; lights up cyan once done. 20:45 local push if the streak is about to end. |
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
