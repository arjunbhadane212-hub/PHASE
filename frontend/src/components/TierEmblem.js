import { useId } from 'react';
import { tierInfo } from '../data/leaderboardTiers';

// Inject the glow-pulse keyframes once (self-contained; respects reduced motion).
if (typeof document !== 'undefined' && !document.getElementById('tier-emblem-kf')) {
  const s = document.createElement('style');
  s.id = 'tier-emblem-kf';
  s.textContent = `
    @keyframes tierGlowPulse {
      0%,100% { filter: drop-shadow(0 0 6px var(--tg)) drop-shadow(0 0 15px var(--tg2)); }
      50%     { filter: drop-shadow(0 0 11px var(--tg)) drop-shadow(0 0 26px var(--tg2)); }
    }
    .tier-emblem-glow { animation: tierGlowPulse 3.6s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) {
      .tier-emblem-glow { animation: none; filter: drop-shadow(0 0 8px var(--tg)); }
    }`;
  document.head.appendChild(s);
}

// Lighten a hex colour toward white by `amt` (0..1) — used for specular facets,
// rim light and the lit side of each gradient so the emblems read as volumes.
function lighten(hex, amt) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const m = (c) => Math.round(c + (255 - c) * amt).toString(16).padStart(2, '0');
  return `#${m(r)}${m(g)}${m(b)}`;
}

// Per-family emblem body. `ids` holds the per-instance gradient url() strings so
// multiple emblems on one screen never collide. Every family is drawn on a
// 100x100 canvas, centred roughly on (50,52), with its own silhouette.
function emblemBody(fam, t, ids) {
  const { body, sheen, gem } = ids;
  const a = t.a, b = t.b, lite = lighten(a, 0.5), liteSoft = lighten(a, 0.45);
  switch (fam) {
    case 'crown': {
      const ornate = t.n >= 3; // Gold earns an extra engraved arch on the band
      return (
        <>
          {t.n >= 2 && <path d="M26 70 Q50 60 74 70" fill="none" stroke={b} strokeWidth="1.4" opacity="0.5" />}
          <path d="M22 68 L19 40 Q19 37 22 39 L34 50 Q36 51 37 49 L48 31 Q50 28 52 31 L63 49 Q64 51 66 50 L78 39 Q81 37 81 40 L78 68 Z"
            fill={body} stroke={b} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M22 41 L35 50 L49 33" fill="none" stroke={sheen} strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
          <rect x="22" y="67" width="56" height="12" rx="4" fill={body} stroke={b} strokeWidth="1.5" />
          <rect x="24" y="69" width="52" height="3.4" rx="1.7" fill={sheen} opacity="0.7" />
          {ornate && <path d="M30 78 Q50 70 70 78" fill="none" stroke={liteSoft} strokeWidth="1.2" opacity="0.6" />}
          <circle cx="19" cy="38" r="4.4" fill={gem} stroke={b} strokeWidth="0.8" />
          <circle cx="50" cy="29" r="5" fill={gem} stroke={b} strokeWidth="0.8" />
          <circle cx="81" cy="38" r="4.4" fill={gem} stroke={b} strokeWidth="0.8" />
          <circle cx="17.6" cy="36.4" r="1.2" fill="#fff" opacity="0.9" />
          <circle cx="48.4" cy="27.2" r="1.4" fill="#fff" opacity="0.9" />
          <circle cx="79.6" cy="36.4" r="1.2" fill="#fff" opacity="0.9" />
          <circle cx="35" cy="73" r="2.4" fill={liteSoft} /><circle cx="50" cy="73" r="2.4" fill={liteSoft} /><circle cx="65" cy="73" r="2.4" fill={liteSoft} />
        </>
      );
    }
    case 'gem':
      return (
        <>
          <circle cx="50" cy="52" r="33" fill="none" stroke={b} strokeWidth="1.2" opacity="0.35" />
          <g opacity="0.55" stroke={lite} strokeWidth="2" strokeLinecap="round">
            <line x1="50" y1="12" x2="50" y2="19" /><line x1="50" y1="85" x2="50" y2="92" />
            <line x1="12" y1="52" x2="19" y2="52" /><line x1="81" y1="52" x2="88" y2="52" />
            <line x1="24" y1="26" x2="29" y2="31" /><line x1="76" y1="26" x2="71" y2="31" />
            <line x1="24" y1="78" x2="29" y2="73" /><line x1="76" y1="78" x2="71" y2="73" />
          </g>
          <path d="M34 34 H66 L80 50 L50 86 L20 50 Z" fill={body} stroke={b} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M34 34 H66 L72 50 H28 Z" fill={lite} opacity="0.55" />
          <path d="M20 50 H80 M28 50 L50 86 M72 50 L50 86 M34 34 L28 50 M66 34 L72 50" stroke={b} strokeWidth="1.1" opacity="0.5" fill="none" />
          <path d="M28 50 H72 L50 70 Z" fill="#ffffff" opacity="0.18" />
          <path d="M40 38 L47 38 L44 47 Z" fill="#fff" opacity="0.85" />
          <circle cx="43" cy="42" r="1.4" fill="#fff" />
        </>
      );
    case 'flame': {
      const wings = t.n >= 9; // Apex ascends on flame-wings
      return (
        <>
          {wings && (
            <>
              <path d="M30 50 C14 46 6 54 9 64 C20 58 25 60 34 60 C32 55 31 52 30 50 Z" fill={body} opacity="0.9" />
              <path d="M70 50 C86 46 94 54 91 64 C80 58 75 60 66 60 C68 55 69 52 70 50 Z" fill={body} opacity="0.9" />
              <path d="M30 50 C20 49 14 52 11 60" stroke={lite} strokeWidth="1" fill="none" opacity="0.6" />
              <path d="M70 50 C80 49 86 52 89 60" stroke={lite} strokeWidth="1" fill="none" opacity="0.6" />
            </>
          )}
          <path d="M50 16 C66 38 74 46 74 62 A24 24 0 1 1 26 62 C26 49 37 45 42 33 C46 45 42 55 52 56 C60 52 56 38 50 16 Z"
            fill={body} stroke={b} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M50 40 C59 53 62 58 62 65 A12 12 0 1 1 38 65 C38 57 45 55 50 40 Z" fill={lite} />
          <path d="M50 52 C55 60 57 63 57 67 A7 7 0 1 1 43 67 C43 62 47 60 50 52 Z" fill="#fff" opacity="0.85" />
        </>
      );
    }
    case 'grand': {
      const rayColor = lighten(a, 0.3);
      return (
        <>
          <g>
            {Array.from({ length: 16 }).map((_, i) => {
              const ang = (i / 16) * Math.PI * 2;
              const odd = i % 2;
              const r1 = 30, r2 = odd ? 44 : 38;
              return (
                <line key={i}
                  x1={(50 + Math.cos(ang) * r1).toFixed(1)} y1={(50 + Math.sin(ang) * r1).toFixed(1)}
                  x2={(50 + Math.cos(ang) * r2).toFixed(1)} y2={(50 + Math.sin(ang) * r2).toFixed(1)}
                  stroke={rayColor} strokeWidth={odd ? 1.1 : 2} strokeLinecap="round" opacity={odd ? 0.4 : 0.7} />
              );
            })}
          </g>
          <path d="M20 66 L16 34 Q16 31 19 33 L32 45 L41 25 Q42 22 44 25 L50 36 L56 25 Q58 22 59 25 L68 45 L81 33 Q84 31 84 34 L80 66 Z"
            fill={body} stroke={lighten(b, 0.1)} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M18 36 L33 46 L43 28" fill="none" stroke={sheen} strokeWidth="2.6" strokeLinecap="round" opacity="0.9" />
          <rect x="20" y="65" width="60" height="9" rx="3" fill={body} stroke={lighten(b, 0.1)} strokeWidth="1.4" />
          <rect x="20" y="75" width="60" height="7" rx="3" fill={b} />
          <rect x="22" y="76.4" width="56" height="2.4" rx="1.2" fill="#fff" opacity="0.35" />
          <circle cx="17" cy="32" r="4.6" fill={gem} /><circle cx="42.5" cy="26" r="4" fill="#fff" opacity="0.92" />
          <circle cx="57.5" cy="26" r="4" fill="#fff" opacity="0.92" /><circle cx="83" cy="32" r="4.6" fill={gem} />
          <circle cx="50" cy="53" r="7" fill="#fff" /><circle cx="50" cy="53" r="7" fill={gem} opacity="0.5" />
          <circle cx="47.6" cy="50.6" r="1.8" fill="#fff" />
          <circle cx="50" cy="53" r="11" fill="none" stroke="#fff" strokeWidth="1" opacity="0.45" />
        </>
      );
    }
    default:
      return null;
  }
}

