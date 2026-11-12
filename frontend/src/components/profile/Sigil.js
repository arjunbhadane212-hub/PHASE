// Profile marks — the streak flame and the XP mark, from the ONE icon set
// (components/icons). Kept as named wrappers so profile surfaces stay terse.
// `stage` is accepted for old callers and ignored: the streak tier is carried
// by colour/number on the surface, not by a different flame drawing.
import { FlameIcon, XpIcon } from '../icons';

export function FlameGlyph({ size = 18, className = '', style, stage, solid = true }) { // eslint-disable-line no-unused-vars
  const color = style?.color || '#95DEE6';
  return <FlameIcon size={size} className={className} style={style} color={color} variant={solid ? 'solid' : 'outline'} />;
}

export function XpGlyph({ size = 18, stroke = 2, className = '', style }) {
  return <XpIcon size={size} strokeWidth={stroke} className={className} style={style} />;
}

export default FlameGlyph;
