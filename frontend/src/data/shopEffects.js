// Profile effect CSS classes (Step 2d of the Supabase migration).
//
// The seeded `effect` shop_items split into two groups:
//  - 12 fx_* "ring" items -> the real .profile-anim-* ring classes (src/index.css),
//    matched by name to the old backend SHOP_ANIMATIONS ring effects.
//  - 4 premium items (Flame Ring, Frost Ring, Galaxy Spiral, Lightning Arc) ->
//    their real .deco-* classes. NOTE: their DB metadata.css values
//    ("fx-flame-ring" etc.) are WRONG/nonexistent and are ignored here — we map
//    to the real class in the frontend. No shop_items DB metadata change.
//
// Every class listed here exists in src/index.css. Unknown keys fall back to ''
// -> the hex/gradient swatch in DecorationsGrid. No invented classes, no
// index.css edits.

const EFFECT_CLASSES = {
  // 12 fx_* ring effects -> .profile-anim-*
  fx_pulse: 'profile-anim-pulse',
  fx_aurora: 'profile-anim-aurora',
  fx_neon_ring: 'profile-anim-neon',
  fx_electric: 'profile-anim-electric',
  fx_fire_ring: 'profile-anim-firering',
  fx_ice_ring: 'profile-anim-icering',
  fx_matrix_rain: 'profile-anim-matrix',
  fx_ripple: 'profile-anim-ripple',
  fx_galaxy_spin: 'profile-anim-galaxy',
  fx_rainbow: 'profile-anim-rainbow',
  fx_vortex: 'profile-anim-vortex',
  fx_void_pulse: 'profile-anim-voidpulse',
  // 4 premium ring effects -> .deco-* (their metadata.css "fx-*" is wrong; ignored)
  flame_ring: 'deco-flame-ring',
  frost_ring: 'deco-frost-ring',
  galaxy_spiral: 'deco-galaxy-spiral',
  lightning_arc: 'deco-lightning-arc',
};

// Resolve an effect item's key to its CSS class ('' -> hex/gradient swatch fallback).
export function effectCssFor(key) {
  return EFFECT_CLASSES[key] || '';
}
