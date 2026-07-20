// Profile animation CSS classes (Step 2c of the Supabase migration).
//
// Ported from the old backend SHOP_ANIMATIONS `css` field (backend/server.py),
// matched to the 9 seeded `anim` shop_items keys. Every class listed here already
// exists in src/index.css (the .profile-anim-* rules). Unknown keys fall back to
// '' -> the neutral preview in ProfileItemsGrid. No invented classes, and no
// shop_items DB metadata changes.

const ANIM_CLASSES = {
  anim_plasma: 'profile-anim-plasma',
  anim_shadow_flame: 'profile-anim-shadowflame',
  anim_cosmic: 'profile-anim-cosmic',
  anim_golden_aura: 'profile-anim-goldenaura',
  anim_lightning_storm: 'profile-anim-lightning',
  anim_ethereal_glow: 'profile-anim-ethereal',
  anim_supernova: 'profile-anim-supernova',
  anim_inferno: 'profile-anim-inferno',
  anim_divine_light: 'profile-anim-divine',
};

// Resolve an anim item's key to its CSS class ('' -> neutral preview fallback).
export function animCssFor(key) {
  return ANIM_CLASSES[key] || '';
}
