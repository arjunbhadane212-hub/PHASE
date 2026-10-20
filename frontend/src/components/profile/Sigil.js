// Profile marks — the streak flame and the XP glyph.
//
// Both are clean 2px outline icons on a 24x24 grid (Phase's icon system),
// colour from the parent via currentColor. No fills, no glow. Rebuilt Oct 2026
// (profile remodel) after the old hand-drawn flame was rejected; the per-stage
// flame family is gone — one confident flame now serves every streak surface
// (hero, streak badge, stat tile). The XP mark is new: a faceted energy core
// with a bolt, so XP reads as its own thing instead of a generic target.

/* Streak flame. A bold filled duotone mark — vivid cyan body with a lime inner
   core so it reads ALIVE, not a pale outline. Accepts the old `stage`/`stroke`
   props so existing callers keep working (ignored). The `streak-flame-alive`
   class (added by the hero for live streaks) adds a flat flicker, no glow. */
export function FlameGlyph({ size = 18, className = '', style }) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"
      className={className} width={size} height={size} style={style}
    >
      <path
        d="M12 2C14 6 18 8 18 13A6 6 0 0 1 6 13C6 9.6 8.4 8 9.4 6.4C9.7 8.7 10.9 9 11.2 7.5C11.6 5.6 12 3.8 12 2Z"
        fill="#95DEE6"
      />
      <path
        d="M12 10.6C13.1 12.8 14.2 13.8 14.2 15.7A2.2 2.2 0 0 1 9.8 15.7C9.8 13.9 10.9 13 12 10.6Z"
        fill="#DBF67F"
      />
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
