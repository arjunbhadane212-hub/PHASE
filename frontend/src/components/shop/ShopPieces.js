// Shop v3 building blocks: rarity chips, prices, previews, the countdown
// tiles, and the sealed card that flips open as it scrolls into view.
//
// Motion language is the box opening's (components/boxopen/fx.js): hard
// shutters, hit-stop, short solid flashes — no glow, blur, halo or shimmer.
import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useAnimation } from 'framer-motion';
import { GemIcon, Bookmark } from '../icons';
import TitlePlate from '../profile/TitlePlate';
import MotionRing from '../profile/MotionRing';
import { PhaseBanner } from '../banners/PhaseBanners';
import { soundEngine } from '../../utils/SoundEngine';
import { RARITY, rarityOf, tierRank, fmt, CATEGORY_COPY } from './shopModel';

export const CARD = 'rounded-2xl bg-[color:var(--gm-card)] shadow-[var(--gm-shadow-card)]';
export const MONO = "font-label uppercase tracking-[0.08em]";

export function usePrefersCalm() {
  const [calm] = useState(() => {
    try { return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  });
  return calm;
}

export function RarityChip({ tier, className = '' }) {
  const r = rarityOf(tier);
  return (
    <span className={`${MONO} inline-flex items-center text-[11px] font-bold px-1.5 py-[3px] rounded-md leading-none ${className}`}
      style={{ background: r.bg, color: r.ink }}>
      {r.label}
    </span>
  );
}

export function Price({ value, was, ink, size = 'sm' }) {
  const color = ink || 'var(--gm-ink)';
  return (
    <span className="inline-flex items-center gap-1.5">
      <GemIcon size={size === 'lg' ? 16 : 13} style={{ color: ink || '#D4F36B' }} />
      <span className={`font-display font-black tabular-nums ${size === 'lg' ? 'text-lg' : 'text-sm'}`} style={{ color }}>{fmt(value)}</span>
      {was != null && <span className="text-[13px] line-through opacity-60" style={{ color }}>{fmt(was)}</span>}
    </span>
  );
}

export function ItemPreview({ item, height = 76, ring = 52 }) {
  if (item.category === 'title') {
    return (
      <div className="w-full flex items-center justify-center bg-[color:var(--gm-bg)] px-2 overflow-hidden" style={{ height }}>
        <TitlePlate titleKey={item.key} name={item.name} tier={item.tier} size={height > 100 ? 'lg' : 'sm'} />
      </div>
    );
  }
  if (item.category === 'banner') {
    return <div className="w-full overflow-hidden bg-[color:var(--gm-bg)]" style={{ height }}><PhaseBanner bannerKey={item.key} /></div>;
  }
  return (
    // Motion rings are drawn in white / lime / sky — give them a dark stage in
    // BOTH themes so they read on the light UI v3 paper too.
    <div className="w-full flex items-center justify-center" style={{ height, background: '#141416' }}>
      <div className="relative rounded-full" style={{ width: ring, height: ring, background: '#26262A' }}>
        <MotionRing itemKey={item.key} />
      </div>
    </div>
  );
}

// "First drop" / "Back after 23d" / deal / wishlist markers on a preview.
export function Badges({ item }) {
  const tags = [];
  if (item.dealPrice != null && !item.owned) tags.push({ k: 'deal', text: '−30%', bg: '#D4F36B', ink: '#2B3A06' });
  if (item.history?.kind === 'first') tags.push({ k: 'first', text: 'First drop', bg: '#F4F5F2', ink: '#0E1012' });
  if (item.history?.kind === 'back') tags.push({ k: 'back', text: item.history.text, bg: '#F4F5F2', ink: '#0E1012' });
  return (
    <>
      {tags.length > 0 && (
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1 pointer-events-none">
          {tags.map((t) => (
            <span key={t.k} className={`${MONO} text-[10.5px] font-bold px-1.5 py-[3px] rounded leading-none`} style={{ background: t.bg, color: t.ink }}>{t.text}</span>
          ))}
        </div>
      )}
      {item.wish && !item.owned && (
        <span className="absolute top-2 right-2 w-5 h-5 rounded-md bg-[#D4F36B] text-[#2B3A06] flex items-center justify-center pointer-events-none" aria-label="On your wishlist">
          <Bookmark size={11} strokeWidth={2.6} />
        </span>
      )}
    </>
  );
}

// Flat digit tiles for the restock clock. The changing tile drops in from
// above (a split-flap without the skeuomorphism).
export function ClockTiles({ ms, tone = 'card', compactDays = false }) {
  if (ms == null) return null;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const parts = compactDays && d > 0
    ? [[String(d), 'D'], [String(Math.floor((s % 86400) / 3600)).padStart(2, '0'), 'H'], [String(Math.floor((s % 3600) / 60)).padStart(2, '0'), 'M']]
    : [[String(Math.floor(s / 3600)).padStart(2, '0'), 'H'], [String(Math.floor((s % 3600) / 60)).padStart(2, '0'), 'M'], [String(s % 60).padStart(2, '0'), 'S']];
  const bg = tone === 'onPurple' ? 'rgba(128,128,128,0.18)' : 'var(--gm-card)';
  const ink = tone === 'onPurple' ? 'var(--gm-bg)' : 'var(--gm-ink)';
  return (
    <span className="inline-flex items-center gap-1" aria-label={parts.map(([v, u]) => v + u).join(' ')}>
      {parts.map(([v, u]) => (
        <span key={u} className="inline-flex items-baseline gap-[2px]">
          <span className="relative inline-flex items-center justify-center h-7 min-w-[30px] px-1 rounded-md overflow-hidden" style={{ background: bg }}>
            <motion.span key={v} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.18, ease: 'easeOut' }}
              className="font-display font-black text-[17px] tabular-nums" style={{ color: ink }}>{v}</motion.span>
          </span>
          <span className={`${MONO} text-[11px] font-bold`} style={{ color: tone === 'onPurple' ? 'var(--gm-bg)' : 'var(--gm-muted)' }}>{u}</span>
        </span>
      ))}
    </span>
  );
}

