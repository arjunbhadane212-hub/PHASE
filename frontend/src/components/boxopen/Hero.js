// Item art for the box opening. Each pull renders AS ITSELF -- the same art the
// profile and shop use -- instead of a generic placeholder:
//   title   -> its own glyph + accent surface (data/titleGlyphs.js)
//   banner  -> the redrawn banner art (components/banners/PhaseBanners.js)
//   anim/fx -> the flat MotionRing on a neutral avatar
//   boost   -> its shop icon on a solid tier tile
import { useEffect, useRef } from 'react';
import { User, Gem } from 'lucide-react';
import TitleGlyph, { accentFor } from '../../data/titleGlyphs';
import { PhaseBanner, BANNER_META } from '../banners/PhaseBanners';
import MotionRing from '../profile/MotionRing';
import { ShopItemIcon } from '../ShopIcons';

// Reveal tiers (shop_items.rarity). ink = readable text colour ON the tier colour.
export const TIER = {
  common:    { key: 'common',    color: '#9BA09C', ink: '#20242A', label: 'COMMON',    level: 0 },
  rare:      { key: 'rare',      color: '#95DEE6', ink: '#183A3F', label: 'RARE',      level: 1 },
  legendary: { key: 'legendary', color: '#DBF67F', ink: '#2A3B0B', label: 'LEGENDARY', level: 2 },
  mythic:    { key: 'mythic',    color: '#A59BCC', ink: '#231D3A', label: 'MYTHIC',    level: 3 },
};
export const tierOf = (t) => TIER[t] || TIER.common;

export function kindOf(item) {
  const c = item.category || '';
  const k = item.item_key || '';
  if (c === 'title') return 'title';
  if (c === 'banner') return 'banner';
  if (c === 'anim' || c === 'effect') return 'ring';
  if (c === 'boost' || k === 'streak_shield' || k === 'streak_revive' || k.startsWith('boost_xp_')) return 'boost';
  return 'generic';
}

// Banners are named in the art set (e.g. "Current"), not the DB row -- match the shop/profile.
export function displayName(item) {
  if (kindOf(item) === 'banner') {
    const m = BANNER_META.find((b) => b.key === item.item_key);
    if (m) return m.name;
  }
  return item.name;
}

export const KIND_LABEL = { title: 'TITLE', banner: 'BANNER', ring: 'PROFILE FX', boost: 'BOOST', generic: 'ITEM' };

// Draw-on for glyph strokes: normalise each path to length 1, then animate the dash.
const DRAW_CSS = `
.bo-draw path{stroke-dasharray:1;stroke-dashoffset:1;animation:bo-draw .8s cubic-bezier(.6,0,.2,1) .1s forwards}
@keyframes bo-draw{to{stroke-dashoffset:0}}
@media (prefers-reduced-motion: reduce){.bo-draw path{animation:none;stroke-dashoffset:0}}
`;

function DrawGlyph({ titleKey, size, strokeWidth = 2.4 }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.querySelectorAll('path').forEach((p) => p.setAttribute('pathLength', '1'));
  }, [titleKey]);
  return (
    <span ref={ref} className="bo-draw" style={{ display: 'inline-flex' }}>
      <style>{DRAW_CSS}</style>
      <TitleGlyph titleKey={titleKey} size={size} strokeWidth={strokeWidth} />
    </span>
  );
}

const FONT_DISPLAY = "'Archivo', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";

// ---------- the big hero (center stage) ----------
export function Hero({ item, scale = 1 }) {
  const kind = kindOf(item);
  const T = tierOf(item.tier);
  const name = displayName(item);

  if (kind === 'title') {
    const a = accentFor(item.item_key);
    return (
      <div style={{
        background: a.surface, color: a.ink, borderRadius: 24, padding: '30px 28px 24px',
        width: 'min(84vw, 340px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      }}>
        <DrawGlyph titleKey={item.item_key} size={96} />
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 28, letterSpacing: '-0.01em', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1 }}>
          {name}
        </div>
        <div style={{ height: 2, width: '100%', background: a.ink, opacity: 0.16 }} />
        <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 10, letterSpacing: '0.22em', opacity: 0.7 }}>TITLE</div>
      </div>
    );
  }

  if (kind === 'banner') {
    return (
      <div style={{ width: 'min(92vw, 460px)', aspectRatio: '375 / 160', borderRadius: 14, overflow: 'hidden', background: '#0B0D0F' }}>
        <PhaseBanner bannerKey={item.item_key} />
      </div>
    );
  }

  if (kind === 'ring') {
    return (
      <div style={{ position: 'relative', width: 168 * scale, height: 168 * scale }}>
        <div style={{ position: 'absolute', inset: 30 * scale, borderRadius: '50%', background: '#1F2123', display: 'grid', placeItems: 'center' }}>
          <User size={54 * scale} color="#9BA09C" strokeWidth={1.8} />
        </div>
        <MotionRing itemKey={item.item_key} />
      </div>
    );
  }

  if (kind === 'boost') {
    return (
      <div style={{ width: 168 * scale, height: 168 * scale, borderRadius: 32 * scale, background: T.color, color: T.ink, display: 'grid', placeItems: 'center' }}>
        <div style={{ width: 96 * scale, height: 96 * scale }}><ShopItemIcon itemKey={item.item_key} className="w-full h-full" /></div>
      </div>
    );
  }

  return (
    <div style={{ width: 168 * scale, height: 168 * scale, borderRadius: 32 * scale, background: T.color, color: T.ink, display: 'grid', placeItems: 'center' }}>
      <Gem size={72 * scale} strokeWidth={1.8} />
    </div>
  );
}

// ---------- compact art for the summary rows ----------
export function MiniArt({ item }) {
  const kind = kindOf(item);
  const T = tierOf(item.tier);
  if (kind === 'title') {
    const a = accentFor(item.item_key);
    return (
      <div style={{ width: 54, height: 54, borderRadius: 14, background: a.surface, color: a.ink, display: 'grid', placeItems: 'center', flex: 'none' }}>
        <TitleGlyph titleKey={item.item_key} size={30} strokeWidth={2.4} />
      </div>
    );
  }
  if (kind === 'banner') {
    return (
      <div style={{ width: 96, height: 41, borderRadius: 8, overflow: 'hidden', flex: 'none', background: '#0B0D0F' }}>
        <PhaseBanner bannerKey={item.item_key} />
      </div>
    );
  }
  if (kind === 'ring') {
    return (
      <div style={{ position: 'relative', width: 54, height: 54, flex: 'none' }}>
        <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', background: '#2E3235' }} />
        <MotionRing itemKey={item.item_key} />
      </div>
    );
  }
  return (
    <div style={{ width: 54, height: 54, borderRadius: 14, background: T.color, color: T.ink, display: 'grid', placeItems: 'center', flex: 'none' }}>
      {kind === 'boost' ? <ShopItemIcon itemKey={item.item_key} className="w-8 h-8" /> : <Gem size={26} strokeWidth={2} />}
    </div>
  );
}
