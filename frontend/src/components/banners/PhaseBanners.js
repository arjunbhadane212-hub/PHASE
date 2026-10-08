// =============================================================================
// Phase Banners — the single source of banner art for the WHOLE app.
//
// One art set, keyed by the real shop_items `banner_*` keys, so the shop tile
// and the equipped profile banner render from the exact same component — what
// you buy is what you wear. (Old internal names starter_/delta_/phase_* are
// kept as aliases so any lingering caller still resolves.)
//
// Rebuilt Oct 2026 (profile remodel): on-theme cyan/lime only — NO blue, NO
// diagonal linear-gradients, no flat line-work. Every banner has depth (a soft
// radial bloom + a natural glow + a live accent); rarity adds motion/dual-tone,
// not just "more". Every one is pure inline SVG, no image assets.
//
// All art is authored as self-contained SVG markup keyed by a per-instance uid
// (so multiple banners on one screen never share gradient/filter ids) and
// rendered through one wrapper. viewBox 0 0 375 160, scaled to fill + cropped.
// =============================================================================
import { useId, useMemo } from 'react';

const C = { cyan: '#95DEE6', cyanDim: '#5FB8C4', lime: '#DBF67F', white: '#EAFCFF' };

const svg = (inner) =>
  `<svg viewBox="0 0 375 160" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block">${inner}</svg>`;
const bg = (h) => `<rect width="375" height="160" fill="${h || '#06090B'}"/>`;
const glow = (u, dev) =>
  `<filter id="${u}gl" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${dev || 3}"/></filter>`;
const bloom = (u, cx, cy, col, op) =>
  `<radialGradient id="${u}bl" cx="${cx}%" cy="${cy}%" r="62%"><stop offset="0%" stop-color="${col}" stop-opacity="${op}"/><stop offset="100%" stop-color="${col}" stop-opacity="0"/></radialGradient>`;
