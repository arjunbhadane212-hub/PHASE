// One outline mark per box title (Delta + Phase + the 3 shared + 5 Starter).
//
// 24×24 design space rendered in a `viewBox="-1 -1 26 26"` so strokes that run
// to the edge are not clipped. Every mark is `fill="none"` /
// `stroke="currentColor"` with round caps and joins — the plate supplies the
// colour, the sigil supplies the silhouette.
//
// Hard rule: a sigil must never render blank at any frame of its loop. If a
// stroke animates fully out, something static stays behind it. Animation lives
// in index.css, keyed off the classes in SIGIL_CLASS.

export const SIGILS = {
  'Enforcer': `<path d="M12 3 L20 6 V12 C20 17 16.5 19.8 12 21 C7.5 19.8 4 17 4 12 V6 Z"/> <path class="a" d="M8 11 L12 14.5 L16 11"/> <path class="b" d="M8 7.6 L12 11.1 L16 7.6"/>`,
  'Vandal': `<path d="M5.5 20.5 L18.5 3.5"/> <path class="c" d="M9.5 11.5 L13 12.8 L10.8 16" stroke-dasharray="10" stroke-dashoffset="10"/> <path class="c2" d="M15 6 L17 7.4" stroke-dasharray="3" stroke-dashoffset="3"/>`,
  'Hollow': `<circle class="o" cx="12" cy="12" r="8.6"/> <g class="v" style="transform-origin:12px 12px"> <path d="M14.6 9.4 L9.4 14.6 M9.4 9.4 L14.6 14.6"/></g>`,
  'Menace': `<path d="M4 4.5 H20 L12 20.5 Z"/><path d="M9 9 L12 14 L15 9"/> <circle class="dr" cx="12" cy="19" r="1.1"/>`,
  'Phantom': `<g class="gh" style="transform-origin:12px 13px"> <path class="ec" d="M4.5 20.5 V10.5 A7.5 7.5 0 0 1 19.5 10.5 V20.5 L17 18.4 L14.5 20.5 L12 18.4 L9.5 20.5 L7 18.4 Z" opacity="0"/> <path class="bd" d="M4.5 20.5 V10.5 A7.5 7.5 0 0 1 19.5 10.5 V20.5 L17 18.4 L14.5 20.5 L12 18.4 L9.5 20.5 L7 18.4 Z"/> <path class="ey" d="M9 11.6 H10.8 M13.2 11.6 H15"/> </g>`,
  'Savage': `<path d="M6 3.8 C7.2 9.6 8 14 9 20.4"/> <path d="M12 3 C12.6 9.6 13 15 13 21"/> <path d="M18 3.8 C16.8 9.6 16 14 15 20.4"/> <path class="h1" d="M6 3.8 C7.2 9.6 8 14 9 20.4" stroke-width="3" stroke-dasharray="6 24"/> <path class="h2" d="M12 3 C12.6 9.6 13 15 13 21" stroke-width="3" stroke-dasharray="6 24"/> <path class="h3" d="M18 3.8 C16.8 9.6 16 14 15 20.4" stroke-width="3" stroke-dasharray="6 24"/>`,
  'Grinder': `<g class="g" style="transform-origin:12px 12px"> <path d="M12 2.5 V5.2 M12 18.8 V21.5 M21.5 12 H18.8 M5.2 12 H2.5 M18.7 5.3 L16.8 7.2 M7.2 16.8 L5.3 18.7 M18.7 18.7 L16.8 16.8 M7.2 7.2 L5.3 5.3"/> <circle cx="12" cy="12" r="5.4"/></g> <circle cx="12" cy="12" r="1.6"/>`,
  'Heavy': `<g class="an" style="transform-origin:12px 14px"> <path d="M3.5 9 H20.5 L18 17.5 H6 Z"/><path d="M8.5 9 V6.5 A3.5 3.5 0 0 1 15.5 6.5 V9"/></g> <path d="M5 20.5 H19"/> <path class="sh" d="M4 22.5 L2.5 23.8 M20 22.5 L21.5 23.8" opacity="0"/>`,
  'Stray': `<path class="tr" d="M3 18 H6 M8.5 18 H11.5 M14 18 H15.5" stroke-dasharray="3 2.5"/> <g class="ar" style="transform-origin:12px 12px"> <path d="M9 14 L15.5 5.5 M15.5 5.5 H11.6 M15.5 5.5 V9.4"/></g>`,
  'Rebel': `<g class="l" style="transform-origin:12px 12px"><path d="M8.5 9.5 A3.5 3.5 0 0 1 8.5 4.5 L10 3.2"/><path d="M6.5 15 L9.5 12"/></g> <g class="r" style="transform-origin:12px 12px"><path d="M13.5 20.8 L15.5 19.5 A3.5 3.5 0 0 0 15.5 14.5"/><path d="M14.5 12 L17.5 9"/></g> <path class="sp" d="M11.2 12.8 L12.8 11.2" opacity="0"/>`,
  'Drifter': `<g class="nd" style="transform-origin:12px 12px"> <path d="M12 2.8 L15.4 12 L12 21.2 L8.6 12 Z"/><path d="M12 2.8 V21.2"/></g> <path class="w1" d="M2.5 7.5 C5.5 6 7.5 9 4.5 10.5"/> <path class="w2" d="M21.5 16.5 C18.5 18 16.5 15 19.5 13.5"/>`,
  'Grit': `<path d="M12 3 L20 7.5 V16.5 L12 21 L4 16.5 V7.5 Z"/> <path d="M12 3 L12 21 M4 7.5 L20 16.5 M20 7.5 L4 16.5" opacity=".55"/> <path class="gl" d="M7 5.5 L19 18.5" stroke-width="3" opacity="0"/>`,
  'Zero': `<path d="M12 3.6 C15.8 3.6 18 7.3 18 12 C18 16.7 15.8 20.4 12 20.4 C8.2 20.4 6 16.7 6 12 C6 7.3 8.2 3.6 12 3.6 Z"/> <path class="sl" d="M7.6 18.6 L16.4 5.4" stroke-dasharray="16" stroke-dashoffset="16"/>`,
  'God-Complex': `<path d="M4.5 19.5 H19.5"/> <path class="cr" d="M5 16.5 L4 8 L9 12 L12 5.5 L15 12 L20 8 L19 16.5 Z"/> <g class="ha" style="transform-origin:12px 12px"><circle cx="12" cy="2.4" r="1.5"/></g> <ellipse class="hr" cx="12" cy="2.6" rx="5.2" ry="1.3" opacity=".5"/>`,
  'Anti-Hero': `<g class="st" style="transform-origin:12px 12px"> <path d="M12 2.8 L14.8 9.2 L21.5 9.9 L16.4 14.4 L17.9 21 L12 17.5 L6.1 21 L7.6 14.4 L2.5 9.9 L9.2 9.2 Z"/></g> <path class="ct" d="M3 12.6 H21"/>`,
  'Anomaly': `<path class="q1" d="M4 4 H15 V15 H4 Z"/> <path class="q2" d="M9 9 H20 V20 H9 V9"/>`,
  'Havoc': `<g class="ry" style="transform-origin:12px 12px"> <path d="M12 2.5 V7 M12 17 V21.5 M2.5 12 H7 M17 12 H21.5"/> <path d="M5.2 5.2 L8.4 8.4 M15.6 15.6 L18.8 18.8 M18.8 5.2 L15.6 8.4 M8.4 15.6 L5.2 18.8" opacity=".6"/></g> <circle class="co" cx="12" cy="12" r="2.4"/>`,
  'Despair': `<path d="M12 2.8 C12 2.8 5.5 10.4 5.5 15 A6.5 6.5 0 0 0 18.5 15 C18.5 10.4 12 2.8 12 2.8 Z"/> <path class="dp" d="M12 9.5 V16 M9.5 13.5 L12 16 L14.5 13.5"/>`,
  'Malice': `<path d="M12 2.5 L14.5 9.5 L12 19.5 L9.5 9.5 Z"/><path d="M6 9.5 H18"/><path d="M12 19.5 V21.8"/> <path class="gm" d="M11 4.5 L13 8.5" stroke-width="2.6" opacity="0"/>`,
  'Wrath': `<path class="bo" d="M12.5 2.5 L6 12.5 H11 L9.5 21.5 L18 10.5 H12.8 Z"/> <path class="sk" d="M3.5 6 L5.5 8 M20.5 16 L18.5 14"/>`,
  'Executioner': `<g class="ax" style="transform-origin:7px 21px"> <path d="M7 21 L15.5 6.5"/> <path d="M13 3 C17 3.6 20.5 7 21 11.5 C17.2 12 13.6 10 12 6.5 Z"/></g> <path class="gr" d="M5 18.5 L9 21"/>`,
  'Nightfall': `<path class="mn" d="M17.5 3.4 A8 8 0 1 0 17.5 16.6 A6.4 6.4 0 0 1 17.5 3.4 Z"/> <path d="M2.5 20.5 H21.5"/> <circle class="s1" cx="5.5" cy="5" r=".9"/><circle class="s2" cx="20" cy="8.5" r=".9"/> <circle class="s3" cx="8" cy="15" r=".8"/>`,
  'Vengeance': `<g class="b1" style="transform-origin:12px 12px"><path d="M4.5 3.5 L16.5 17.5"/><path d="M14.8 15.3 L18.5 19.5 L20.5 21.5"/></g> <g class="b2" style="transform-origin:12px 12px"><path d="M19.5 3.5 L7.5 17.5"/><path d="M9.2 15.3 L5.5 19.5 L3.5 21.5"/></g>`,
  'Untouchable': `<path d="M12 3 L19 6 V12 C19 16.5 15.9 19.4 12 20.6 C8.1 19.4 5 16.5 5 12 V6 Z"/> <ellipse class="o1" cx="12" cy="12" rx="9.5" ry="5"/> <ellipse class="o2" cx="12" cy="12" rx="9.5" ry="5" opacity=".4"/>`,
  'Cataclysm': `<path class="t1" d="M17.5 3 L11 9.5" stroke-dasharray="10" stroke-dashoffset="10"/> <path class="t2" d="M20.5 6.5 L14.5 12.5" stroke-dasharray="9" stroke-dashoffset="9"/> <circle class="rk" cx="13" cy="12.5" r="4.5"/> <path d="M3 20.5 H21"/><path class="im" d="M6 17 L8 20.5 M18 17 L16 20.5" opacity="0"/>`,
  'Ruin': `<path d="M8 3.5 H16"/><path class="pt" d="M9 3.5 V10 L14.5 12 L9.5 14 V20.5"/> <path class="pb" d="M15 3.5 V9"/><path d="M6.5 20.5 H17.5"/> <path class="db" d="M15.5 12.5 L17.5 16 L14 15.5"/>`,
  'Overkill': `<path class="v1" d="M4 8 L9 12.5 L4 17"/><path class="v2" d="M11 8 L16 12.5 L11 17"/> <path class="x" d="M17.5 8.5 L21.5 16.5 M21.5 8.5 L17.5 16.5"/>`,
  'Vermin': `<path d="M3.5 15.5 C3.5 11.5 7 9 10.5 9 C14 9 16 11 16 13.5"/> <path class="tl" d="M16 13.5 A2.6 2.6 0 0 0 21 13 C21 9.5 18 6.5 14 6"/> <path d="M6.5 15.5 A3 3 0 0 0 12.5 15.5"/><path d="M4 19.5 H20"/>`,
  'Relentless': `<path class="inf" d="M8.2 8.4 A4.6 4.6 0 1 0 8.2 15.6 L15.8 8.4 A4.6 4.6 0 1 1 15.8 15.6 Z" stroke-dasharray="14 34" stroke-dashoffset="0"/> <path class="ar" d="M18 4.5 L21 7.5 L18 10.5"/>`,
  'Sprout': `<path d="M12 21 V11"/> <path class="lf" d="M12 11 C12 7.5 9 5 5.5 5 C5.5 8.5 8.5 11 12 11 Z"/> <path class="rf" d="M12 12.5 C12 9.6 14.4 7.5 17.5 7.5 C17.5 10.4 15.1 12.5 12 12.5 Z"/>`,
  'Cinder': `<path class="cd" d="M12 20.5 C8.7 20.5 6.5 18.3 6.5 15.3 C6.5 11 12 6.5 12 3.5 C12 6.5 17.5 11 17.5 15.3 C17.5 18.3 15.3 20.5 12 20.5 Z"/>`,
  'Pace': `<path class="l1" d="M3 7 H12"/><path class="l2" d="M3 12 H16"/><path class="l3" d="M3 17 H10"/> <path d="M18 6.5 L22 12 L18 17.5"/>`,
  'Drift': `<path class="w1" d="M2.5 8 C5.5 5 8.5 11 11.5 8 C14.5 5 17.5 11 21.5 8"/> <path class="w2" d="M2.5 16 C5.5 13 8.5 19 11.5 16 C14.5 13 17.5 19 21.5 16"/>`,
  'Spark': `<path class="sp" d="M12 2.5 L13.8 9.4 L20.5 11.5 L13.8 13.6 L12 20.5 L10.2 13.6 L3.5 11.5 L10.2 9.4 Z"/>`,
};

