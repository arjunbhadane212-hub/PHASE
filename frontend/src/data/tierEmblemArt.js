// League tier emblems — drawn in the same "Facet" language as the icon set
// (components/icons/paths.js): straight-cut silhouettes, two flat tones split
// by ONE facet line (lit left / shade right), marks engraved in dark ink.
// No outline-strokes, no gradients, no glow. Rank reads from STRUCTURE:
//
//   1–3  Bronze · Silver · Gold        shield crest + 1 / 2 / 3 chevrons
//   4–6  Platinum · Nova · Eclipse     cut gem + 1 / 2 / 3 facet cuts
//   7–9  Zenith · Vertex · Apex        winged crest + flame, 1 / 2 / 3 feathers
//   10   Prime                         hexagon crest under a crown
//
// Pure string output so the React component and any static renderer (icon
// sheet, share images) draw the exact same thing.

const INK = '#0E1012';

const poly = (pts, fill, extra = '') => `<path d="${pts}" fill="${fill}" ${extra}/>`;
const line = (d, w = 6, op = 0.62) =>
  `<path d="${d}" fill="none" stroke="${INK}" stroke-opacity="${op}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

function shieldCrest(a, b, n) {
  const out = [
    poly('M50 6 L16 19 V50 L50 94 Z', a),
    poly('M50 6 L84 19 V50 L50 94 Z', b),
  ];
  const ys = n === 1 ? [52] : n === 2 ? [44, 59] : [36, 50, 64];
  ys.forEach((y) => out.push(line(`M33 ${y} L50 ${y - 11} L67 ${y}`)));
  return out.join('');
}

function gemCrest(a, b, n) {
  const out = [
    poly('M28 12 H50 V92 L8 38 Z', a),
    poly('M50 12 H72 L92 38 L50 92 Z', b),
    line('M8 38 H92', 5, 0.55),
  ];
  if (n >= 1) out.push(line('M50 38 V88', 4.5, 0.5));
  if (n >= 2) { out.push(line('M34 38 L50 88', 4.5, 0.5)); out.push(line('M66 38 L50 88', 4.5, 0.5)); }
  if (n >= 3) { out.push(line('M28 12 L36 38', 4, 0.45)); out.push(line('M72 12 L64 38', 4, 0.45)); }
  return out.join('');
}

function wingedCrest(a, b, n) {
  const out = [
    // wings (shade tone, behind)
    poly('M30 28 L3 20 L10 48 L30 60 Z', b),
    poly('M70 28 L97 20 L90 48 L70 60 Z', a),
    // crest
    poly('M50 10 L26 20 V54 L50 92 Z', a),
    poly('M50 10 L74 20 V54 L50 92 Z', b),
    // engraved flame
    line('M50 30 L59 42 L61 50 L57 60 L50 64 L43 60 L39 50 L41 42 L45 47 Z', 4.5, 0.6),
  ];
  const feathers = [[`M8 30 L28 38`, `M92 30 L72 38`], [`M10 40 L28 47`, `M90 40 L72 47`], [`M6 22 L28 30`, `M94 22 L72 30`]];
  for (let i = 0; i < n; i++) feathers[i].forEach((d) => out.push(line(d, 3.5, 0.5)));
  return out.join('');
}

function primeCrest(a, b) {
  return [
    poly('M50 30 L18 46 V76 L50 94 Z', a),
    poly('M50 30 L82 46 V76 L50 94 Z', b),
    // crown
    poly('M22 30 L22 12 L36 22 L50 4 L50 34 L24 34 Z', a),
    poly('M78 30 L78 12 L64 22 L50 4 L50 34 L76 34 Z', b),
    line('M24 34 H76', 4, 0.55),
    // engraved spark
    line('M50 50 L54 60 L64 64 L54 68 L50 78 L46 68 L36 64 L46 60 Z', 4, 0.6),
  ].join('');
}

export function emblemMarkup(tier, { a, b }) {
  if (tier <= 3) return shieldCrest(a, b, tier);
  if (tier <= 6) return gemCrest(a, b, tier - 3);
  if (tier <= 9) return wingedCrest(a, b, tier - 6);
  return primeCrest(a, b);
}

// Locked: the real silhouette in slate with an engraved padlock.
export function lockedMarkup(tier) {
  const body = emblemMarkup(tier, { a: '#3A3F45', b: '#2C3035' })
    .replace(/stroke-opacity="[\d.]+"/g, 'stroke-opacity="0.25"');
  const lock = `<g transform="translate(50 58)"><rect x="-11" y="-3" width="22" height="17" rx="3" fill="${INK}" fill-opacity=".7"/>` +
    `<path d="M-6.5 -3 V-8 A6.5 6.5 0 0 1 6.5 -8 V-3" fill="none" stroke="${INK}" stroke-opacity=".7" stroke-width="4"/></g>`;
  return body + lock;
}