// deterministic pseudo-random so a star field is stable per instance
const rng = (seed) => { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const stars = (u, n, seed, limeChance = 0.3, maxY = 160) => {
  const r = rng(seed); let out = '';
  for (let i = 0; i < n; i++) {
    const x = (r() * 375).toFixed(0), y = (r() * maxY).toFixed(0), rad = (r() * 1.2 + 0.3).toFixed(1);
    out += `<circle cx="${x}" cy="${y}" r="${rad}" fill="${r() < limeChance ? C.lime : C.white}" fill-opacity="${(r() * 0.6 + 0.2).toFixed(2)}"/>`;
  }
  return out;
};

// ── COMMON ───────────────────────────────────────────────────────────────
function grid(u) {
  let v = ''; for (let i = 0; i <= 9; i++) { const x = i * 375 / 9; v += `<line x1="${x}" y1="0" x2="187" y2="152" stroke="${C.cyan}" stroke-opacity=".16"/>`; }
  let h = ''; [36, 60, 86, 114, 144].forEach((y) => { const sp = (y / 152) * 130; h += `<line x1="${187 - 150 - sp}" y1="${y}" x2="${187 + 150 + sp}" y2="${y}" stroke="${C.cyan}" stroke-opacity=".12"/>`; });
  let n = ''; [[120, 86], [230, 60], [280, 114]].forEach(([x, y]) => { n += `<circle cx="${x}" cy="${y}" r="2.4" fill="${C.cyan}" filter="url(#${u}gl)"/>`; });
  return svg(`<defs>${glow(u, 2)}${bloom(u, 50, 108, C.cyan, .3)}</defs>${bg('#070B0D')}${v}${h}<rect width="375" height="160" fill="url(#${u}bl)"/><line x1="0" y1="114" x2="375" y2="114" stroke="${C.cyan}" stroke-opacity=".55" stroke-width="1.4" filter="url(#${u}gl)"/>${n}`);
}
function circuit(u) {
  const ys = [26, 48, 72, 100, 126, 148]; let l = ys.map((y) => `<line x1="0" y1="${y}" x2="375" y2="${y}" stroke="${C.cyan}" stroke-opacity=".12"/>`).join('');
  const nodes = [[60, 48], [150, 100], [230, 72], [300, 126], [95, 126], [190, 148]];
  let n = nodes.map(([x, y], i) => `<line x1="${x}" y1="${y - 14}" x2="${x}" y2="${y}" stroke="${C.cyan}" stroke-opacity=".3"/><circle cx="${x}" cy="${y}" r="2.6" fill="${i % 4 === 0 ? C.lime : C.cyan}" fill-opacity=".6"/>`).join('');
  return svg(`<defs>${glow(u, 2.4)}${bloom(u, 40, 62, C.cyan, .26)}</defs>${bg('#070B0D')}<rect width="375" height="160" fill="url(#${u}bl)"/>${l}${n}<line x1="0" y1="100" x2="375" y2="100" stroke="${C.cyan}" stroke-opacity=".75" stroke-width="1.6" filter="url(#${u}gl)"/><circle cx="150" cy="100" r="4.5" fill="${C.cyan}" filter="url(#${u}gl)"/>`);
}
function pulse(u) {
  let r = ''; for (let i = 1; i <= 6; i++) { r += `<ellipse cx="78" cy="80" rx="${i * 44}" ry="${i * 28}" fill="none" stroke="${C.cyan}" stroke-opacity="${0.55 - i * 0.07}" stroke-width="${2.4 - i * 0.22}"/>`; }
  return svg(`<defs>${glow(u, 4)}${bloom(u, 20, 50, C.cyan, .34)}</defs>${bg('#070B0D')}<rect width="375" height="160" fill="url(#${u}bl)"/>${r}<circle cx="78" cy="80" r="6" fill="${C.cyan}" filter="url(#${u}gl)"/><circle cx="78" cy="80" r="2.5" fill="#fff"/>`);
}
// ── RARE ─────────────────────────────────────────────────────────────────
function current(u) {
  const wave = (y, a, p) => { let d = 'M0 ' + y; for (let x = 0; x <= 375; x += 12) d += ` L${x} ${(y + Math.sin(x / 58 + p) * a).toFixed(1)}`; return d; };
  const ys = [48, 68, 90, 112, 132]; let w = ys.map((y, i) => `<path d="${wave(y, 10 - i, i * 0.7)}" fill="none" stroke="${C.cyan}" stroke-opacity="${0.6 - i * 0.09}" stroke-width="${i === 0 ? 1.8 : 1.3}" ${i === 0 ? `filter="url(#${u}gl)"` : ''}/>`).join('');
  return svg(`<defs>${glow(u, 3)}${bloom(u, 50, 40, C.cyan, .24)}</defs>${bg('#06090C')}<rect width="375" height="160" fill="url(#${u}bl)"/>${w}`);
}
function topo(u) {
  let c = ''; for (let i = 1; i <= 8; i++) { const rx = i * 25, ry = i * 16; c += `<path d="M${235 - rx} 80 a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0" fill="none" stroke="${i <= 2 ? C.lime : C.cyan}" stroke-opacity="${0.5 - i * 0.045}" stroke-width="${i <= 2 ? 1.6 : 1.2}" ${i <= 2 ? `filter="url(#${u}gl)"` : ''}/>`; }
  return svg(`<defs>${glow(u, 3)}${bloom(u, 62, 50, C.cyan, .3)}</defs>${bg('#06090C')}<rect width="375" height="160" fill="url(#${u}bl)"/>${c}`);
}
function fracture(u) {
  const p = ['M0 0 L95 55 L155 95 L205 160', 'M95 55 L150 20', 'M155 95 L225 78', 'M155 95 L172 140'];
  let g = p.map((d) => `<path d="${d}" fill="none" stroke="${C.cyan}" stroke-opacity=".9" stroke-width="7" stroke-linecap="round" filter="url(#${u}gl)"/>`).join('');
  let cr = p.map((d) => `<path d="${d}" fill="none" stroke="${C.white}" stroke-opacity=".9" stroke-width="1.8" stroke-linecap="round"/>`).join('');
  return svg(`<defs>${glow(u, 4)}${bloom(u, 30, 20, C.cyan, .3)}</defs>${bg('#06090C')}<rect width="375" height="160" fill="url(#${u}bl)"/>${g}${cr}<circle cx="155" cy="95" r="3.5" fill="${C.lime}" filter="url(#${u}gl)"/>`);
}
function frequency(u, col) {
  const h = [44, 74, 100, 64, 126, 88, 116, 58, 96, 134, 78, 104, 48, 120, 68];
  let b = h.map((v, i) => { const x = 14 + i * 24; return `<rect x="${x}" y="${152 - v}" width="10" height="${v}" rx="4" fill="${col}" fill-opacity="${0.3 + (v / 140) * 0.55}"/><rect x="${x}" y="${152 - v}" width="10" height="4" rx="2" fill="${col}" filter="url(#${u}gl)"/>`; }).join('');
  return svg(`<defs>${glow(u, 2.4)}${bloom(u, 50, 100, col, .2)}</defs>${bg('#07090A')}<rect width="375" height="160" fill="url(#${u}bl)"/>${b}`);
}
function ember(u) {
  const h = [52, 82, 66, 112, 92, 132, 76, 102, 60, 122, 86, 106, 70];
  let b = h.map((v, i) => { const x = 20 + i * 27; let d = ''; for (let k = 0; k < Math.floor(v / 17); k++) d += `<circle cx="${x}" cy="${146 - k * 17}" r="3" fill="${C.lime}" fill-opacity="${0.85 - k * 0.11}" ${k === 0 ? `filter="url(#${u}gl)"` : ''}/>`; return d; }).join('');
  return svg(`<defs>${glow(u, 3)}${bloom(u, 50, 100, C.lime, .22)}</defs>${bg('#070A06')}<rect width="375" height="160" fill="url(#${u}bl)"/>${b}`);
}
// ── LEGENDARY ──────────────────────────────────────────────────────────────
function afterglow(u) {
  return svg(`<defs>${glow(u, 5)}<radialGradient id="${u}a" cx="50%" cy="44%" r="62%"><stop offset="0%" stop-color="${C.white}" stop-opacity=".6"/><stop offset="30%" stop-color="${C.cyan}" stop-opacity=".45"/><stop offset="70%" stop-color="${C.cyanDim}" stop-opacity=".1"/><stop offset="100%" stop-color="${C.cyan}" stop-opacity="0"/></radialGradient></defs>${bg('#06090C')}<rect width="375" height="160" fill="url(#${u}a)"/>${Array.from({ length: 26 }, (_, i) => `<line x1="0" y1="${i * 6.3}" x2="375" y2="${i * 6.3}" stroke="#000" stroke-opacity=".18"/>`).join('')}<ellipse cx="187" cy="72" rx="150" ry="120" fill="none" stroke="${C.cyan}" stroke-opacity=".45" stroke-width="1" filter="url(#${u}gl)"/><ellipse cx="187" cy="72" rx="96" ry="76" fill="none" stroke="${C.lime}" stroke-opacity=".3" stroke-width="1"/>`);
}
function aurora(u) {
  return svg(`<defs><linearGradient id="${u}c" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="${C.cyan}" stop-opacity="0"/><stop offset="100%" stop-color="${C.cyan}" stop-opacity=".6"/></linearGradient><linearGradient id="${u}l" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="${C.lime}" stop-opacity="0"/><stop offset="100%" stop-color="${C.lime}" stop-opacity=".55"/></linearGradient><filter id="${u}b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10"/></filter></defs>${bg('#06090B')}${stars(u, 40, 7, 0, 90)}<g filter="url(#${u}b)"><path d="M30 160 C60 70 70 60 90 20 L140 20 C120 70 110 90 95 160 Z" fill="url(#${u}l)"/><path d="M150 160 C180 60 185 70 210 25 L255 25 C235 80 225 95 215 160 Z" fill="url(#${u}c)"/><path d="M270 160 C295 80 300 70 320 30 L360 30 C345 85 335 100 330 160 Z" fill="url(#${u}l)"/></g>`);
}
function nebula(u) {
  return svg(`<defs>${glow(u, 5)}<radialGradient id="${u}n" cx="64%" cy="40%" r="56%"><stop offset="0%" stop-color="${C.white}" stop-opacity=".5"/><stop offset="35%" stop-color="${C.cyan}" stop-opacity=".4"/><stop offset="70%" stop-color="${C.cyanDim}" stop-opacity=".08"/><stop offset="100%" stop-color="${C.cyan}" stop-opacity="0"/></radialGradient></defs>${bg('#05070A')}<rect width="375" height="160" fill="url(#${u}n)"/>${stars(u, 70, 11, 0.3)}<circle cx="240" cy="64" r="5" fill="#fff" filter="url(#${u}gl)"/>`);
}
function meridian(u) {
  // A bright horizon with a sun-bloom above it and soft vertical light shafts
  // rising from it, mirrored faintly below. Natural, no diagonal gradients.
  let shafts = ''; [90, 150, 200, 255, 300].forEach((x, i) => { shafts += `<rect x="${x}" y="${20 + (i % 2) * 8}" width="${3 + (i % 3)}" height="${58 - (i % 2) * 10}" fill="url(#${u}sh)" opacity="${0.5 - (i % 3) * 0.1}"/>`; });
  return svg(`<defs>${glow(u, 5)}<radialGradient id="${u}s" cx="50%" cy="52%" r="46%"><stop offset="0%" stop-color="${C.white}" stop-opacity=".7"/><stop offset="35%" stop-color="${C.cyan}" stop-opacity=".4"/><stop offset="100%" stop-color="${C.cyan}" stop-opacity="0"/></radialGradient><linearGradient id="${u}sh" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="${C.cyan}" stop-opacity=".5"/><stop offset="100%" stop-color="${C.cyan}" stop-opacity="0"/></linearGradient></defs>${bg('#06090C')}<rect width="375" height="160" fill="url(#${u}s)"/>${shafts}<line x1="0" y1="92" x2="375" y2="92" stroke="${C.white}" stroke-opacity=".85" stroke-width="1.6" filter="url(#${u}gl)"/><line x1="40" y1="92" x2="335" y2="92" stroke="${C.lime}" stroke-opacity=".5" stroke-width="1"/><line x1="70" y1="112" x2="305" y2="112" stroke="${C.cyan}" stroke-opacity=".2" stroke-width="1"/><line x1="110" y1="128" x2="265" y2="128" stroke="${C.cyan}" stroke-opacity=".1" stroke-width="1"/>`);
}
// ── MYTHIC ─────────────────────────────────────────────────────────────────
function eclipse(u) {
  return svg(`<defs><radialGradient id="${u}cor" cx="50%" cy="50%" r="50%"><stop offset="54%" stop-color="${C.cyan}" stop-opacity="0"/><stop offset="70%" stop-color="${C.white}" stop-opacity=".95"/><stop offset="80%" stop-color="${C.lime}" stop-opacity=".55"/><stop offset="100%" stop-color="${C.cyan}" stop-opacity="0"/></radialGradient><radialGradient id="${u}amb" cx="50%" cy="50%" r="60%"><stop offset="0%" stop-color="${C.cyanDim}" stop-opacity=".28"/><stop offset="100%" stop-opacity="0"/></radialGradient></defs>${bg('#04070A')}<rect width="375" height="160" fill="url(#${u}amb)"/>${stars(u, 55, 23, 0.4)}<circle cx="187" cy="80" r="120" fill="url(#${u}cor)"><animate attributeName="r" values="115;125;115" dur="4s" repeatCount="indefinite"/></circle><circle cx="187" cy="80" r="47" fill="#04070A"/><circle cx="187" cy="80" r="47" fill="none" stroke="${C.white}" stroke-width="1.5" stroke-opacity=".95"/>`);
}
function warpgate(u) {
  // Concentric portal rings receding to a bright core, slow pull inward.
  let rings = ''; for (let i = 7; i >= 1; i--) { const rr = i * 23; rings += `<circle cx="187" cy="80" r="${rr}" fill="none" stroke="${i <= 2 ? C.lime : C.cyan}" stroke-opacity="${0.2 + (8 - i) * 0.08}" stroke-width="${0.8 + (8 - i) * 0.25}"/>`; }
  return svg(`<defs>${glow(u, 5)}<radialGradient id="${u}w" cx="50%" cy="50%" r="52%"><stop offset="0%" stop-color="${C.white}" stop-opacity=".9"/><stop offset="30%" stop-color="${C.cyan}" stop-opacity=".3"/><stop offset="100%" stop-color="${C.cyan}" stop-opacity="0"/></radialGradient></defs>${bg('#04070A')}${stars(u, 40, 31, 0.3)}<rect width="375" height="160" fill="url(#${u}w)"/><g>${rings}<animateTransform attributeName="transform" type="scale" additive="sum" values="1;1.04;1" dur="5s" repeatCount="indefinite"/></g><circle cx="187" cy="80" r="9" fill="${C.white}" filter="url(#${u}gl)"/>`);
}
function defaultArt(u) {
  return svg(`<defs>${bloom(u, 50, 40, C.cyan, .12)}</defs>${bg('#070B0D')}<rect width="375" height="160" fill="url(#${u}bl)"/><text x="340" y="150" fill="${C.cyan}" fill-opacity=".1" font-size="11" font-weight="700" letter-spacing="3" text-anchor="end" font-family="inherit">PHASE</text>`);
}

// Art keyed by the real shop_items banner keys (+ old internal aliases).
const ART = {
  banner_grid: grid,
  banner_circuit: circuit,
  banner_pulse: pulse,
  banner_deep_ocean: current,
  banner_midnight: topo,
  banner_void_fracture: fracture,
  banner_enchanted_forest: (u) => frequency(u, C.lime),
  banner_sunset_blaze: ember,
  banner_crimson_tide: afterglow,
  banner_northern_lights: aurora,
  banner_galaxy: nebula,
  banner_void_walker: eclipse,
  // new showpieces (Oct 2026)
  banner_meridian: meridian,
  banner_warpgate: warpgate,
  // legacy internal-name aliases (kept so old callers still resolve)
  starter_circuit: circuit,
  starter_grid: grid,
  delta_pulse: pulse,
  delta_void: fracture,
  phase_apex: aurora,
  phase_fracture: afterglow,
  default: defaultArt,
};

// Display metadata — used by any surface that wants a human name/rarity without
// a DB round-trip. The DB remains the source of truth for price/ownership.
export const BANNER_META = [
  { key: 'banner_grid', name: 'Grid', rarity: 'common' },
  { key: 'banner_circuit', name: 'Circuit', rarity: 'common' },
  { key: 'banner_pulse', name: 'Pulse', rarity: 'common' },
  { key: 'banner_deep_ocean', name: 'Current', rarity: 'rare' },
  { key: 'banner_midnight', name: 'Topography', rarity: 'rare' },
  { key: 'banner_void_fracture', name: 'Fracture', rarity: 'rare' },
  { key: 'banner_enchanted_forest', name: 'Frequency', rarity: 'rare' },
  { key: 'banner_sunset_blaze', name: 'Ember Rise', rarity: 'rare' },
  { key: 'banner_crimson_tide', name: 'Afterglow', rarity: 'legendary' },
  { key: 'banner_northern_lights', name: 'Aurora', rarity: 'legendary' },
  { key: 'banner_galaxy', name: 'Nebula', rarity: 'legendary' },
  { key: 'banner_meridian', name: 'Meridian', rarity: 'legendary' },
  { key: 'banner_void_walker', name: 'Eclipse', rarity: 'mythic' },
  { key: 'banner_warpgate', name: 'Warpgate', rarity: 'mythic' },
];

// Render helper — resolve by key, fall back to the neutral default. Fills its
// parent (the caller sizes the box); no absolute positioning so it works in a
// flex tile and inside an absolute-inset stage alike.
export function PhaseBanner({ bannerKey }) {
  const raw = useId();
  const uid = 'b' + raw.replace(/:/g, '');
  const gen = ART[bannerKey] || ART.default;
  const html = useMemo(() => gen(uid), [gen, uid]);
  return <div style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: html }} />;
}
