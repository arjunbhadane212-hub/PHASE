// Profile marks — the streak flame and the XP glyph.
//
// Both are clean 2px outline icons on a 24x24 grid (Phase's icon system),
// colour from the parent via currentColor. No fills, no glow. Rebuilt Oct 2026
// (profile remodel) after the old hand-drawn flame was rejected; the per-stage
// flame family is gone — one confident flame now serves every streak surface
// (hero, streak badge, stat tile). The XP mark is new: a faceted energy core
// with a bolt, so XP reads as its own thing instead of a generic target.

/* Streak flame. Accepts the old `stage`/`stroke` props so existing callers keep
   working, but renders one clean flame regardless of stage. */
export function FlameGlyph({ size = 18, stroke = 2, className = '', style }) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
      className={className} width={size} height={size} style={style} strokeWidth={stroke}
    >
      <path d="M12 2.8c.4 3.2 2.6 4.6 4 6.4 1.4 1.8 2 3.6 2 5.3a6 6 0 0 1-12 0c0-1.1.3-2.1.9-3 .2 1.3 1.2 1.9 2 1.5C7.4 11.9 9 9.6 9.4 7c1 1 1.9 1.4 2.3.6.5-1 .6-3 .3-4.8Z" />
      <path d="M12 14c1 1.3 1.9 2.1 1.9 3.5a1.9 1.9 0 0 1-3.8 0c0-1.1.9-1.9 1.9-3.5Z" />
    </svg>
  );
}

/* XP mark — hexagonal energy core + bolt. New custom glyph for XP counters. */
export function XpGlyph({ size = 18, stroke = 2, className = '', style }) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
      className={className} width={size} height={size} style={style} strokeWidth={stroke}
    >
      <path d="M12 2.6 20 7v10l-8 4.4L4 17V7Z" />
      <path d="M13.2 8 9.6 13h2.8l-1 3.9L15 11h-2.9Z" />
    </svg>
  );
}

export default FlameGlyph;
