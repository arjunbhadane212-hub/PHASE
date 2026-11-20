// Fixture for /dev/shop — a snapshot of the live catalogue (2026-11-19) plus a
// plausible drop + Vault, so the shop can be previewed without signing in.
// Rows: key|name|category|price|rarity_tier|source (s=shop, k=streak days, h=hours, b=box)|n
const RAW = `
anim_binary|Binary|anim|450|rare
anim_cosmic|Cosmic|anim|800|legendary
anim_counterspin|Counterspin|anim|450|rare
anim_dashline|Dashline|anim|800|legendary
anim_divine_light|Divine Light|anim|2000|mythic
anim_drift|Drift|anim|250|common
anim_ethereal_glow|Ethereal Glow|anim|1200|mythic
anim_fine_tick|Fine Tick|anim|250|common
anim_gearwork|Gearwork|anim|450|rare
anim_golden_aura|Golden Aura|anim|800|legendary
anim_heartbeat|Heartbeat|anim|250|common
anim_inferno|Inferno|anim|1500|mythic
anim_lightning_storm|Lightning Storm|anim|800|legendary
anim_orbit_lock|Orbit Lock|anim|700|legendary
anim_overdrive|Overdrive|anim|1800|mythic
anim_pendulum|Pendulum|anim|450|rare
anim_plasma|Plasma|anim|700|legendary
anim_redline|Redline|anim|600|epic
anim_satellite|Satellite|anim|600|epic
anim_shadow_flame|Shadow Flame|anim|700|legendary
anim_signal|Signal|anim|250|common
anim_supernova|Supernova|anim|1200|mythic
anim_tick_storm|Tick Storm|anim|750|legendary
anim_triple_lock|Triple Lock|anim|600|epic
anim_twin_arc|Twin Arc|anim|1400|mythic
banner_bloc|Bloc|banner|500|epic
banner_chevron|Chevron|banner|100|common
banner_circuit|Circuit|banner|100|common
banner_crimson_tide|Afterglow|banner|600|legendary
banner_deep_ocean|Current|banner|300|rare
banner_enchanted_forest|Frequency|banner|350|rare
banner_galaxy|Nebula|banner|800|legendary
banner_grid|Grid|banner|100|common
banner_halftone|Halftone|banner|500|epic
banner_meridian|Meridian|banner|900|legendary
banner_midnight|Topography|banner|300|rare
banner_monolith|Monolith|banner|700|legendary
banner_northern_lights|Aurora|banner|600|legendary
banner_pulse|Pulse|banner|100|common
banner_signal|Broadcast|banner|500|epic
banner_singularity|Singularity|banner|1800|mythic
banner_skyline|Skyline|banner|100|common
banner_solstice|Solstice|banner|800|legendary
banner_strata|Strata|banner|500|epic
banner_summit|Summit|banner|300|rare
banner_sunset_blaze|Ember Rise|banner|300|rare
banner_tidal|Tidal|banner|350|rare
banner_void_fracture|Fracture|banner|300|rare
banner_void_walker|Eclipse|banner|1500|mythic
banner_warpgate|Warpgate|banner|2000|mythic
flame_ring|Flame Ring|effect|3000|legendary
frost_ring|Frost Ring|effect|3000|legendary
fx_aurora|Aurora|effect|350|rare
fx_beacon|Beacon|effect|1200|epic
fx_breathe_ring|Breathe Ring|effect|500|common
fx_continuum|Continuum|effect|4000|mythic
fx_counter_ring|Counter Ring|effect|1200|epic
fx_draw_ring|Draw Ring|effect|1200|epic
fx_dual_orbit|Dual Orbit|effect|1400|legendary
fx_electric|Electric|effect|400|rare
fx_event_horizon|Event Horizon|effect|4000|mythic
fx_fire_ring|Fire Ring|effect|400|rare
fx_galaxy_spin|Galaxy Spin|effect|450|rare
fx_gear_ring|Gear Ring|effect|1200|epic
fx_half_arc|Half Arc|effect|500|common
fx_ice_ring|Ice Ring|effect|400|rare
fx_matrix_rain|Matrix Rain|effect|400|rare
fx_neon_ring|Neon Ring|effect|350|rare
fx_orbital|Orbital|effect|1200|epic
fx_pulse|Pulse|effect|150|common
fx_quad_ticks|Quad Ticks|effect|1200|epic
fx_rainbow|Rainbow|effect|450|rare
fx_ripple|Ripple|effect|400|rare
fx_segment_ring|Segment Ring|effect|1200|epic
fx_triple_ring|Triple Ring|effect|1200|epic
fx_void_pulse|Void Pulse|effect|900|legendary
fx_vortex|Vortex|effect|450|rare
fx_zero_point|Zero Point|effect|4000|mythic
galaxy_spiral|Galaxy Spiral|effect|3000|legendary
lightning_arc|Lightning Arc|effect|3000|legendary
title_architect|Starcrusher|title|1800|epic
title_ascendant|Doombringer|title|3200|legendary
title_blackvault|Blackvault|title|1800|epic
title_coldforged|Coldforged|title|400|common
title_consistent|Soulrender|title|900|rare
title_disciplined|Dreadsovereign|title|1800|epic
title_duskrunner|Duskrunner|title|400|common
title_early_bird|Ashborn|title|400|common
title_focused|Hellraiser|title|900|rare
title_grinder|Nightcrawler|title|400|common
title_immovable|Godslayer|title|3200|legendary
title_ironclad|Voidtouched|title|900|rare
title_ironvow|Ironvow|title|400|common
title_kingslayer|Kingslayer|title|3200|legendary
title_last_light|Last Light|title|3200|legendary
title_machine|Worldbreaker|title|1800|epic
title_momentum|Bloodmoon|title|900|rare
title_monk|Oblivion|title|1800|epic
title_nightwatch|Nightwatch|title|900|rare
title_novice|Emberkin|title|400|common
title_paragon|Eternalflame|title|3200|legendary
title_razorline|Razorline|title|900|rare
title_relentless|Stormbringer|title|900|rare
title_routine|Ironhide|title|400|common
title_skyrender|Skyrender|title|1800|epic
title_starter|Cinderling|title|400|common
title_steady|Stonewraith|title|400|common
title_stillwater|Stillwater|title|400|common
title_suncaller|Suncaller|title|1800|epic
title_thornking|Thornking|title|1800|epic
title_tidebreaker|Tidebreaker|title|900|rare
title_titanheart|Titanheart|title|3200|legendary
title_unbroken|Grimwarden|title|900|rare
title_untouchable|Deathless|title|1800|epic
title_voidmonarch|Void Monarch|title|3200|legendary
title_wolfblood|Wolfblood|title|900|rare
title_zenith|Apocalypse|title|3200|legendary
streak_rookie|Rookie|title|0|common|k|10
streak_contender|Contender|title|0|common|k|25
streak_locked|Locked|title|0|common|k|100
streak_aflame|Aflame|title|0|rare|k|150
streak_interlocked|Interlocked|title|0|epic|k|300
streak_ethereal|Ethereal|title|0|legendary|k|450
streak_sovereign_overlord|The Sovereign Overlord|title|0|mythic|k|1000
hours_timekeeper|Timekeeper|title|0|common|h|25
hours_timeless|Timeless|title|0|rare|h|200
hours_eternitys_edge|Eternity's Edge|title|0|mythic|h|1000
title_savage|Savage|title|0|rare|b
title_god_complex|God-Complex|title|0|mythic|b
boost_xp_2x|x2 XP Boost|boost|80|common
boost_xp_3x|x3 XP Boost|boost|150|rare
boost_xp_5x|x5 XP Boost|boost|300|legendary
streak_shield|Streak Shield|boost|100|common
streak_revive|Streak Revive|boost|200|rare
`;

