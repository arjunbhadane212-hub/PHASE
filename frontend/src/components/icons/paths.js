// Phase icon geometry — ONE drawing system for every icon in the app.
//
// The rule ("Facet"): every mark is cut from straight segments on a 24×24
// grid, 2px stroke, round caps + joins, and gets at most ONE inner "cut" line
// — the same single facet a gem has. Curves only where a real object is
// round (a shackle, a head). Three game concepts share the same hexagon
// frame (XP, Loot Box, Settings) so the family reads as one set.
//
// Each icon = { d: [outline paths], cut: [inner facet paths] }. Outline and
// cut render identically for the outline style; the solid style fills the
// outline with the icon colour and draws the cut in a darker ink, so a solid
// gem/flame/shield still shows its facet.

const HEX = 'M12 2.5l8.5 4.75v9.5L12 21.5l-8.5-4.75v-9.5z';

export const ICON_PATHS = {
  // ── currency + progression ────────────────────────────────────────────
  gem:      { d: ['M7 3.5h10l4.5 5.5L12 20.5 2.5 9z'], cut: ['M2.5 9h19', 'M9.5 9 12 20.5 14.5 9'] },
  flame:    { d: ['M12 2.5l6 7.5 1.5 4.5-2.5 5-5 2-5-2-2.5-5 1.5-4.5 2.5 2.5z'], cut: ['M12 13l2.5 4-2.5 4.5-2.5-4.5z'] },
  bolt:     { d: ['M13.5 2.5 5 13.5h6.5L10.5 21.5 19 10.5h-6.5z'], cut: [] },
  xp:       { d: [HEX], cut: ['M13.2 7 9.2 12.5h3.2l-1.6 4.5 4-5.5h-3.2z'] },
  shield:   { d: ['M12 2.5 20 5.5V12l-8 9.5L4 12V5.5z'], cut: ['M12 2.5v19'] },
  revive:   { d: ['M6 2.5h12', 'M6 21.5h12', 'M7.5 2.5 16.5 21.5', 'M16.5 2.5 7.5 21.5'], cut: ['M10 17.5h4'] },
  box:      { d: [HEX], cut: ['M3.5 7.25 12 12l8.5-4.75', 'M12 12v9.5'] },
  level:    { d: ['M5 8.5 12 4l7 4.5', 'M5 14 12 9.5l7 4.5', 'M5 19.5 12 15l7 4.5'], cut: [] },
  crown:    { d: ['M3 7.5l4.5 4.5L12 4.5l4.5 7.5L21 7.5l-2 10H5z', 'M5.5 21h13'], cut: [] },
  trophy:   { d: ['M7 3.5h10V8l-3 4.5h-4L7 8z', 'M7 5.5H3.5V7L7 10', 'M17 5.5h3.5V7L17 10', 'M12 12.5v4', 'M8.5 21h7l-1-4.5h-5z'], cut: [] },
  medal:    { d: ['M12 3l5 2.9v5.7L12 14.5l-5-2.9V5.9z', 'M8.6 13.4 7 21l5-2.5 5 2.5-1.6-7.6'], cut: [] },
  sparkle:  { d: ['M12 2.5l2.4 7.1 7.1 2.4-7.1 2.4L12 21.5l-2.4-7.1L2.5 12l7.1-2.4z'], cut: [] },

  // ── cosmetics ─────────────────────────────────────────────────────────
  title:    { d: ['M2.5 12 7 6.5h14.5v11H7z'], cut: ['M11 12h6.5'] },
  banner:   { d: ['M5.5 3.5h13v17L12 16.5l-6.5 4z'], cut: ['M9 8h6'] },
  motion:   { d: ['M12 3.5a8.5 8.5 0 0 1 8.5 8.5', 'M12 20.5A8.5 8.5 0 0 1 3.5 12', 'M12 8.5 15.5 12 12 15.5 8.5 12z'], cut: [] },

  // ── utility ───────────────────────────────────────────────────────────
  clock:    { d: ['M8.3 2.5h7.4l5.8 5.8v7.4l-5.8 5.8H8.3l-5.8-5.8V8.3z'], cut: ['M12 7.5V12l3 2'] },
  lock:     { d: ['M5.5 10.5h13v10h-13z', 'M8.5 10.5V7a3.5 3.5 0 0 1 7 0v3.5'], cut: ['M12 14.5v2'] },
  bell:     { d: ['M6 16.5v-6.3L12 4l6 6.2v6.3l1.5 2h-15z', 'M10 21h4'], cut: [] },
  calendar: { d: ['M4 5.5h16v15H4z', 'M8.5 3v4', 'M15.5 3v4'], cut: ['M4 10h16'] },

  // ── navigation ────────────────────────────────────────────────────────
  home:     { d: ['M3.5 10 12 3l8.5 7v10.5h-5.5v-6h-6v6H3.5z'], cut: [] },
  progress: { d: ['M4 20.5h16', 'M7 16.5v-4', 'M12 16.5V6.5', 'M17 16.5v-7'], cut: [] },
  shop:     { d: ['M4.5 8h15l-1.5 12.5h-12z', 'M9 8V6.5a3 3 0 0 1 6 0V8'], cut: [] },
  settings: { d: [HEX], cut: ['M12 9l2.6 1.5v3L12 15l-2.6-1.5v-3z'] },
  user:     { d: ['M12 11.5a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5z', 'M4.5 20.5 7 15.5h10l2.5 5'], cut: [] },
};

export const ICON_NAMES = Object.keys(ICON_PATHS);
