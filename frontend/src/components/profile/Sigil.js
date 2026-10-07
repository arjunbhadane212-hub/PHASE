// The streak flame glyph.
//
// Was three glyph families (box-title sigils, streak flames, hours
// hourglasses) feeding the old title plates. Titles now carry their own
// per-title glyph set in data/titleGlyphs.js, so the sigil and hourglass
// families are gone along with the plates that used them. The flame stays
// because it is the STREAK counter's mark -- on the profile hero, the streak
// badge and the profile-panel stat tile -- which has nothing to do with titles.
//
// Convention: 24x24 design space via viewBox="-1 -1 26 26", no fill,
// stroke=currentColor, round caps/joins. Colour always comes from the parent.

import { flameFor } from '../../data/streakFlames';

/* Streak flame -- one of five stages. Replaces Lucide's <Flame> on the profile.
   `className` is where streak-flame-alive gets attached. */
export function FlameGlyph({ stage = 'ember', size = 18, stroke = 1.9, className = '', style }) {
  return (
    <svg
      viewBox="-1 -1 26 26" fill="none" stroke="currentColor"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
      className={className} width={size} height={size} style={style} strokeWidth={stroke}
    >
      <path d={flameFor(stage)} />
    </svg>
  );
}

export default FlameGlyph;
