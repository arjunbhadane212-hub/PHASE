// Flat motion-ring variants for the `anim` and `effect` cosmetics (Oct 2026).
//
// Each variant is a list of SVG <circle> specs (r in a 0..44 viewBox, cx/cy 22)
// rendered by <MotionRing>. Motion comes from the CSS classes in index.css
// (.mr-*), which only rotate / scale / fade / shift-colour / draw — no glow,
// no particles, no shimmer (memory: feedback-no-neon-glow). Prestige-neutral:
// these are cosmetic skins, mapped per shop key below.

export const CYAN = '#95DEE6';
export const LIME = '#DBF67F';
export const WHITE = '#EAFCFF';
export const PURPLE = '#A59BCC';
export const PEACH = '#F0C9A8';
const C = 125.7; // circumference at r=20, for the "draw" dash

export const VARIANTS = {
  pulse:   [{ r: 20, cls: 'mr-pulse' }, { r: 20, cls: 'mr-pulse mr-d' }],
  spin:    [{ r: 20, dash: '94 200', cls: 'mr-spin' }],
  dual:    [{ r: 20, dash: '42 200', cls: 'mr-spin', sw: 3 }, { r: 14, dash: '37 200', cls: 'mr-spin2', stroke: LIME, sw: 3 }],
  shift:   [{ r: 20, cls: 'mr-shift' }],
  dashed:  [{ r: 20, dash: '5 8', cls: 'mr-spin' }],
  segment: [{ r: 20, dash: '14 7', cls: 'mr-spins', sw: 3 }],
  draw:    [{ r: 20, dash: String(C), cls: 'mr-draw' }],
  half:    [{ r: 20, dash: '63 200', cls: 'mr-fast', stroke: LIME }],
  nested:  [{ r: 20, dash: '5 8', cls: 'mr-spin' }, { r: 14, dash: '4 6', cls: 'mr-spin2', stroke: LIME }],
  quad:    [{ r: 20, dash: '6 25.4', cls: 'mr-spin', sw: 3 }],
  comet:   [{ r: 20, dash: '31 200', cls: 'mr-spin', sw: 3.5 }],
  breathe: [{ r: 20, cls: 'mr-op', stroke: LIME }],
};

// shop key -> [variant, primary colour]. Every key gets a DISTINCT pair, so two
// items can never look identical in the same shop rotation (before, 22 effects
// shared 12 looks — e.g. fx_pulse and fx_ripple were the same ring).
const MAP = {
  // animations
  anim_plasma: ['pulse', CYAN], anim_shadow_flame: ['shift', CYAN], anim_cosmic: ['nested', CYAN],
  anim_golden_aura: ['breathe', LIME], anim_lightning_storm: ['comet', LIME], anim_ethereal_glow: ['draw', WHITE],
  anim_supernova: ['dual', CYAN], anim_inferno: ['half', PEACH], anim_divine_light: ['segment', WHITE],
  anim_orbit_lock: ['quad', LIME], anim_tick_storm: ['dashed', PEACH], anim_dashline: ['spin', WHITE],
  anim_twin_arc: ['dual', PURPLE], anim_overdrive: ['comet', PURPLE],
  // effects
  fx_pulse: ['pulse', LIME], fx_aurora: ['shift', LIME], fx_neon_ring: ['spin', CYAN], fx_electric: ['comet', CYAN],
  fx_fire_ring: ['half', LIME], fx_ice_ring: ['dashed', CYAN], fx_matrix_rain: ['segment', LIME], fx_ripple: ['pulse', PURPLE],
  fx_galaxy_spin: ['spin', PURPLE], fx_rainbow: ['shift', PEACH], fx_vortex: ['nested', PURPLE], fx_void_pulse: ['breathe', PURPLE],
  flame_ring: ['half', CYAN], frost_ring: ['dashed', WHITE], galaxy_spiral: ['dual', LIME], lightning_arc: ['comet', WHITE],
  fx_draw_ring: ['draw', CYAN], fx_quad_ticks: ['quad', CYAN], fx_dual_orbit: ['dual', PEACH],
  fx_segment_ring: ['segment', CYAN], fx_half_arc: ['half', WHITE], fx_breathe_ring: ['breathe', CYAN],
};

export function motionVariantFor(key) {
  return (MAP[key] && MAP[key][0]) || 'pulse';
}

export function motionColorFor(key) {
  return (MAP[key] && MAP[key][1]) || CYAN;
}
