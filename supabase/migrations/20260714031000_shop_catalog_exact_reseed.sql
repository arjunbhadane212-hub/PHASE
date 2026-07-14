-- Shop catalog rebuild (Part A2): exact catalog seed.
-- Item-level rarity tags (common/rare/legendary/mythic) are the allowed system.
-- Hex/gradient values are exact per the designed screenshots — do not approximate.

-- Remove any earlier approximate rows; keep the 4 original premium Effects and
-- the concurrent session's streak rows.
delete from public.shop_items
where key not in ('flame_ring','frost_ring','lightning_arc','galaxy_spiral',
                  'streak_shield','streak_revive');

-- Normalize the 4 original premium Effects to the new taxonomy/columns.
update public.shop_items set category='effect', rarity='legendary', max_owned=1, box_only=false,
  hex_value = case key
    when 'flame_ring' then '#F97316'
    when 'frost_ring' then '#38BDF8'
    when 'lightning_arc' then '#60A5FA'
    when 'galaxy_spiral' then '#7C3AED' end
where key in ('flame_ring','frost_ring','lightning_arc','galaxy_spiral');

-- Normalize the concurrent session's streak boosts into the new taxonomy.
update public.shop_items set category='boost', rarity='common', max_owned=4, box_only=false,
  metadata='{"protects_days":1}'::jsonb
where key='streak_shield';
update public.shop_items set category='boost', rarity='rare', max_owned=3, box_only=false,
  metadata='{"restores_streak":true}'::jsonb
where key='streak_revive';

insert into public.shop_items
  (key, category, name, rarity, price_gems, hex_value, gradient_value, max_owned, box_only, metadata) values
