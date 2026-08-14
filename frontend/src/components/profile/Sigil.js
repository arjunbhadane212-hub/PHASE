// The three outline glyph families the title/streak system draws from.
//
// All three share one convention: a 24×24 design space rendered through
// viewBox="-1 -1 26 26", fill="none", stroke="currentColor", round caps and
// joins. Colour always comes from the parent — never from the glyph — so the
// same mark can sit on a Delta plate, a Phase plate or a streak hero without
// being redrawn.

import { sigilFor, sigilClass } from '../../data/titleSigils';
import { flameFor } from '../../data/streakFlames';
import { hourglassFor } from '../../data/hourglassStages';

const BASE = {
  viewBox: '-1 -1 26 26',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false',
};

/* Box-title sigil. `dangerouslySetInnerHTML` is safe here — the markup is
   static, compile-time, from our own source, and never touches user input. */
export function Sigil({ name, size = 18, stroke = 1.8, className = '', style }) {
  return (
    <svg
      {...BASE}
      className={`sg ${sigilClass(name)} ${className}`.trim()}
      width={size}
      height={size}
      style={style}
      strokeWidth={stroke}
      dangerouslySetInnerHTML={{ __html: sigilFor(name) }}
    />
  );
}

/* Streak flame — one of five stages. Replaces Lucide's <Flame> everywhere on
   the profile. `className` is where streak-flame-alive gets attached. */
export function FlameGlyph({ stage = 'ember', size = 18, stroke = 1.9, className = '', style }) {
  return (
    <svg {...BASE} className={className} width={size} height={size} style={style} strokeWidth={stroke}>
      <path d={flameFor(stage)} />
    </svg>
  );
}

/* Hours hourglass — one of five stages, sand accumulating with rarity. */
export function HourglassGlyph({ tier = 'common', size = 18, stroke = 1.7, className = '', style }) {
  return (
    <svg {...BASE} className={className} width={size} height={size} style={style} strokeWidth={stroke}>
      <path d={hourglassFor(tier)} />
    </svg>
  );
}

export default Sigil;