export function SectionHeader({ id, title, blurb, meta, refFn, eyebrow }) {
  return (
    <div ref={refFn} data-section={id} className="scroll-mt-28 mb-3">
      {eyebrow && <p className={`${MONO} text-[12px] font-bold text-[color:var(--gm-muted)] mb-1`}>{eyebrow}</p>}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display font-extrabold text-[23px] text-[color:var(--gm-ink)] tracking-[-0.01em] leading-none">{title}</h2>
          {blurb && <p className="text-xs text-[color:var(--gm-muted)] mt-1.5">{blurb}</p>}
        </div>
        {meta && <span className={`${MONO} text-[12px] text-[color:var(--gm-muted)] flex-none tabular-nums`}>{meta}</span>}
      </div>
      <motion.div className="h-[3px] mt-3 rounded-full bg-[color:var(--gm-ink)] origin-left" style={{ width: 28 }}
        initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.4, ease: [0.7, 0, 0.3, 1] }} />
    </div>
  );
}

// The face-down state: a dark plate, a big "?", and a rarity strip whose
// HEIGHT says how good the pull is before you see it.
const STRIP_H = { common: 3, rare: 5, epic: 9, legendary: 22, mythic: 22 };
function SealCover({ item }) {
  const r = rarityOf(item.tier);
  const tall = tierRank(item.tier) >= 3;
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: 'var(--gm-badge)' }}>
      <div className="flex-1 flex flex-col items-center justify-center gap-1"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 7px, rgba(255,255,255,0.025) 7px 8px)' }}>
        <span className="font-display font-black text-[30px] leading-none text-[color:var(--gm-muted)] opacity-70">?</span>
        <span className={`${MONO} text-[11px] font-bold text-[color:var(--gm-muted)]`}>{CATEGORY_COPY[item.category]?.one}</span>
      </div>
      <div className="flex items-center justify-center" style={{ height: STRIP_H[item.tier] || 3, background: item.tier === 'common' ? 'var(--gm-track)' : r.bg }}>
        {tall && <span className={`${MONO} text-[11px] font-black`} style={{ color: r.ink }}>{r.label}</span>}
      </div>
    </div>
  );
}

