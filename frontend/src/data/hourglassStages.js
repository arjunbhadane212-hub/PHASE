// The 5-stage hourglass glyph for hours-source titles.
//
// Same structural convention as streakFlames.js — 24×24, one stage per rarity,
// each stage carrying visibly more sand in the lower bulb than the one below
// it. The dial ring around the plate carries the same reading numerically
// (RARITY_RING_FILL), so the plate reads at glance distance and the glyph reads
// up close.
//
// Motion for this family is mechanical and slow: time passing, never an event
// happening. That is the deliberate opposite of a box title's impact motion.

export const HOURGLASS_STAGES = {
  common:    'M7 3.5 H17 M7 20.5 H17 M8 3.5 L8 7.2 C8 9 9.6 10 12 11 C9.6 10 8 9 8 7.2 Z M16 3.5 L16 7.2 C16 9 14.4 10 12 11 C14.4 10 16 9 16 7.2 Z M9.6 20.5 L9.6 17.5 C9.6 16 10.6 15.4 12 15 C10.6 15.4 9.6 16.4 9.6 17.8 Z',
  rare:      'M7 3.5 H17 M7 20.5 H17 M8 3.5 L8 7.2 C8 9 9.6 10 12 11 C9.6 10 8 9 8 7.2 Z M16 3.5 L16 7.2 C16 9 14.4 10 12 11 C14.4 10 16 9 16 7.2 Z M8.6 20.5 L8.6 17 C8.6 15 9.8 14 12 13 C9.8 14 8.6 15.6 8.6 17.6 Z M15.4 20.5 L15.4 18.5 C15.4 17.4 14.7 16.8 13.4 16.3',
  epic:      'M6.5 3.5 H17.5 M6.5 20.5 H17.5 M7.5 3.5 L7.5 7 C7.5 9 9.5 10 12 11.2 C9.5 10 7.5 8.8 7.5 6.8 Z M16.5 3.5 L16.5 7 C16.5 9 14.5 10 12 11.2 C14.5 10 16.5 8.8 16.5 6.8 Z M8 20.5 L8 16.5 C8 14 9.6 12.6 12 11.2 C9.6 12.6 8 14.6 8 17 Z M16 20.5 L16 17.5 C16 15.8 14.8 14.6 13 13.5',
  legendary: 'M6 3.5 H18 M6 20.5 H18 M7 3.5 L7 6.6 C7 9 10 10.2 12 11.5 C10 10.2 7 8.6 7 6.2 Z M17 3.5 L17 6.6 C17 9 14 10.2 12 11.5 C14 10.2 17 8.6 17 6.2 Z M7.4 20.5 L7.4 15.8 C7.4 12.8 9.8 11.6 12 11.5 C9.8 12 7.4 14.4 7.4 17.4 Z M16.6 20.5 L16.6 17.8 C16.6 15.6 15 13.8 12.4 12.4',
  mythic:    'M5.5 3.5 H18.5 M5.5 20.5 H18.5 M6.6 3.5 L6.6 6.2 C6.6 9.4 10.5 10.6 12 12 C10.5 10.6 6.6 8.2 6.6 5.6 Z M17.4 3.5 L17.4 6.2 C17.4 9.4 13.5 10.6 12 12 C13.5 10.6 17.4 8.2 17.4 5.6 Z M6.9 20.5 L6.9 14.6 C6.9 11 10.2 10.6 12 12 C10.2 10.6 6.9 12.6 6.9 16.6 Z M17.1 20.5 L17.1 16.5 C17.1 13.4 14 11.4 11.4 10',
};

export const RARITY_RING_FILL = { common: 0.2, rare: 0.4, epic: 0.6, legendary: 0.8, mythic: 1.0 };

export const HOURGLASS_FALLBACK = 'common';
export const hourglassFor = (tier) => HOURGLASS_STAGES[tier] || HOURGLASS_STAGES[HOURGLASS_FALLBACK];

// The dial ring is r=33 inside a 76×76 plate, so a full sweep is 2πr.
export const DIAL_CIRCUMFERENCE = 207.35;

// Sweep period scales from 8s (Common) down to 3s (Mythic) — slow and
// inevitable, never a strobe.
export const dialSweepSeconds = (tier) => 8 - 5 * (RARITY_RING_FILL[tier] ?? RARITY_RING_FILL.common);
