# Phase Shop — the full catalogue sheet (Shop v3 "Drops", 2026-11-19)

Every item the shop can sell. The shop only ever **shows a few** of these: a
13-item daily drop plus the weekly Sanctum. Rarer items are harder to *find*
in the shop, not just pricier. In-app, the same sheet is the **Collection
index** (Shop → "See every item"), with owned / in-stock / wishlist state.

Source of truth is `public.shop_items` (`is_active = true`). Frequencies are
derived from the live odds in `game_config` and are averages. The cooldown
(an item sits out 3 drops after appearing) spreads repeats further apart.

## How a drop is built

| Rule | Value | Tunable (`game_config`) |
|---|---|---|
| Restock | every day 00:00 UTC, same shop for everyone | `shop_cycle_hours` |
| Slots per drop | Titles 4 · Banners 3 · Animations 3 · Effects 3 | `shop_slots_*` |
| Each slot rolls a rarity | Common 40% · Rare 32% · Epic 18% · Legendary 10% | `shop_odds_*` |
| Mythic | **never** in the daily drop; Sanctum only | — |
| Guarantee | at least one epic-or-better per drop | — |
| Cooldown | an item shown in the last 3 drops sits out (if a whole rarity is cooling down, the longest-gone returns) | `shop_cooldown_cycles` |
| Featured | the drop's rarest piece | — |
| Daily deal | 30% off one rare-or-better | `shop_deal_pct` |
| The Sanctum | Monday 00:00 UTC: 1 mythic + 1 legendary (other section), for the week | `shop_vault_cooldown_weeks` |

Server: `ensure_shop_rotation`, `ensure_shop_vault`, `get_shop_rotation`,
`purchase_shop_item` (refuses anything not in today's drop or this week's
Sanctum). Tables: `shop_rotations`, `shop_vault`, `shop_wishlist`.

### How often each rarity shows up (per item)

| Section | Common | Rare | Epic | Legendary | Mythic |
|---|---|---|---|---|---|
| Titles (37) | ~6 days | ~8 days | ~13 days | ~20 days | — (earned only) |
| Banners (25) | ~4 days | ~7 days | ~7 days | ~20 days | Sanctum, ~12 wk |
| Animations (25) | ~3 days | ~4 days | ~6 days | ~27 days | Sanctum, ~12 wk |
| Effects (30) | ~3 days | ~10 days | ~15 days | ~20 days | Sanctum, ~12 wk |

## Titles (37 sold; 32 more are earned or box-only and never sold)

| Rarity | Name | Key | Gems | Shows up |
|---|---|---|---|---|
| Common | Ashborn | `title_early_bird` | 400 | ~every 6 days |
| Common | Cinderling | `title_starter` | 400 | ~every 6 days |
| Common | Coldforged | `title_coldforged` | 400 | ~every 6 days |
| Common | Duskrunner | `title_duskrunner` | 400 | ~every 6 days |
| Common | Emberkin | `title_novice` | 400 | ~every 6 days |
| Common | Ironhide | `title_routine` | 400 | ~every 6 days |
| Common | Ironvow | `title_ironvow` | 400 | ~every 6 days |
| Common | Nightcrawler | `title_grinder` | 400 | ~every 6 days |
| Common | Stillwater | `title_stillwater` | 400 | ~every 6 days |
| Common | Stonewraith | `title_steady` | 400 | ~every 6 days |
| Rare | Bloodmoon | `title_momentum` | 900 | ~every 8 days |
| Rare | Grimwarden | `title_unbroken` | 900 | ~every 8 days |
| Rare | Hellraiser | `title_focused` | 900 | ~every 8 days |
| Rare | Nightwatch | `title_nightwatch` | 900 | ~every 8 days |
| Rare | Razorline | `title_razorline` | 900 | ~every 8 days |
| Rare | Soulrender | `title_consistent` | 900 | ~every 8 days |
| Rare | Stormbringer | `title_relentless` | 900 | ~every 8 days |
| Rare | Tidebreaker | `title_tidebreaker` | 900 | ~every 8 days |
| Rare | Voidtouched | `title_ironclad` | 900 | ~every 8 days |
| Rare | Wolfblood | `title_wolfblood` | 900 | ~every 8 days |
| Epic | Blackvault | `title_blackvault` | 1800 | ~every 13 days |
| Epic | Deathless | `title_untouchable` | 1800 | ~every 13 days |
| Epic | Dreadsovereign | `title_disciplined` | 1800 | ~every 13 days |
| Epic | Oblivion | `title_monk` | 1800 | ~every 13 days |
| Epic | Skyrender | `title_skyrender` | 1800 | ~every 13 days |
| Epic | Starcrusher | `title_architect` | 1800 | ~every 13 days |
| Epic | Suncaller | `title_suncaller` | 1800 | ~every 13 days |
| Epic | Thornking | `title_thornking` | 1800 | ~every 13 days |
| Epic | Worldbreaker | `title_machine` | 1800 | ~every 13 days |
| Legendary | Apocalypse | `title_zenith` | 3200 | ~every 20 days |
| Legendary | Doombringer | `title_ascendant` | 3200 | ~every 20 days |
| Legendary | Eternalflame | `title_paragon` | 3200 | ~every 20 days |
| Legendary | Godslayer | `title_immovable` | 3200 | ~every 20 days |
| Legendary | Kingslayer | `title_kingslayer` | 3200 | ~every 20 days |
| Legendary | Last Light | `title_last_light` | 3200 | ~every 20 days |
| Legendary | Titanheart | `title_titanheart` | 3200 | ~every 20 days |
| Legendary | Void Monarch | `title_voidmonarch` | 3200 | ~every 20 days |