// One shop card. `sealed` cards open themselves when they scroll into view
// (staggered by `order`), or instantly on tap.
export function ShopCard({ item, gems, onOpen, sealed = false, onReveal, order = 0, layout = 'md', calm = false, eyebrow = null }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-12% 0px -12% 0px' });
  const [open, setOpen] = useState(!sealed);
  const [flash, setFlash] = useState(false);
  const hit = useAnimation();
  const r = rarityOf(item.tier);
  const rank = tierRank(item.tier);

  const reveal = () => {
    if (open) return;
    setOpen(true);
    onReveal?.(item.id);
    if (rank >= 1) soundEngine.reveal(rank >= 4 ? 'mythic' : rank >= 3 ? 'legendary' : 'rare');
    else soundEngine.boxTap(1);
    if (calm) return;
    if (rank >= 2) {
      setFlash(true);
      setTimeout(() => setFlash(false), 240);
      hit.start({ scale: [1, 0.95, 1.03, 1], transition: { duration: 0.38, times: [0, 0.25, 0.6, 1] } });
    }
  };

  // Parent said "reveal all" (or another copy of this item opened): open quietly.
  useEffect(() => { if (!sealed && !open) setOpen(true); }, [sealed, open]);

  useEffect(() => {
    if (!sealed || open || !inView) return undefined;
    const t = setTimeout(reveal, 260 + order * 240);
    return () => clearTimeout(t);
    // reveal only reads stable refs + item; re-running on its identity would retrigger timers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sealed, open, inView, order]);

  const price = item.dealPrice ?? item.price;
  const short = !item.owned && (gems ?? 0) < price;
  const solid = r.solid;
  const hero = layout === 'hero';
  const h = hero ? 150 : layout === 'wide' ? 92 : layout === 'sm' ? 70 : 78;

  return (
    <motion.div ref={ref} animate={hit} className="relative"
      initial={sealed ? false : { opacity: 0, y: 22 }} whileInView={sealed ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-6% 0px' }} transition={{ duration: 0.35, delay: Math.min(order, 5) * 0.06, ease: 'easeOut' }}>
      <button type="button" onClick={() => (open ? onOpen(item) : reveal())}
        className={`${CARD} relative w-full overflow-hidden text-left flex flex-col transition-transform active:scale-[0.98]`}
        data-testid={`shop-item-${item.key}`} aria-label={open ? item.name : `Sealed ${rarityOf(item.tier).label} item — tap to reveal`}>
        <div style={{ height: 3, background: item.tier === 'common' ? 'var(--gm-track)' : r.bg }} />
        <div className="relative">
          <ItemPreview item={item} height={h} ring={hero ? 96 : layout === 'sm' ? 44 : 52} />
          {open && <Badges item={item} />}
        </div>
        <div className={`${hero ? 'px-3.5 pt-3 pb-3.5' : 'px-2.5 pt-2 pb-2.5'} min-w-0 flex-1 flex flex-col`} style={solid ? { background: r.bg } : undefined}>
          <span className={`${MONO} text-[11px] font-bold leading-none`} style={{ color: solid ? r.ink : r.text }}>{eyebrow || r.label}</span>
          {hero
            ? <p className="font-display font-black text-[26px] leading-none tracking-[-0.02em] truncate mt-1.5" style={{ color: solid ? r.ink : 'var(--gm-ink)' }}>{item.name}</p>
            : <p className={`font-sans font-bold ${layout === 'sm' ? 'text-[14px]' : 'text-[15px]'} truncate mt-1`} style={{ color: solid ? r.ink : 'var(--gm-ink)' }}>{item.name}</p>}
          <div className={`${hero ? 'mt-2' : 'mt-1'} h-5 flex items-center`}>
            {item.equipped ? <span className={`${MONO} text-[12px] font-bold`} style={{ color: solid ? r.ink : 'var(--gm-ink)' }}>Equipped</span>
              : item.owned ? <span className={`${MONO} text-[12px] font-bold`} style={{ color: solid ? r.ink : 'var(--gm-muted)' }}>Owned</span>
                : <span className={short ? 'opacity-50' : ''}><Price value={price} was={item.dealPrice != null ? item.price : null} ink={solid ? r.ink : undefined} /></span>}
          </div>
        </div>
        {/* face-down cover lifts like a shutter */}
        <motion.div className="absolute inset-0 z-10 pointer-events-none" initial={false}
          animate={open ? { y: '-102%' } : { y: '0%' }} transition={{ duration: calm ? 0 : 0.42, ease: [0.7, 0, 0.3, 1] }}>
          <SealCover item={item} />
        </motion.div>
        {flash && <div className="absolute inset-0 z-20 pointer-events-none" style={{ background: r.bg, opacity: 0.9 }} />}
      </button>
    </motion.div>
  );
}

export { RARITY };
