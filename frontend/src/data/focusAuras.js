// Focus Mode Timer Screens (internally 'auras') — the full-screen session's look.
// Keyed by shop_items.key (category 'focus_aura'). Colors are duplicated here
// rather than read from shop_items.metadata so the render path never depends
// on a network round-trip having landed correctly — same pattern as
// shopAnimations.js / shopEffects.js (frontend owns visuals, DB owns commerce).
//
// 'wash' = full-bleed solid fill (the existing Cyan Pulse look, just made
// swappable). 'glow' = near-black bg with a soft pulsing accent-color ring —
// keeps purple scoped to an accent/glow, never a full-screen fill, per the
// v2 color rule (#A59BCC is pill/chip-accent only).
// orbBg is the Breathing-Orb style's circle fill. Wash auras keep the classic
// near-black orb (it needs to contrast against a bright page); the glow aura's
// page is already near-black, so its orb gets a lighter elevated fill instead
// so the two don't collapse into each other.
export const FOCUS_AURAS = {
  focus_aura_cyan_pulse: {
    key: 'focus_aura_cyan_pulse', name: 'Cyan Pulse', style: 'wash',
    bg: '#4ECDDE', ink: '#0F1210', muted: 'rgba(15,18,16,0.55)', accent: '#95DEE6', orbBg: '#0F1210', track: 'rgba(255,255,255,0.4)',
  },
  focus_aura_blue_drift: {
    key: 'focus_aura_blue_drift', name: 'Blue Drift', style: 'wash',
    bg: '#3B82F6', ink: '#F4F5F2', muted: 'rgba(244,245,242,0.6)', accent: '#60A5FA', orbBg: '#0F1210', track: 'rgba(255,255,255,0.4)',
  },
  focus_aura_lime_flow: {
    key: 'focus_aura_lime_flow', name: 'Lime Flow', style: 'wash',
    bg: '#DBF67F', ink: '#0F1210', muted: 'rgba(15,18,16,0.55)', accent: '#EEFAB4', orbBg: '#0F1210', track: 'rgba(255,255,255,0.4)',
  },
  focus_aura_violet_focus: {
    key: 'focus_aura_violet_focus', name: 'Violet Focus', style: 'glow',
    bg: '#14121A', ink: '#F4F5F2', muted: 'rgba(244,245,242,0.55)', accent: '#A59BCC', orbBg: '#39324A', track: 'rgba(255,255,255,0.4)',
  },
  focus_aura_paper: {
    key: 'focus_aura_paper', name: 'Paper', style: 'wash',
    bg: '#F4F5F2', ink: '#0F1210', muted: 'rgba(15,18,16,0.55)', accent: '#FFFFFF', orbBg: '#0F1210', track: 'rgba(15,18,16,0.12)',
  },
  focus_aura_ember: {
    key: 'focus_aura_ember', name: 'Ember', style: 'glow',
    bg: '#17110B', ink: '#F4F5F2', muted: 'rgba(244,245,242,0.55)', accent: '#FBBF24', orbBg: '#43341F', track: 'rgba(255,255,255,0.4)',
  },
};

// '#RRGGBB' + alpha (0-1) -> 'rgba(r,g,b,a)'. Used to composite accent-tinted
// glows/shadows without hand-maintaining a parallel rgba() per aura.
export const hexA = (hex, alpha) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

export const DEFAULT_AURA = FOCUS_AURAS.focus_aura_cyan_pulse;

export const getAura = (key) => FOCUS_AURAS[key] || DEFAULT_AURA;

// Ordered for display — default first, then by price.
export const AURA_ORDER = [
  'focus_aura_cyan_pulse',
  'focus_aura_blue_drift',
  'focus_aura_paper',
  'focus_aura_lime_flow',
  'focus_aura_violet_focus',
  'focus_aura_ember',
];

// Grace Extender tiers (category 'focus_boost'). Highest tier owned applies.
export const GRACE_TIERS = [
  { key: 'focus_grace_steady', name: 'Steady Focus', graceMs: 6000, price: 150 },
  { key: 'focus_grace_iron', name: 'Iron Focus', graceMs: 12000, price: 350 },
];

export const DEFAULT_GRACE_MS = 3000;
