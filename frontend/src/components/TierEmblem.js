import { tierInfo } from '../data/leaderboardTiers';
import { emblemMarkup, lockedMarkup } from '../data/tierEmblemArt';

// League tier emblem — flat two-tone crest from data/tierEmblemArt.js (same
// "Facet" geometry as the app's icon set). `plate` adds a quiet tonal disc
// behind it for list rows; `current` thickens that disc's ring. `glow` is
// accepted for old call sites and ignored — there is no glow anywhere.
export default function TierEmblem({ tier, size = 56, locked = false, current = false, plate = true, className = '', glow }) { // eslint-disable-line no-unused-vars
  const info = tierInfo(tier);
  const art = locked ? lockedMarkup(info.n) : emblemMarkup(info.n, info);
  const inner = plate ? 0.74 : 1;
  const off = (100 - 100 * inner) / 2;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img"
      aria-label={locked ? 'Locked tier' : `${info.key} tier`} className={className}>
      {plate && (
        <circle cx="50" cy="50" r="48" fill={locked ? 'rgba(255,255,255,0.04)' : `${info.a}22`}
          stroke={current ? info.a : 'none'} strokeWidth={current ? 3 : 0} />
      )}
      <g transform={`translate(${off} ${off}) scale(${inner})`} dangerouslySetInnerHTML={{ __html: art }} />
    </svg>
  );
}
