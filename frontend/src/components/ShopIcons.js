// v2 shop item icons — custom glowing SVGs replacing the old PNGs.
// cyan = utility/defense (shield, revive), lime = energy/gains (XP boost).
// Each scales to its container; glow via drop-shadow on the wrapper.

const CYAN = '#95DEE6', CYAN_HI = '#E4FBFE', CYAN_DK = '#12464D', CYAN_INK = '#08272C';
const LIME = '#DBF67F', LIME_HI = '#F6FFD6', LIME_DK = '#42571C', LIME_INK = '#20300A';

function Wrap({ children, glow, className, viewBox = '0 0 48 48' }) {
  return (
    <svg viewBox={viewBox} className={className} aria-hidden="true"
      style={{ filter: `drop-shadow(0 0 6px ${glow})`, overflow: 'visible' }}>
      {children}
    </svg>
  );
}

export function ShieldIcon({ className }) {
  return (
    <Wrap glow={`${CYAN}aa`} className={className}>
      <defs>
        <linearGradient id="si-sh" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CYAN_HI} /><stop offset="100%" stopColor={CYAN_DK} />
        </linearGradient>
      </defs>
      <path d="M24 4 L41 10 V23 C41 33.5 33.7 41.5 24 44.5 C14.3 41.5 7 33.5 7 23 V10 Z"
        fill="url(#si-sh)" stroke={CYAN} strokeWidth="2" strokeLinejoin="round" />
      <path d="M16.5 24 L21.5 29.5 L32 17.5" fill="none" stroke={CYAN_INK} strokeWidth="3.2"
        strokeLinecap="round" strokeLinejoin="round" />
    </Wrap>
  );
}

export function ReviveIcon({ className }) {
  // Hourglass with a glowing core — the streak-revive/time icon.
  return (
    <Wrap glow={`${CYAN}aa`} className={className}>
      <defs>
        <linearGradient id="ri-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CYAN_HI} /><stop offset="100%" stopColor={CYAN_DK} />
        </linearGradient>
      </defs>
      <path d="M13 6 H35" stroke={CYAN} strokeWidth="3" strokeLinecap="round" />
      <path d="M13 42 H35" stroke={CYAN} strokeWidth="3" strokeLinecap="round" />
      <path d="M15 7 C15 16 24 20 24 24 C24 28 15 32 15 41 L33 41 C33 32 24 28 24 24 C24 20 33 16 33 7 Z"
        fill="url(#ri-g)" stroke={CYAN} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="2.6" fill={CYAN_HI} />
    </Wrap>
  );
}

export function BoltIcon({ className }) {
  // XP boost — lightning, lime energy.
  return (
    <Wrap glow={`${LIME}bb`} className={className}>
      <defs>
        <linearGradient id="bi-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={LIME_HI} /><stop offset="100%" stopColor={LIME_DK} />
        </linearGradient>
      </defs>
      <path d="M27 3 L11 27 H21 L19 45 L37 19 H26 Z"
        fill="url(#bi-g)" stroke={LIME} strokeWidth="2" strokeLinejoin="round" />
    </Wrap>
  );
}

export function GemBoxIcon({ className }) {
  // Generic crystal — default fallback.
  return (
    <Wrap glow={`${CYAN}aa`} className={className}>
      <defs>
        <linearGradient id="gi-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CYAN_HI} /><stop offset="100%" stopColor={CYAN_DK} />
        </linearGradient>
      </defs>
      <path d="M24 4 L40 17 L24 44 L8 17 Z" fill="url(#gi-g)" stroke={CYAN} strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 17 H40 M24 4 L24 44 M16 17 L24 44 M32 17 L24 44" stroke={CYAN} strokeWidth="1.3" opacity="0.6" fill="none" />
    </Wrap>
  );
}

// Sparkle burst — used for effect/decoration previews.
export function SparkleIcon({ className }) {
  return (
    <Wrap glow={`${LIME}aa`} className={className}>
      <path d="M24 6 C25 16 27 18 37 19 C27 20 25 22 24 32 C23 22 21 20 11 19 C21 18 23 16 24 6 Z"
        fill={LIME_HI} stroke={LIME} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M37 30 C37.5 34 38 34.5 42 35 C38 35.5 37.5 36 37 40 C36.5 36 36 35.5 32 35 C36 34.5 36.5 34 37 30 Z"
        fill={CYAN_HI} stroke={CYAN} strokeWidth="1.2" strokeLinejoin="round" />
    </Wrap>
  );
}

// Resolve a boost item's key to its icon component.
export function ShopItemIcon({ itemKey = '', className }) {
  if (itemKey === 'streak_shield') return <ShieldIcon className={className} />;
  if (itemKey === 'streak_revive') return <ReviveIcon className={className} />;
  if (itemKey.startsWith('boost_xp_')) return <BoltIcon className={className} />;
  return <GemBoxIcon className={className} />;
}
