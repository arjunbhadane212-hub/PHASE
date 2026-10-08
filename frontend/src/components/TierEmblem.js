import { tierInfo } from '../data/leaderboardTiers';

// Flat, bold tier emblems — solid two/three-tone colour blocks with a crisp ink
// outline, sat on a tonal "medal" plate. Deliberately NO glow, NO gradients, NO
// sparkle/halo: per the team's direction, premium here comes from flat colour,
// structure and bold shape, not neon effects.

function lighten(hex, amt) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const m = (c) => Math.round(c + (255 - c) * amt).toString(16).padStart(2, '0');
  return `#${m(r)}${m(g)}${m(b)}`;
}
function darken(hex, amt) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const m = (c) => Math.round(c * (1 - amt)).toString(16).padStart(2, '0');
  return `#${m(r)}${m(g)}${m(b)}`;
}
function rgba(hex, a) {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}
const pts = (arr) => arr.map((p) => p.join(',')).join(' ');

// Per-family emblem on a 100x100 canvas. `main` lit tone (left), `shade` dark
// tone (right), `hi` light accent, `ink` outline — all flat.
function emblemBody(fam, t) {
  const main = t.a, shade = t.b, hi = lighten(t.a, 0.34), ink = darken(t.b, 0.45);
  switch (fam) {
    case 'crown': {
      const body = 'M22 67 L18 40 L33 51 L50 31 L67 51 L82 40 L78 67 Z';
      return (
        <>
          <path d={body} fill={main} />
          <path d="M50 31 L67 51 L82 40 L78 67 L50 67 Z" fill={shade} />
          <path d={body} fill="none" stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />
          <rect x="20" y="66" width="60" height="13" rx="3" fill={shade} />
          <rect x="20" y="66" width="30" height="13" rx="3" fill={main} />
          <rect x="20" y="66" width="60" height="13" rx="3" fill="none" stroke={ink} strokeWidth="2.2" />
          <circle cx="18" cy="39" r="4.6" fill={hi} stroke={ink} strokeWidth="1.8" />
          <circle cx="50" cy="30" r="5" fill={hi} stroke={ink} strokeWidth="1.8" />
          <circle cx="82" cy="39" r="4.6" fill={hi} stroke={ink} strokeWidth="1.8" />
        </>
      );
    }
    case 'gem': {
      if (t.n === 4) {
        // Platinum — hexagonal step gem
        const O = [[32, 24], [68, 24], [84, 44], [68, 80], [32, 80], [16, 44]];
        const tbl = [[40, 36], [60, 36], [66, 44], [34, 44]];
        return (
          <>
            <polygon points={pts(O)} fill={main} />
            <polygon points="50,24 84,44 68,80 50,80" fill={shade} />
            <polygon points={pts(tbl)} fill={hi} />
            <polygon points={pts(O)} fill="none" stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />
            <line x1="16" y1="44" x2="84" y2="44" stroke={ink} strokeWidth="1.6" />
            <line x1="40" y1="36" x2="34" y2="44" stroke={ink} strokeWidth="1.4" />
            <line x1="60" y1="36" x2="66" y2="44" stroke={ink} strokeWidth="1.4" />
          </>
        );
      }
      if (t.n === 5) {
        // Nova — classic brilliant, point down
        const O = [[26, 30], [74, 30], [86, 46], [50, 86], [14, 46]];
        return (
          <>
            <polygon points={pts(O)} fill={main} />
            <polygon points="50,30 74,30 86,46 50,86" fill={shade} />
            <polygon points="26,30 74,30 66,46 34,46" fill={hi} />
            <polygon points={pts(O)} fill="none" stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />
            <line x1="14" y1="46" x2="86" y2="46" stroke={ink} strokeWidth="1.6" />
            <line x1="34" y1="46" x2="50" y2="86" stroke={ink} strokeWidth="1.4" />
            <line x1="66" y1="46" x2="50" y2="86" stroke={ink} strokeWidth="1.4" />
            <line x1="26" y1="30" x2="34" y2="46" stroke={ink} strokeWidth="1.4" />
            <line x1="74" y1="30" x2="66" y2="46" stroke={ink} strokeWidth="1.4" />
          </>
        );
      }
      // Eclipse — marquise, pointed
      const O = [[50, 14], [80, 50], [50, 86], [20, 50]];
      return (
        <>
          <polygon points={pts(O)} fill={main} />
          <polygon points="50,14 80,50 50,86" fill={shade} />
          <polygon points="50,30 66,50 50,70 34,50" fill={hi} />
          <polygon points={pts(O)} fill="none" stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />
          <line x1="20" y1="50" x2="80" y2="50" stroke={ink} strokeWidth="1.5" />
        </>
      );
    }
    case 'flame': {
      const wings = t.n >= 9;
      const body = 'M50 16 C66 38 74 46 74 62 A24 24 0 1 1 26 62 C26 49 37 45 42 33 C46 45 42 55 52 56 C60 52 56 38 50 16 Z';
      return (
        <>
          {wings && (
            <>
              <path d="M30 52 C14 48 8 56 11 66 C22 60 26 60 34 60 Z" fill={shade} />
              <path d="M70 52 C86 48 92 56 89 66 C78 60 74 60 66 60 Z" fill={shade} />
            </>
          )}
          <path d={body} fill={main} />
          <path d="M50 16 C66 38 74 46 74 62 A24 24 0 0 1 50 86 Z" fill={shade} />
          <path d="M50 42 C58 54 61 58 61 65 A11 11 0 1 1 39 65 C39 57 45 55 50 42 Z" fill={hi} />
          <path d={body} fill="none" stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />
        </>
      );
    }
    case 'grand': {
      const body = 'M20 66 L16 36 L33 48 L42 27 L50 38 L58 27 L67 48 L84 36 L80 66 Z';
      return (
        <>
          <path d={body} fill={main} />
          <path d="M50 38 L58 27 L67 48 L84 36 L80 66 L50 66 Z" fill={shade} />
          <path d={body} fill="none" stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />
          <rect x="20" y="65" width="60" height="9" rx="2.5" fill={shade} />
          <rect x="20" y="74" width="60" height="8" rx="2.5" fill={main} />
          <rect x="20" y="65" width="60" height="17" rx="3" fill="none" stroke={ink} strokeWidth="2.2" />
          <circle cx="16" cy="35" r="4.6" fill={hi} stroke={ink} strokeWidth="1.8" />
          <circle cx="50" cy="36" r="5" fill={hi} stroke={ink} strokeWidth="1.8" />
          <circle cx="84" cy="35" r="4.6" fill={hi} stroke={ink} strokeWidth="1.8" />
          <circle cx="50" cy="54" r="5" fill={hi} stroke={ink} strokeWidth="1.8" />
        </>
      );
    }
    default:
      return null;
  }
}

