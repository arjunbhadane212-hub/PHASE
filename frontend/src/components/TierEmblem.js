import { useId } from 'react';
import { tierInfo } from '../data/leaderboardTiers';

// Inject the glow-pulse keyframes once (self-contained; respects reduced motion).
if (typeof document !== 'undefined' && !document.getElementById('tier-emblem-kf')) {
  const s = document.createElement('style');
  s.id = 'tier-emblem-kf';
  s.textContent = `
    @keyframes tierGlowPulse {
      0%,100% { filter: drop-shadow(0 0 6px var(--tg)) drop-shadow(0 0 14px var(--tg2)); }
      50%     { filter: drop-shadow(0 0 10px var(--tg)) drop-shadow(0 0 22px var(--tg2)); }
    }
    .tier-emblem-glow { animation: tierGlowPulse 3.4s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) {
      .tier-emblem-glow { animation: none; filter: drop-shadow(0 0 8px var(--tg)); }
    }`;
  document.head.appendChild(s);
}

// Layered-SVG emblems, coloured per tier. `a` = primary, `b` = darker partner,
// `f`/`hi` reference gradient defs unique to this instance.
function emblemBody(em, a, b, f, hi) {
  switch (em) {
    case 'crown3': return (<>
      <path d="M20 66 L18 40 L34 54 L50 32 L66 54 L82 40 L80 66 Z" fill={f} stroke={b} strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="20" y="66" width="60" height="12" rx="3" fill={f} stroke={b} strokeWidth="1.5" />
      <path d="M22 41 L36 53 L50 34" fill="none" stroke={hi} strokeWidth="2" strokeLinecap="round" />
      <circle cx="18" cy="38" r="4" fill={a} /><circle cx="50" cy="30" r="4.5" fill={a} /><circle cx="82" cy="38" r="4" fill={a} />
      <circle cx="35" cy="72" r="3" fill={b} /><circle cx="50" cy="72" r="3" fill={b} /><circle cx="65" cy="72" r="3" fill={b} />
    </>);
    case 'crown3b': return (<>
      <path d="M20 64 L18 40 L34 52 L50 32 L66 52 L82 40 L80 64 Z" fill={f} stroke={b} strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="20" y="64" width="60" height="8" rx="2.5" fill={f} stroke={b} strokeWidth="1.3" />
      <rect x="20" y="73" width="60" height="7" rx="2.5" fill={b} opacity="0.85" />
      <path d="M22 41 L36 51 L50 34" fill="none" stroke={hi} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="18" cy="38" r="4" fill={a} /><circle cx="50" cy="30" r="4.5" fill={a} /><circle cx="82" cy="38" r="4" fill={a} />
    </>);
    case 'crown4': return (<>
      <path d="M16 64 L15 38 L30 50 L42 30 L58 30 L70 50 L85 38 L84 64 Z" fill={f} stroke={b} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M30 64 Q50 54 70 64" fill="none" stroke={b} strokeWidth="1.5" opacity="0.7" />
      <rect x="16" y="64" width="68" height="12" rx="3" fill={f} stroke={b} strokeWidth="1.5" />
      <path d="M18 40 L31 49 L42 32" fill="none" stroke={hi} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="15" cy="36" r="4" fill={a} /><circle cx="42" cy="28" r="4" fill="#ff5a6a" /><circle cx="58" cy="28" r="4" fill="#ff5a6a" /><circle cx="85" cy="36" r="4" fill={a} />
      <circle cx="50" cy="70" r="3.4" fill="#ff5a6a" />
    </>);
    case 'gemEmerald': return (<>
      <path d="M30 30 H70 L82 46 L50 82 L18 46 Z" fill={f} stroke={b} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M30 30 H70 L64 46 H36 Z" fill={hi} opacity="0.5" />
      <path d="M18 46 H82 M36 46 L50 82 M64 46 L50 82" fill="none" stroke={b} strokeWidth="1.3" opacity="0.7" />
      <path d="M36 46 H64 L50 62 Z" fill="#ffffff" opacity="0.18" />
      <circle cx="42" cy="39" r="1.6" fill="#fff" />
    </>);
    case 'gemRound': return (<>
      <circle cx="50" cy="54" r="26" fill={f} stroke={b} strokeWidth="1.5" />
      <path d="M50 28 L64 40 L74 54 L64 68 L50 80 L36 68 L26 54 L36 40 Z" fill="none" stroke={b} strokeWidth="1.2" opacity="0.65" />
      <circle cx="50" cy="54" r="11" fill="#ffffff" opacity="0.22" />
      <circle cx="50" cy="54" r="4.5" fill="#fff" opacity="0.9" />
      <g stroke={a} strokeWidth="2" strokeLinecap="round" opacity="0.55">
        <line x1="50" y1="20" x2="50" y2="12" /><line x1="80" y1="54" x2="88" y2="54" />
        <line x1="20" y1="54" x2="12" y2="54" /><line x1="50" y1="88" x2="50" y2="94" />
      </g>
    </>);
    case 'gemOrbital': return (<>
      <ellipse cx="50" cy="54" rx="34" ry="13" fill="none" stroke={b} strokeWidth="2" transform="rotate(-20 50 54)" opacity="0.8" />
      <path d="M50 34 L64 54 L50 74 L36 54 Z" fill={f} stroke={b} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M50 34 L57 54 L50 74 L43 54 Z" fill="#ffffff" opacity="0.2" />
      <circle cx="80" cy="46" r="3.5" fill={a} /><circle cx="20" cy="62" r="3" fill={a} />
    </>);
    case 'flame1': return (<>
      <path d="M50 20 C64 40 70 48 70 60 A20 20 0 1 1 30 60 C30 50 40 46 44 36 C48 46 44 54 52 56 C58 52 54 40 50 20 Z" fill={f} stroke={b} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M50 40 C58 52 60 56 60 62 A10 10 0 1 1 40 62 C40 56 46 54 50 40 Z" fill="#ffe9b0" opacity="0.9" />
    </>);
    case 'flame2': return (<>
      <path d="M30 58 C30 44 40 42 40 30 C48 42 46 52 40 64 Z" fill={b} />
      <path d="M70 58 C70 44 60 42 60 30 C52 42 54 52 60 64 Z" fill={b} />
      <path d="M50 18 C64 40 70 48 70 62 A20 20 0 1 1 30 62 C30 50 40 46 44 36 C48 46 44 54 52 56 C58 52 54 40 50 18 Z" fill={f} stroke={b} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M50 40 C58 52 60 56 60 62 A10 10 0 1 1 40 62 C40 56 46 54 50 40 Z" fill="#ffe0ea" opacity="0.9" />
    </>);
    case 'flameWing': return (<>
      <path d="M28 46 C14 44 8 52 10 60 C22 56 26 58 34 60 Z" fill={f} opacity="0.85" />
      <path d="M72 46 C86 44 92 52 90 60 C78 56 74 58 66 60 Z" fill={f} opacity="0.85" />
      <path d="M50 18 C64 40 70 48 70 62 A20 20 0 1 1 30 62 C30 50 40 46 44 36 C48 46 44 54 52 56 C58 52 54 40 50 18 Z" fill={f} stroke={b} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M50 40 C58 52 60 56 60 62 A10 10 0 1 1 40 62 C40 56 46 54 50 40 Z" fill="#ffd9ec" opacity="0.92" />
      <circle cx="20" cy="40" r="1.6" fill={a} /><circle cx="82" cy="42" r="1.6" fill={a} />
    </>);
    case 'crownGrand': return (<>
      <g stroke={a} strokeWidth="1.6" opacity="0.5" strokeLinecap="round">
        {Array.from({ length: 12 }).map((_, i) => {
          const ang = (i / 12) * Math.PI * 2;
          const x1 = 50 + Math.cos(ang) * 30, y1 = 50 + Math.sin(ang) * 30;
          const x2 = 50 + Math.cos(ang) * 40, y2 = 50 + Math.sin(ang) * 40;
          return <line key={i} x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={x2.toFixed(1)} y2={y2.toFixed(1)} />;
        })}
      </g>
      <path d="M18 64 L16 34 L30 46 L38 26 L50 40 L62 26 L70 46 L84 34 L82 64 Z" fill={f} stroke="#caa23a" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="18" y="64" width="64" height="8" rx="2.5" fill={f} stroke="#caa23a" strokeWidth="1.2" />
      <rect x="18" y="73" width="64" height="7" rx="2.5" fill="#a855ff" opacity="0.9" />
      <circle cx="16" cy="32" r="4" fill="#ffe08a" /><circle cx="38" cy="24" r="4" fill="#c9a3ff" />
      <circle cx="62" cy="24" r="4" fill="#c9a3ff" /><circle cx="84" cy="32" r="4" fill="#ffe08a" />
      <circle cx="50" cy="52" r="6" fill="#fff" opacity="0.9" /><circle cx="50" cy="52" r="9" fill="none" stroke="#fff" strokeWidth="1" opacity="0.5" />
    </>);
    default: return null;
  }
}

export default function TierEmblem({ tier, size = 56, glow = true, className = '' }) {
  const info = tierInfo(tier);
  const uid = useId().replace(/:/g, '');
  const gid = `tg-${uid}`;
  const f = `url(#${gid})`;
  const hi = `url(#${gid}h)`;
  return (
    <svg
      viewBox="0 0 100 100" width={size} height={size} role="img"
      aria-label={`${info.key} tier`}
      className={glow ? `tier-emblem-glow ${className}` : className}
      style={{ '--tg': info.a, '--tg2': info.b, overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={info.a} /><stop offset="1" stopColor={info.b} />
        </linearGradient>
        <linearGradient id={`${gid}h`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {emblemBody(info.em, info.a, info.b, f, hi)}
    </svg>
  );
}