-- BOOSTS (functional; no hex)
('boost_xp_2x','boost','x2 XP Boost','common',80,null,null,3,false,'{"multiplier":2,"duration_hours":24}'),
('boost_xp_3x','boost','x3 XP Boost','rare',150,null,null,3,false,'{"multiplier":3,"duration_hours":24}'),
('boost_xp_5x','boost','x5 XP Boost','legendary',300,null,null,2,false,'{"multiplier":5,"duration_hours":24}'),
-- COLOR MAIN (solid swatches, exact hex)
('color_main_cyan','color_main','Cyan','rare',300,'#22D3EE',null,1,false,null),
('color_main_green','color_main','Green','rare',300,'#22C55E',null,1,false,null),
('color_main_lime','color_main','Lime','rare',300,'#84CC16',null,1,false,null),
('color_main_deep_orange','color_main','Deep Orange','rare',300,'#EA580C',null,1,false,null),
('color_main_sky_blue','color_main','Sky Blue','common',300,'#3B82F6',null,1,false,null),
('color_main_indigo','color_main','Indigo','rare',300,'#6366F1',null,1,false,null),
('color_main_vibe_amber','color_main','Vibe Amber','rare',300,'#D97706',null,1,false,null),
('color_main_vibrant_blue','color_main','Vibrant Blue','common',0,'#2563EB',null,1,false,'{"default_owned":true}'),
('color_main_teal','color_main','Teal','common',150,'#14B8A6',null,1,false,null),
('color_main_vibrant_rose','color_main','Vibrant Rose','legendary',600,'#F43F5E',null,1,false,null),
('color_main_deep_crimson','color_main','Deep Crimson','legendary',600,'#DC2626',null,1,false,null),
('color_main_orange','color_main','Orange','common',300,'#F97316',null,1,false,null),
('color_main_amber','color_main','Amber','rare',300,'#F59E0B',null,1,false,null),
-- COLOR BANNER (purple/violet cosmetics — intentional, do not desaturate)
('color_banner_vibe_purple','color_banner','Vibe Purple','legendary',600,'#A855F7',null,1,false,null),
('color_banner_deep_violet','color_banner','Deep Violet','legendary',600,'#7C3AED',null,1,false,null),
('color_banner_rich_purple','color_banner','Rich Purple','legendary',600,'#9333EA',null,1,false,null),
('color_banner_magenta','color_banner','Magenta','legendary',600,'#D946EF',null,1,false,null),
('color_banner_vibrant_rose','color_banner','Vibrant Rose','legendary',600,'#F43F5E',null,1,false,null),
-- ANIMS (glow hex)
('anim_supernova','anim','Supernova','mythic',1200,'#F472B6',null,1,false,null),
('anim_ethereal_glow','anim','Ethereal Glow','mythic',1200,'#60A5FA',null,1,false,null),
('anim_inferno','anim','Inferno','mythic',1500,'#F59E0B',null,1,false,null),
('anim_divine_light','anim','Divine Light','mythic',2000,'#FDE047',null,1,false,null),
('anim_plasma','anim','Plasma','legendary',700,'#EC4899',null,1,false,null),
('anim_shadow_flame','anim','Shadow Flame','legendary',700,'#F43F5E',null,1,false,null),
('anim_lightning_storm','anim','Lightning Storm','legendary',800,'#60A5FA',null,1,false,null),
('anim_cosmic','anim','Cosmic','legendary',800,'#A78BFA',null,1,false,null),
('anim_golden_aura','anim','Golden Aura','legendary',800,'#FBBF24',null,1,false,null),
-- BANNERS (gradients + pattern banners)
('banner_void_walker','banner','Void Walker','mythic',1500,null,'linear-gradient(135deg, #1E1B2E, #0A0812)',1,false,null),
('banner_northern_lights','banner','Northern Lights','legendary',600,null,'linear-gradient(135deg, #0F766E, #22D3EE)',1,false,null),
('banner_crimson_tide','banner','Crimson Tide','legendary',600,null,'linear-gradient(135deg, #DC2626, #F43F5E)',1,false,null),
('banner_galaxy','banner','Galaxy','legendary',800,null,'linear-gradient(135deg, #7C3AED, #EC4899)',1,false,null),
('banner_midnight','banner','Midnight','rare',300,null,'linear-gradient(135deg, #1E293B, #3B82F6)',1,false,null),
('banner_sunset_blaze','banner','Sunset Blaze','rare',300,null,'linear-gradient(135deg, #F97316, #FDE047)',1,false,null),
('banner_deep_ocean','banner','Deep Ocean','rare',300,null,'linear-gradient(135deg, #0EA5E9, #67E8F9)',1,false,null),
('banner_enchanted_forest','banner','Enchanted Forest','rare',350,null,'linear-gradient(135deg, #16A34A, #4ADE80)',1,false,null),
('banner_circuit','banner','Circuit','common',100,null,'repeating-linear-gradient(0deg,#3B82F6 0 1px,transparent 1px 22px),repeating-linear-gradient(90deg,#3B82F6 0 1px,transparent 1px 22px),#0A0E14',1,false,'{"pattern":true,"tier":"starter"}'),
('banner_grid','banner','Grid','common',100,null,'repeating-linear-gradient(0deg,#3B82F6 0 1px,transparent 1px 18px),repeating-linear-gradient(90deg,#3B82F6 0 1px,transparent 1px 18px),#0A0E14',1,false,'{"pattern":true,"tier":"starter"}'),
('banner_pulse','banner','Pulse','common',100,null,'radial-gradient(circle,transparent 0 10px,#3B82F6 10px 11px,transparent 11px 24px),#0A0E14',1,false,'{"pattern":true,"tier":"starter"}'),
('banner_void_fracture','banner','Void Fracture','rare',300,null,'linear-gradient(115deg,transparent 46%,#3B82F6 47% 48%,transparent 49%),linear-gradient(200deg,transparent 60%,#3B82F6 61% 62%,transparent 63%),#0A0E14',1,false,'{"pattern":true,"tier":"delta"}'),
-- EFFECTS (ring glow hex; Rainbow uses conic gradient)
('fx_void_pulse','effect','Void Pulse','legendary',900,'#F97316',null,1,false,null),
('fx_neon_ring','effect','Neon Ring','rare',350,'#22D3EE',null,1,false,null),
('fx_aurora','effect','Aurora','rare',350,'#C084FC',null,1,false,null),
('fx_fire_ring','effect','Fire Ring','rare',400,'#F97316',null,1,false,null),
('fx_ice_ring','effect','Ice Ring','rare',400,'#38BDF8',null,1,false,null),
('fx_electric','effect','Electric','rare',400,'#FDE047',null,1,false,null),
('fx_rainbow','effect','Rainbow','rare',450,null,'conic-gradient(#F43F5E,#F97316,#FDE047,#22C55E,#3B82F6,#A855F7,#F43F5E)',1,false,null),
('fx_galaxy_spin','effect','Galaxy Spin','rare',450,'#A855F7',null,1,false,'{"animated":"rotate"}'),
('fx_ripple','effect','Ripple','rare',400,'#3B82F6',null,1,false,null),
('fx_vortex','effect','Vortex','rare',450,'#6366F1',null,1,false,null),
('fx_matrix_rain','effect','Matrix Rain','rare',400,'#22C55E',null,1,false,null),
('fx_pulse','effect','Pulse','common',150,'#3B82F6',null,1,false,null),
-- TITLES (box-only; no direct price)
('title_enforcer','title','Enforcer','legendary',null,null,null,1,true,'{"tier":"delta"}'),
('title_vandal','title','Vandal','legendary',null,null,null,1,true,'{"tier":"delta"}'),
('title_phantom','title','Phantom','legendary',null,null,null,1,true,'{"tier":"delta"}'),
('title_savage','title','Savage','legendary',null,null,null,1,true,'{"tier":"delta"}'),
('title_god_complex','title','God-Complex','mythic',null,null,null,1,true,'{"tier":"phase"}'),
('title_anti_hero','title','Anti-Hero','mythic',null,null,null,1,true,'{"tier":"phase"}'),
('title_anomaly','title','Anomaly','mythic',null,null,null,1,true,'{"tier":"phase"}'),
('title_executioner','title','Executioner','mythic',null,null,null,1,true,'{"tier":"phase"}'),
('title_cataclysm','title','Cataclysm','mythic',null,null,null,1,true,'{"tier":"phase"}');
