// Flat motion-ring variants for the `anim` and `effect` cosmetics (Oct 2026).
//
// Each variant is a list of SVG <circle> specs (r in a 0..44 viewBox, cx/cy 22)
// rendered by <MotionRing>. Motion comes from the CSS classes in index.css
// (.mr-*), which only rotate / scale / fade / shift-colour / draw — no glow,
// no particles, no shimmer (memory: feedback-no-neon-glow). Prestige-neutral:
// these are cosmetic skins, mapped per shop key below.

export const CYAN = '#95DEE6';
export const LIME = '#DBF67F';
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

// shop key -> variant. Each of the 9 anim + (16 + 6 new) effect keys gets one.
const MAP = {
  // animations
  anim_plasma: 'pulse', anim_shadow_flame: 'shift', anim_cosmic: 'nested',
  anim_golden_aura: 'breathe', anim_lightning_storm: 'comet', anim_ethereal_glow: 'draw',
  anim_supernova: 'dual', anim_inferno: 'half', anim_divine_light: 'segment',
  // effects (existing)
  fx_pulse: 'pulse', fx_aurora: 'shift', fx_neon_ring: 'spin', fx_electric: 'comet',
  fx_fire_ring: 'half', fx_ice_ring: 'dashed', fx_matrix_rain: 'segment', fx_ripple: 'pulse',
  fx_galaxy_spin: 'spin', fx_rainbow: 'shift', fx_vortex: 'nested', fx_void_pulse: 'breathe',
  flame_ring: 'half', frost_ring: 'dashed', galaxy_spiral: 'dual', lightning_arc: 'comet',
  // effects (new, Oct 2026)
  fx_draw_ring: 'draw', fx_quad_ticks: 'quad', fx_dual_orbit: 'dual',
  fx_segment_ring: 'segment', fx_half_arc: 'half', fx_breathe_ring: 'breathe',
};

export function motionVariantFor(key) {
  return MAP[key] || 'pulse';
}
