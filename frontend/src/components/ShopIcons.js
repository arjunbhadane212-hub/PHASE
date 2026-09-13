// v2 shop item icons — clean 2px outline set (CLAUDE icon system), single color
// via currentColor so they sit dark on solid cyan/lime badge tiles (Home feel).
// No gradients, no glow.

function Svg({ children, className }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" stroke="currentColor"
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export function ShieldIcon({ className }) {
  return (
    <Svg className={className}>
      <path d="M24 5 L40 11 V23 C40 33 33 41 24 44 C15 41 8 33 8 23 V11 Z" />
      <path d="M17 24 l5 5 l9 -11" />
    </Svg>
  );
}

export function ReviveIcon({ className }) {
  // Hourglass.
  return (
    <Svg className={className}>
      <path d="M14 6 H34" /><path d="M14 42 H34" />
      <path d="M16 6 C16 16 24 20 24 24 C24 28 16 32 16 42" />
      <path d="M32 6 C32 16 24 20 24 24 C24 28 32 32 32 42" />
    </Svg>
  );
}

export function BoltIcon({ className, level = 2 }) {
  // XP boost — escalates: x2 bare bolt, x3 adds a hex charge ring, x5 adds
  // radiating sparks. Single outline color.
  const ring = level >= 3;
  const rays = level >= 5;
  return (
    <Svg className={className}>
      {rays && (
        <g strokeWidth="2">
          <path d="M24 1.5 V5.5" /><path d="M24 42.5 V46.5" />
          <path d="M1.5 24 H5.5" /><path d="M42.5 24 H46.5" />
        </g>
      )}
      {ring && <polygon points="24,7 38,15.5 38,32.5 24,41 10,32.5 10,15.5" />}
      <path d="M26 9 L15 26 H22 L21 39 L33 22 H26 Z" />
    </Svg>
  );
}

export function GemBoxIcon({ className }) {
  return (
    <Svg className={className}>
      <path d="M24 5 L39 16 L24 43 L9 16 Z" />
      <path d="M9 16 H39 M16 16 L24 43 M32 16 L24 43" />
    </Svg>
  );
}

export function SparkleIcon({ className }) {
  return (
    <Svg className={className}>
      <path d="M24 6 C25 15 27 17 36 18 C27 19 25 21 24 30 C23 21 21 19 12 18 C21 17 23 15 24 6 Z" />
      <path d="M37 30 C37.4 33.5 37.6 33.8 41 34.2 C37.6 34.6 37.4 34.9 37 38.4 C36.6 34.9 36.4 34.6 33 34.2 C36.4 33.8 36.6 33.5 37 30 Z" />
    </Svg>
  );
}

// Resolve an item key to its icon.
export function ShopItemIcon({ itemKey = '', className }) {
  if (itemKey === 'streak_shield') return <ShieldIcon className={className} />;
  if (itemKey === 'streak_revive') return <ReviveIcon className={className} />;
  if (itemKey.startsWith('boost_xp_')) {
    const m = itemKey.match(/(\d+)x/);
    return <BoltIcon className={className} level={m ? parseInt(m[1], 10) : 2} />;
  }
  return <GemBoxIcon className={className} />;
}

// The tile color a boost item sits on (cyan = utility, lime = XP/energy).
export function shopItemTone(itemKey = '') {
  if (itemKey.startsWith('boost_xp_')) return { bg: '#DBF67F', ink: '#2A3B0B' };
  return { bg: '#95DEE6', ink: '#183A3F' };
}
