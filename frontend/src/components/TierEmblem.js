import { tierInfo } from '../data/leaderboardTiers';
import { Crown } from '@phosphor-icons/react/dist/csr/Crown';
import { Diamond } from '@phosphor-icons/react/dist/csr/Diamond';
import { Fire } from '@phosphor-icons/react/dist/csr/Fire';
import { Trophy } from '@phosphor-icons/react/dist/csr/Trophy';
import { LockSimple } from '@phosphor-icons/react/dist/csr/LockSimple';

// UI v3 league emblem — flat badge, no glow, readable at any size.
//   shape   = family   (circle → hexagon → shield → star badge as you climb)
//   glyph   = family   (crown · gem · flame · trophy)
//   pips    = step inside the family (1–3), so Bronze/Silver/Gold differ by more than colour
const SHAPES = {
  crown: <circle cx="50" cy="50" r="44" />,
  gem: <polygon points="50,7 89,29 89,71 50,93 11,71 11,29" strokeLinejoin="round" />,
  flame: <path d="M50 6 L88 19 V49 C88 71 72 86 50 95 C28 86 12 71 12 49 V19 Z" strokeLinejoin="round" />,
  grand: (() => {
    const pts = [];
    for (let i = 0; i < 24; i++) {
      const r = i % 2 === 0 ? 47 : 40;
      const t = (Math.PI * 2 * i) / 24 - Math.PI / 2;
      pts.push(`${(50 + r * Math.cos(t)).toFixed(1)},${(50 + r * Math.sin(t)).toFixed(1)}`);
    }
    return <polygon points={pts.join(' ')} strokeLinejoin="round" />;
  })(),
};
const GLYPH = { crown: Crown, gem: Diamond, flame: Fire, grand: Trophy };

export default function TierEmblem({ tier, size = 56, locked = false, current = false, className = '', plate, glow }) { // eslint-disable-line no-unused-vars
  const info = tierInfo(tier);
  const fam = info.fam;
  const step = fam === 'grand' ? 0 : ((info.n - 1) % 3) + 1;
  const fill = locked ? 'var(--gm-badge)' : info.a;
  const ink = locked ? 'var(--gm-muted)' : info.ink;
  const Glyph = locked ? LockSimple : GLYPH[fam];
  return (
    <span className={`relative inline-flex items-center justify-center flex-none ${className}`}
      style={{ width: size, height: size }} role="img" aria-label={locked ? 'Locked tier' : `${info.key} tier`}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="absolute inset-0" style={{ overflow: "visible" }}>
        <g fill={fill} stroke={fill} strokeWidth="8">{SHAPES[fam]}</g>
        {/* inner keyline gives it a crafted, minted feel without glow */}
        <g fill="none" stroke={ink} strokeOpacity={locked ? 0.25 : 0.18} strokeWidth="3" transform="translate(50 50) scale(0.8) translate(-50 -50)">{SHAPES[fam]}</g>
        {current && !locked && <g fill="none" stroke="var(--gm-ink)" strokeWidth="4" transform="translate(50 50) scale(1.08) translate(-50 -50)">{SHAPES[fam]}</g>}
      </svg>
      <Glyph size={size * 0.4} weight="fill" color={ink} style={{ position: 'relative', marginTop: step && !locked ? -size * 0.07 : 0 }} />
      {!locked && step > 0 && (
        <span className="absolute flex gap-[2px]" style={{ bottom: size * 0.2 }}>
          {Array.from({ length: step }).map((_, i) => (
            <span key={i} className="rounded-full" style={{ width: Math.max(3, size * 0.07), height: Math.max(3, size * 0.07), background: ink }} />
          ))}
        </span>
      )}
    </span>
  );
}