## Banners (25) — 4 new epics: Bloc, Broadcast, Halftone, Strata

| Rarity | Name | Key | Gems | Shows up |
|---|---|---|---|---|
| Common | Chevron | `banner_chevron` | 100 | ~every 4 days |
| Common | Circuit | `banner_circuit` | 100 | ~every 4 days |
| Common | Grid | `banner_grid` | 100 | ~every 4 days |
| Common | Pulse | `banner_pulse` | 100 | ~every 4 days |
| Common | Skyline | `banner_skyline` | 100 | ~every 4 days |
| Rare | Current | `banner_deep_ocean` | 300 | ~every 7 days |
| Rare | Ember Rise | `banner_sunset_blaze` | 300 | ~every 7 days |
| Rare | Fracture | `banner_void_fracture` | 300 | ~every 7 days |
| Rare | Summit | `banner_summit` | 300 | ~every 7 days |
| Rare | Topography | `banner_midnight` | 300 | ~every 7 days |
| Rare | Frequency | `banner_enchanted_forest` | 350 | ~every 7 days |
| Rare | Tidal | `banner_tidal` | 350 | ~every 7 days |
| Epic | Bloc | `banner_bloc` | 500 | ~every 7 days |
| Epic | Broadcast | `banner_signal` | 500 | ~every 7 days |
| Epic | Halftone | `banner_halftone` | 500 | ~every 7 days |
| Epic | Strata | `banner_strata` | 500 | ~every 7 days |
| Legendary | Afterglow | `banner_crimson_tide` | 600 | ~every 20 days |
| Legendary | Aurora | `banner_northern_lights` | 600 | ~every 20 days |
| Legendary | Monolith | `banner_monolith` | 700 | ~every 20 days |
| Legendary | Nebula | `banner_galaxy` | 800 | ~every 20 days |
| Legendary | Solstice | `banner_solstice` | 800 | ~every 20 days |
| Legendary | Meridian | `banner_meridian` | 900 | ~every 20 days |
| Mythic | Eclipse | `banner_void_walker` | 1500 | Sanctum only (~every 12 wk) |
| Mythic | Singularity | `banner_singularity` | 1800 | Sanctum only (~every 12 wk) |
| Mythic | Warpgate | `banner_warpgate` | 2000 | Sanctum only (~every 12 wk) |

## Animations (25) — 11 new: 4 common, 4 rare, 3 epic

| Rarity | Name | Key | Gems | Shows up |
|---|---|---|---|---|
| Common | Drift | `anim_drift` | 250 | ~every 3 days |
| Common | Fine Tick | `anim_fine_tick` | 250 | ~every 3 days |
| Common | Heartbeat | `anim_heartbeat` | 250 | ~every 3 days |
| Common | Signal | `anim_signal` | 250 | ~every 3 days |
| Rare | Binary | `anim_binary` | 450 | ~every 4 days |
| Rare | Counterspin | `anim_counterspin` | 450 | ~every 4 days |
| Rare | Gearwork | `anim_gearwork` | 450 | ~every 4 days |
| Rare | Pendulum | `anim_pendulum` | 450 | ~every 4 days |
| Epic | Redline | `anim_redline` | 600 | ~every 6 days |
| Epic | Satellite | `anim_satellite` | 600 | ~every 6 days |
| Epic | Triple Lock | `anim_triple_lock` | 600 | ~every 6 days |
| Legendary | Orbit Lock | `anim_orbit_lock` | 700 | ~every 27 days |
| Legendary | Plasma | `anim_plasma` | 700 | ~every 27 days |
| Legendary | Shadow Flame | `anim_shadow_flame` | 700 | ~every 27 days |
| Legendary | Tick Storm | `anim_tick_storm` | 750 | ~every 27 days |
| Legendary | Cosmic | `anim_cosmic` | 800 | ~every 27 days |
| Legendary | Dashline | `anim_dashline` | 800 | ~every 27 days |
| Legendary | Golden Aura | `anim_golden_aura` | 800 | ~every 27 days |
| Legendary | Lightning Storm | `anim_lightning_storm` | 800 | ~every 27 days |
| Mythic | Ethereal Glow | `anim_ethereal_glow` | 1200 | Sanctum only (~every 12 wk) |
| Mythic | Supernova | `anim_supernova` | 1200 | Sanctum only (~every 12 wk) |
| Mythic | Twin Arc | `anim_twin_arc` | 1400 | Sanctum only (~every 12 wk) |
| Mythic | Inferno | `anim_inferno` | 1500 | Sanctum only (~every 12 wk) |
| Mythic | Overdrive | `anim_overdrive` | 1800 | Sanctum only (~every 12 wk) |
| Mythic | Divine Light | `anim_divine_light` | 2000 | Sanctum only (~every 12 wk) |