// A locked emblem: the real silhouette, desaturated to slate, with a padlock —
// the Duolingo "keep grinding to reveal this" treatment.
function lockedBody(fam, ids) {
  return (
    <>
      <g opacity="0.5">{emblemBody(fam, { n: 0, a: '#515760', b: '#2a2e34' }, ids)}</g>
      <g transform="translate(50,55)">
        <rect x="-10" y="-2" width="20" height="16" rx="4" fill="#15181d" stroke="#434852" strokeWidth="1.4" />
        <path d="M-6 -2 V-6 A6 6 0 0 1 6 -6 V-2" fill="none" stroke="#434852" strokeWidth="2" />
        <circle cx="0" cy="5.5" r="2.2" fill="#7c828c" />
      </g>
    </>
  );
}

export default function TierEmblem({ tier, size = 56, glow = true, locked = false, className = '' }) {
  const info = tierInfo(tier);
  const uid = useId().replace(/:/g, '');
  const gid = `tg-${uid}`;
  const lite = lighten(info.a, 0.5);
  const ids = { body: `url(#${gid}b)`, sheen: `url(#${gid}s)`, gem: `url(#${gid}g)` };
  const doGlow = glow && !locked;

  return (
    <svg
      viewBox="0 0 100 100" width={size} height={size} role="img"
      aria-label={locked ? 'Locked tier' : `${info.key} tier`}
      className={doGlow ? `tier-emblem-glow ${className}` : className}
      style={{ '--tg': info.a, '--tg2': info.b, overflow: 'visible' }}
    >
      <defs>
        {/* Body: volumetric radial — lit top-left highlight → core hue → dark edge */}
        <radialGradient id={`${gid}b`} cx="42%" cy="34%" r="78%">
          <stop offset="0" stopColor={locked ? '#3a3f45' : lite} />
          <stop offset="0.5" stopColor={locked ? '#2a2e34' : info.a} />
          <stop offset="1" stopColor={locked ? '#1d2127' : info.b} />
        </radialGradient>
        {/* Sheen: top-down white fade for engraved specular streaks */}
        <linearGradient id={`${gid}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* Gem: tiny brilliant highlight for crown jewels / central stone.
            Goes slate when locked so a locked emblem never leaks its tier hue. */}
        <radialGradient id={`${gid}g`} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor={locked ? '#6b7079' : '#ffffff'} />
          <stop offset="0.45" stopColor={locked ? '#3a3f45' : lite} />
          <stop offset="1" stopColor={locked ? '#1d2127' : info.b} />
        </radialGradient>
      </defs>
      {locked ? lockedBody(info.fam, ids) : emblemBody(info.fam, info, ids)}
    </svg>
  );
}