export const SIGIL_CLASS = {
  'Enforcer': 'sg-enforcer',
  'Vandal': 'sg-vandal',
  'Hollow': 'sg-hollow',
  'Menace': 'sg-menace',
  'Phantom': 'sg-phantom',
  'Savage': 'sg-savage',
  'Grinder': 'sg-grinder',
  'Heavy': 'sg-heavy',
  'Stray': 'sg-stray',
  'Rebel': 'sg-rebel',
  'Drifter': 'sg-drifter',
  'Grit': 'sg-grit',
  'Zero': 'sg-zero',
  'God-Complex': 'sg-god',
  'Anti-Hero': 'sg-antihero',
  'Anomaly': 'sg-anomaly',
  'Havoc': 'sg-havoc',
  'Despair': 'sg-despair',
  'Malice': 'sg-malice',
  'Wrath': 'sg-wrath',
  'Executioner': 'sg-exec',
  'Nightfall': 'sg-nightfall',
  'Vengeance': 'sg-vengeance',
  'Untouchable': 'sg-untouchable',
  'Cataclysm': 'sg-cataclysm',
  'Ruin': 'sg-ruin',
  'Overkill': 'sg-overkill',
  'Vermin': 'sg-vermin',
  'Relentless': 'sg-relentless',
  'Sprout': 'sg-sprout',
  'Cinder': 'sg-cinder',
  'Pace': 'sg-pace',
  'Drift': 'sg-drift',
  'Spark': 'sg-spark',
};

export const FALLBACK = 'Relentless';
export const sigilFor = (name) => SIGILS[name] || SIGILS[FALLBACK];
export const sigilClass = (name) => SIGIL_CLASS[name] || SIGIL_CLASS[FALLBACK];
export const hasSigil = (name) => Boolean(SIGILS[name]);