## Profile effects (30) — 8 new: 5 epic, 3 mythic; 3 rares promoted to epic

| Rarity | Name | Key | Gems | Shows up |
|---|---|---|---|---|
| Common | Pulse | `fx_pulse` | 150 | ~every 3 days |
| Common | Breathe Ring | `fx_breathe_ring` | 500 | ~every 3 days |
| Common | Half Arc | `fx_half_arc` | 500 | ~every 3 days |
| Rare | Aurora | `fx_aurora` | 350 | ~every 10 days |
| Rare | Neon Ring | `fx_neon_ring` | 350 | ~every 10 days |
| Rare | Electric | `fx_electric` | 400 | ~every 10 days |
| Rare | Fire Ring | `fx_fire_ring` | 400 | ~every 10 days |
| Rare | Ice Ring | `fx_ice_ring` | 400 | ~every 10 days |
| Rare | Matrix Rain | `fx_matrix_rain` | 400 | ~every 10 days |
| Rare | Ripple | `fx_ripple` | 400 | ~every 10 days |
| Rare | Galaxy Spin | `fx_galaxy_spin` | 450 | ~every 10 days |
| Rare | Rainbow | `fx_rainbow` | 450 | ~every 10 days |
| Rare | Vortex | `fx_vortex` | 450 | ~every 10 days |
| Epic | Beacon | `fx_beacon` | 1200 | ~every 15 days |
| Epic | Counter Ring | `fx_counter_ring` | 1200 | ~every 15 days |
| Epic | Draw Ring | `fx_draw_ring` | 1200 | ~every 15 days |
| Epic | Gear Ring | `fx_gear_ring` | 1200 | ~every 15 days |
| Epic | Orbital | `fx_orbital` | 1200 | ~every 15 days |
| Epic | Quad Ticks | `fx_quad_ticks` | 1200 | ~every 15 days |
| Epic | Segment Ring | `fx_segment_ring` | 1200 | ~every 15 days |
| Epic | Triple Ring | `fx_triple_ring` | 1200 | ~every 15 days |
| Legendary | Void Pulse | `fx_void_pulse` | 900 | ~every 20 days |
| Legendary | Dual Orbit | `fx_dual_orbit` | 1400 | ~every 20 days |
| Legendary | Flame Ring | `flame_ring` | 3000 | ~every 20 days |
| Legendary | Frost Ring | `frost_ring` | 3000 | ~every 20 days |
| Legendary | Galaxy Spiral | `galaxy_spiral` | 3000 | ~every 20 days |
| Legendary | Lightning Arc | `lightning_arc` | 3000 | ~every 20 days |
| Mythic | Continuum | `fx_continuum` | 4000 | Sanctum only (~every 12 wk) |
| Mythic | Event Horizon | `fx_event_horizon` | 4000 | Sanctum only (~every 12 wk) |
| Mythic | Zero Point | `fx_zero_point` | 4000 | Sanctum only (~every 12 wk) |

## Always in stock (not rotated)

Mystery boxes (Starter / Delta / Phase) and Essentials (2× / 3× / 5× XP boost,
Streak Shield, Streak Revive).

## Adding an item

1. Insert a `shop_items` row (`is_active`, `box_only=false`, `price_gems`, `rarity_tier`; for
   epics set `rarity='rare'` because the old `rarity` column doesn't allow `epic`).
2. Give it art: titles → `data/titleGlyphs.js`, banners → `components/banners/PhaseBanners.js`
   (+ `BANNER_META`), animations/effects → `data/motionVariants.js` (a unique variant + colour pair).
3. It enters the draw on the next restock. No other code changes are needed.