const SRC = { k: 'streak', h: 'hours', b: 'box' };
export const FIXTURE_CATALOG = RAW.trim().split('\n').map((line) => {
  const [key, name, category, price, tier, src, n] = line.split('|');
  const source = SRC[src] || (category === 'title' ? 'shop' : null);
  const earned = !!SRC[src];
  const metadata = {};
  if (src === 'k') metadata.days = Number(n);
  if (src === 'h') metadata.hours = Number(n);
  if (key.startsWith('boost_xp_')) metadata.multiplier = Number(key.match(/(\d)x$/)[1]);
  return {
    id: key, key, name, category, price_gems: earned ? null : Number(price), rarity_tier: tier, rarity: tier === 'epic' ? 'rare' : tier,
    source_system: source, box_only: earned, max_owned: category === 'boost' ? 3 : 1, metadata, is_active: true,
  };
});

export function fixtureRotation(now = Date.now()) {
  const day = 86400000;
  const start = Math.floor(now / day) * day;
  const weekStart = Math.floor((now - 4 * day) / (7 * day)) * 7 * day + 4 * day;
  const d = (id, category, position, extra = {}) => ({ shop_item_id: id, category, position, featured: false, deal_price: null, last_seen_cycle: 20770, times_seen: 2, ...extra });
  return {
    cycle: 20776, drop_number: 9,
    starts_at: new Date(start).toISOString(), ends_at: new Date(start + day).toISOString(), server_now: new Date(now).toISOString(),
    odds: { common: 40, rare: 32, epic: 18, legendary: 10, slots: { title: 4, banner: 3, anim: 3, effect: 3 } },
    items: [
      d('title_voidmonarch', 'title', 1, { featured: true, times_seen: 0, last_seen_cycle: null }),
      d('title_thornking', 'title', 2),
      d('title_ironvow', 'title', 3, { last_seen_cycle: 20752 }),
      d('title_ascendant', 'title', 4, { deal_price: 2240 }),
      d('banner_grid', 'banner', 1),
      d('banner_halftone', 'banner', 2, { times_seen: 0, last_seen_cycle: null }),
      d('banner_skyline', 'banner', 3),
      d('anim_triple_lock', 'anim', 1, { times_seen: 0, last_seen_cycle: null }),
      d('anim_counterspin', 'anim', 2),
      d('anim_gearwork', 'anim', 3),
      d('fx_pulse', 'effect', 1),
      d('fx_breathe_ring', 'effect', 2),
      d('fx_half_arc', 'effect', 3),
    ],
    vault: {
      week: 2967, starts_at: new Date(weekStart).toISOString(), ends_at: new Date(weekStart + 7 * day).toISOString(),
      items: [
        { shop_item_id: 'anim_divine_light', slot: 'mythic', position: 1, last_vault_week: null, times_vaulted: 0 },
        { shop_item_id: 'banner_monolith', slot: 'legendary', position: 2, last_vault_week: null, times_vaulted: 0 },
      ],
    },
  };
}