// A locked emblem: the real silhouette in flat slate with a padlock.
function lockedBody(fam) {
  return (
    <>
      <g opacity="0.6">{emblemBody(fam, { n: 0, a: '#4a4f57', b: '#2a2e34' })}</g>
      <g transform="translate(50,55)">
        <rect x="-9" y="-1" width="18" height="14" rx="3.5" fill="#15181d" stroke="#434852" strokeWidth="2" />
        <path d="M-5 -1 V-5 A5 5 0 0 1 5 -5 V-1" fill="none" stroke="#434852" strokeWidth="2.2" />
      </g>
    </>
  );
}

// `glow` is kept for call-site compatibility but is intentionally a no-op now.
export default function TierEmblem({ tier, size = 56, locked = false, current = false, plate = true, className = '', glow }) { // eslint-disable-line no-unused-vars
  const info = tierInfo(tier);
  const plateFill = locked ? 'rgba(255,255,255,0.04)' : rgba(info.a, 0.16);
  const ring = locked ? '#3a3f45' : info.a;
  const ringW = current ? 3 : 2;

  return (
    <svg
      viewBox="0 0 100 100" width={size} height={size} role="img"
      aria-label={locked ? 'Locked tier' : `${info.key} tier`}
      className={className}
    >
      {plate && <circle cx="50" cy="50" r="47" fill={plateFill} stroke={ring} strokeWidth={ringW} />}
      {locked ? lockedBody(info.fam) : emblemBody(info.fam, info)}
    </svg>
  );
}
