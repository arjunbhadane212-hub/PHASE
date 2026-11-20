// Shop v3 — the page body, presentational only. Rendered by pages/ShopPage
// (live Supabase data) and pages/DevShopPage (fixture data, /dev/shop).
//
// Top to bottom:
//   Hero       Drop number, "Shop", restock clock tiles, gem balance
//   Wishlist   lime strip when a wishlisted item is in stock
//   Collection owned/total across the whole Index (tap → Index)
//   Today      featured piece (sealed until revealed) + daily deal
//   Sanctum    weekly mythic + legendary, the only place mythics are sold
//   Boxes      Starter / Delta / Phase (unchanged component)
//   Shelves    Titles · Banners · Animations · Effects — cards arrive SEALED
//              on the first visit of a drop and flip as they scroll in
//   Essentials boosts, Shield, Revive
//   How it works  live odds + earn table
//
// UI v3 organisation (Nov 2026): the page is no longer one long stack. "Today"
// is the shop home (drop + colourful Browse tiles); every other section opens
// on its own — the tile grows into that section's header (shared layoutId),
// tabs slide between sections, and Back steps one level up.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GemIcon, FlameIcon, ChevronRight, Bookmark, ArrowLeft, BoxIcon, TitleIcon, BannerIcon, MotionIcon, SparkleIcon, ShieldIcon, CrownIcon } from '../icons';
import BackButton from '../BackButton';
import { EASE, SPRING, swapVariants, fadeUp, staggerParent } from '../../lib/motion';
import { ShopItemIcon, shopItemTone } from '../ShopIcons';
import MysteryBoxesHeader from '../MysteryBoxesHeader';
import { CARD, MONO, ShopCard, SectionHeader, ClockTiles, Price, usePrefersCalm } from './ShopPieces';
import { CATEGORY_COPY, ROTATING, RARITY, fmt } from './shopModel';

const NAV = [
  { id: 'today', label: 'Today' },
  { id: 'vault', label: 'Sanctum' },
  { id: 'boxes', label: 'Boxes' },
  { id: 'title', label: 'Titles' },
  { id: 'banner', label: 'Banners' },
  { id: 'anim', label: 'Animations' },
  { id: 'effect', label: 'Effects' },
  { id: 'essentials', label: 'Essentials' },
];

const TONE = {
  ink:   { bg: 'var(--gm-ink)', ink: 'var(--gm-bg)' },
  lime:  { bg: '#D4F36B', ink: '#2B3A06' },
  sun:   { bg: '#FFD25E', ink: '#4A3500' },
  sky:   { bg: '#9DD3F7', ink: '#0B2E45' },
  coral: { bg: '#FF9F82', ink: '#4D1A0B' },
  pink:  { bg: '#F6B3CE', ink: '#4B1530' },
  card:  { bg: 'var(--gm-card)', ink: 'var(--gm-ink)' },
};
const SECTION = {
  vault:      { label: 'The Sanctum', blurb: 'Mythics are only ever sold here — one a week.', Icon: CrownIcon, t: TONE.ink },
  boxes:      { label: 'Mystery boxes', blurb: 'Always in stock. Duplicates turn into gems.', Icon: BoxIcon, t: TONE.lime },
  title:      { label: 'Titles', blurb: 'Worn on your profile and in the league.', Icon: TitleIcon, t: TONE.sun },
  banner:     { label: 'Banners', blurb: 'The header everyone sees on your profile.', Icon: BannerIcon, t: TONE.sky },
  anim:       { label: 'Animations', blurb: 'Motion around your avatar.', Icon: MotionIcon, t: TONE.coral },
  effect:     { label: 'Effects', blurb: 'A ring effect for your public profile.', Icon: SparkleIcon, t: TONE.pink },
  essentials: { label: 'Essentials', blurb: 'Boosts, shields and revives. Always in stock.', Icon: ShieldIcon, t: TONE.card },
};

const SHELF = {
  title: { grid: 'grid-cols-2 sm:grid-cols-4', layout: 'md' },
  banner: { grid: 'grid-cols-1 sm:grid-cols-3', layout: 'wide' },
  anim: { grid: 'grid-cols-3', layout: 'sm' },
  effect: { grid: 'grid-cols-3', layout: 'sm' },
};

function Essentials({ items, gems, buying, onBuy, onActivate, activeMultiplier, shields, revives }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5" data-testid="powerups-grid">
      {items.map((item, i) => {
        const tone = shopItemTone(item.key);
        const busy = buying === item.id;
        const canAfford = (gems ?? 0) >= item.price;
        const have = item.key === 'streak_shield' ? shields : item.key === 'streak_revive' ? revives : 0;
        const isActive = item.isXpBoost && item.multiplier > 1 && activeMultiplier === item.multiplier;
        const full = !item.isXpBoost && have >= item.max;
        const sub = item.isXpBoost ? `${item.multiplier || 2}× XP for 24h`
          : item.key === 'streak_shield' ? `Covers a missed day · ${have}/${item.max}`
            : `Restores a broken streak · ${have}/${item.max}`;
        const disabled = busy || isActive || full || !canAfford;
        return (
          <motion.button key={item.id} type="button" disabled={disabled}
            initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: i * 0.05 }}
            onClick={() => (item.isXpBoost ? onActivate(item) : onBuy(item))}
            className={`${CARD} p-3 text-left flex flex-col gap-2.5`} data-testid={`shop-item-${item.key}`}>
            <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: tone.bg, color: tone.ink }}>
              <ShopItemIcon itemKey={item.key} size={22} />
            </span>
            <span>
              <span className="block font-sans font-bold text-[15px] text-[color:var(--gm-ink)]">{item.name}</span>
              <span className="block text-[13px] text-[color:var(--gm-muted)] mt-0.5">{sub}</span>
            </span>
            <span className="mt-auto h-5 flex items-center">
              {busy ? <span className={`${MONO} text-[12px] text-[color:var(--gm-muted)]`}>Working…</span>
                : isActive ? <span className={`${MONO} text-[12px] font-bold text-[color:var(--gm-ink)]`}>Active now</span>
                  : full ? <span className={`${MONO} text-[12px] text-[color:var(--gm-muted)]`}>Maxed</span>
                    : <span className={canAfford ? '' : 'opacity-50'}><Price value={item.price} /></span>}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

function OddsBar({ odds }) {
  const tiers = ['common', 'rare', 'epic', 'legendary'];
  return (
    <div>
      <div className="flex h-2.5 rounded-full overflow-hidden">
        {tiers.map((t) => <div key={t} style={{ width: `${odds[t]}%`, background: t === 'common' ? 'var(--gm-track)' : RARITY[t].bg }} />)}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {tiers.map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: t === 'common' ? 'var(--gm-track)' : RARITY[t].bg }} />
            <span className={`${MONO} text-[12px] font-bold text-[color:var(--gm-muted)] tabular-nums`}>{RARITY[t].label} {odds[t]}%</span>
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: RARITY.mythic.bg }} />
          <span className={`${MONO} text-[12px] font-bold text-[color:var(--gm-muted)]`}>Mythic · Sanctum only</span>
        </span>
      </div>
    </div>
  );
}

export default function ShopView({
  model, gems, loading, loadError, onRetry,
  remainingMs, vaultRemainingMs,
  isSealed, onReveal, onRevealAll, sealedCount = 0,
  onOpenItem, onOpenCatalog, boxes, onOpenBox,
  essentials, buying, onBuyEssential, onActivateBoost, activeMultiplier, shields, revives,
  earnedLine, onEarnedTitles,
}) {
  const calm = usePrefersCalm();
  const navigate = useNavigate();
  const [active, setActive] = useState('today');
  const [dir, setDir] = useState(0);

  const nav = NAV.filter((n) => n.id !== 'vault' || (model?.vault.length ?? 0) > 0);
  const jump = (id) => {
    if (id === active) return;
    const from = nav.findIndex((x) => x.id === active);
    const to = nav.findIndex((x) => x.id === id);
    // home <-> section = zoom (0); section <-> section = slide in tab order
    setDir(active === 'today' || id === 'today' ? 0 : (to > from ? 1 : -1));
    window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
    setActive(id);
  };

  // Shelf reveal order: within the page, each shelf climbs worst → best.
  const shelfOrder = useMemo(() => {
    const out = {};
    ROTATING.forEach((c) => {
      (model?.shelves[c] || []).slice().sort((a, b) => RARITY_RANK[a.tier] - RARITY_RANK[b.tier]).forEach((it, i) => { out[`${c}:${it.id}`] = i; });
    });
    return out;
  }, [model]);

  const dropLabel = model?.dropNumber != null ? `Drop #${String(model.dropNumber).padStart(3, '0')}` : 'Today\'s drop';
  const col = model?.collection || { have: 0, total: 0 };
  const colPct = col.total ? (col.have / col.total) * 100 : 0;
  const mythic = model?.vault.find((v) => v.vaultSlot === 'mythic') || model?.vault[0] || null;
  const vaultOthers = (model?.vault || []).filter((v) => v !== mythic);

  const tileSub = (id) => {
    if (id === 'vault') return mythic ? `Mythic: ${mythic.name}` : 'Opens Monday';
    if (id === 'boxes') return 'Open for a surprise';
    if (id === 'essentials') return 'Boosts, shields, revives';
    const n = model?.shelves[id]?.length ?? 0;
    return `${n} in today's drop`;
  };

  const homeVariants = { initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: 0.4, ease: EASE } }, exit: { opacity: 0, transition: { duration: 0.2 } } };

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-32 md:pb-10" data-testid="shop-page">
      {/* ── Back: section → shop home → app home ── */}
      <div className="mb-2">
        <BackButton onClick={() => (active === 'today' ? navigate('/dashboard') : jump('today'))} variant="ghost" className="-ml-2" testId="shop-back-home" />
      </div>

      {/* ── Hero ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`${MONO} text-[14px] font-bold text-[color:var(--gm-muted)]`} data-testid="drop-label">{dropLabel} · same shop for everyone</p>
          <h1 className="font-display text-[44px] sm:text-[52px] leading-[0.95] text-[color:var(--gm-ink)] mt-1" data-testid="shop-title">Shop</h1>
        </div>
        <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#D4F36B] flex-none mt-1" data-testid="shop-gem-balance">
          <GemIcon size={17} className="text-[#2B3A06]" />
          <span className="text-[17px] font-display text-[#2B3A06] tabular-nums">{fmt(gems)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2.5 mt-3" data-testid="restock-timer">
        <span className={`${MONO} text-[14px] font-bold text-[color:var(--gm-muted)]`}>{remainingMs === 0 ? 'Restocking…' : 'Restocks in'}</span>
        {remainingMs != null && remainingMs > 0 && <ClockTiles ms={remainingMs} />}
      </div>

      {/* ── Tabs: switch sections (no endless scroll) ── */}
      <nav className="sticky top-0 z-20 -mx-3 sm:-mx-6 px-3 sm:px-6 py-2.5 mt-4 mb-4 bg-[color:var(--gm-bg)]" aria-label="Shop sections">
        <div className="flex items-center gap-1.5">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1" data-testid="shop-tabs">
            {nav.map((s) => (
              <button key={s.id} type="button" onClick={() => jump(s.id)}
                className={`relative px-4 py-2 rounded-full text-[15px] font-sans font-bold whitespace-nowrap transition-colors duration-500 bg-[color:var(--gm-card)] ${active === s.id ? 'text-[color:var(--gm-bg)]' : 'text-[color:var(--gm-muted)]'}`}
                data-testid={`tab-${s.id}`}>
                {active === s.id && <motion.span layoutId="shop-tab-pill" className="absolute inset-0 rounded-full bg-[color:var(--gm-ink)]" transition={SPRING} />}
                <span className="relative">{s.label}</span>
              </button>
            ))}
          </div>
          {sealedCount > 0 && (
            <motion.button type="button" onClick={onRevealAll} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className={`${MONO} flex-none px-3.5 py-2 rounded-full text-[14px] font-black bg-[#D4F36B] text-[#2B3A06]`} data-testid="reveal-all">
              Reveal {sealedCount}
            </motion.button>
          )}
        </div>
      </nav>

      {loading ? (
        <div className="grid grid-cols-2 gap-2.5">{[0, 1, 2, 3].map((i) => <div key={i} className={`${CARD} h-44 opacity-60 animate-pulse`} />)}</div>
      ) : loadError ? (
        <div className={`${CARD} p-6 text-center`}>
          <p className="font-sans font-bold text-[color:var(--gm-ink)]">The shop didn't load.</p>
          <p className="text-sm text-[color:var(--gm-muted)] mt-1">Check your connection and try again.</p>
          <button type="button" onClick={onRetry} className="mt-4 px-5 h-10 rounded-full bg-[#D4F36B] text-[#2B3A06] font-bold text-sm">Retry</button>
        </div>
      ) : (
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.div key={active} className="space-y-9" custom={dir}
          variants={dir === 0 ? homeVariants : swapVariants} initial="initial" animate="animate" exit="exit">

          {active === 'today' ? (
            <>
              {/* Wishlist hit + collection meter */}
              <div className="space-y-2.5">
                {model.wishInStock.length > 0 && (
                  <motion.button type="button" onClick={() => onOpenItem(model.wishInStock[0])}
                    initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.3, ease: [0.7, 0, 0.3, 1] }}
                    className="w-full origin-left rounded-[22px] bg-[#D4F36B] text-[#2B3A06] px-4 py-3 flex items-center gap-3 text-left" data-testid="wishlist-hit">
                    <Bookmark size={18} className="flex-none" />
                    <span className="min-w-0 flex-1">
                      <span className={`${MONO} block text-[14px] font-black`}>On your wishlist · in stock now</span>
                      <span className="block font-sans font-bold text-sm truncate">
                        {model.wishInStock.map((w) => w.name).join(', ')}
                      </span>
                    </span>
                    <ChevronRight size={16} className="flex-none" />
                  </motion.button>
                )}
                <button type="button" onClick={() => onOpenCatalog('title')} className={`${CARD} w-full p-4 text-left`} data-testid="collection-meter">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className={`${MONO} text-[14px] font-bold text-[color:var(--gm-muted)]`}>Your collection</p>
                      <p className="font-display text-[32px] leading-[0.95] text-[color:var(--gm-ink)] mt-1 tabular-nums">
                        {col.have}<span className="text-[22px] text-[color:var(--gm-muted)]">/{col.total}</span>
                      </p>
                    </div>
                    <span className={`${MONO} text-[14px] font-bold text-[color:var(--gm-ink)] flex items-center gap-1`}>See every item <ChevronRight size={14} /></span>
                  </div>
                  <div className="flex gap-1.5 mt-3">
                    {ROTATING.map((c) => {
                      const cc = model.collection[c];
                      return (
                        <div key={c} className="flex-1 min-w-0">
                          <div className="h-2 rounded-full bg-[color:var(--gm-track)] overflow-hidden">
                            <motion.div className="h-full origin-left" style={{ background: SECTION[c].t.bg }} initial={{ scaleX: 0 }} animate={{ scaleX: cc.total ? cc.have / cc.total : 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.2 }} />
                          </div>
                          <p className={`${MONO} text-[13px] text-[color:var(--gm-muted)] mt-1.5 truncate tabular-nums`}>{CATEGORY_COPY[c].short} {cc.have}/{cc.total}</p>
                        </div>
                      );
                    })}
                  </div>
                  <span className="sr-only">{Math.round(colPct)}% collected</span>
                </button>
              </div>

              {/* ── Today ── */}
              <section>
                <SectionHeader id="today" eyebrow={dropLabel} title="Today's drop" meta={`${model.dropCount} items`} />
                <div className="grid sm:grid-cols-[1.5fr_1fr] gap-2.5">
                  {model.featured && (
                    <ShopCard item={model.featured} gems={gems} onOpen={onOpenItem} layout="hero" calm={calm}
                      sealed={isSealed(model.featured.id)} onReveal={onReveal} order={5}
                      eyebrow={`Featured · ${CATEGORY_COPY[model.featured.category]?.one}`} />
                  )}
                  {model.deal && (
                    <div className="flex flex-col gap-2.5">
                      <div className="rounded-[22px] bg-[#F6B3CE] text-[#4B1530] px-4 py-3 flex items-center justify-between">
                        <span className={`${MONO} text-[14px] font-black`}>Daily deal</span>
                        <span className="font-display text-[30px] leading-none">−30%</span>
                      </div>
                      <ShopCard item={model.deal} gems={gems} onOpen={onOpenItem} layout={model.deal.category === 'banner' ? 'wide' : 'md'} calm={calm}
                        sealed={isSealed(model.deal.id)} onReveal={onReveal} order={2} />
                    </div>
                  )}
                </div>
              </section>

              {/* ── Browse: every other section, one tap away ── */}
              <section data-testid="shop-browse">
                <SectionHeader id="browse" title="Browse" blurb="Pick a shelf." />
                <motion.div className="grid grid-cols-2 gap-2.5" variants={staggerParent(0.05, 0.05)} initial="hidden" animate="show">
                  {nav.filter((n) => n.id !== 'today').map((n) => {
                    const sec = SECTION[n.id];
                    return (
                      <motion.button key={n.id} type="button" onClick={() => jump(n.id)} layoutId={`shelf-${n.id}`}
                        variants={fadeUp} transition={{ duration: 0.5, ease: EASE }} whileTap={{ scale: 0.96 }}
                        className={`rounded-[24px] p-4 text-left flex flex-col gap-6 min-h-[128px] ${n.id === 'vault' ? 'col-span-2' : ''}`}
                        style={{ background: sec.t.bg, color: sec.t.ink }} data-testid={`browse-${n.id}`}>
                        <sec.Icon size={30} variant="solid" />
                        <span>
                          <span className="block font-display text-[21px] leading-tight">{sec.label}</span>
                          <span className="block text-[14px] font-semibold opacity-75 mt-0.5 truncate">{tileSub(n.id)}</span>
                        </span>
                      </motion.button>
                    );
                  })}
                </motion.div>
              </section>

              {/* ── How it works ── */}
              <section className={`${CARD} p-4 space-y-4`} data-testid="earn-gems-section">
                <div>
                  <h3 className="font-display text-[19px] text-[color:var(--gm-ink)] mb-3">How the shop restocks</h3>
                  <OddsBar odds={model.odds} />
                  <ul className="mt-3 space-y-1.5 text-[15px] text-[color:var(--gm-muted)]">
                    <li>A new drop every day at 00:00 UTC — {model.dropCount} items, same for everyone.</li>
                    <li>Every slot rolls a rarity first. Anything in the last three drops sits out.</li>
                    <li>Every drop holds at least one epic or better. One item is 30% off.</li>
                    <li>The Sanctum opens every Monday with one mythic and one legendary.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-display text-[19px] text-[color:var(--gm-ink)] mb-3">How to earn gems</h3>
                  <div className="space-y-2.5">
                    {[
                      ['Easy / medium / hard habit', '+5 / +10 / +20'],
                      ['Daily quests', 'up to +30 a day'],
                      ['Level up', '+75 to +400'],
                      ['Streak milestones (3 → 365 days)', '+25 to +1,000'],
                      ['Duplicate from a box', 'refunded in gems'],
                    ].map(([l, v]) => (
                      <div key={l} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-[color:var(--gm-muted)]">{l}</span>
                        <span className="flex items-center gap-1.5 text-[color:var(--gm-ink)] font-label font-bold text-xs whitespace-nowrap"><GemIcon size={14} /> {v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          ) : (
            <>
              {/* Section hero — grows out of the Browse tile you tapped */}
              {SECTION[active] && (() => {
                const sec = SECTION[active];
                return (
                  <motion.button type="button" layoutId={`shelf-${active}`} onClick={() => jump('today')}
                    transition={{ duration: 0.55, ease: EASE }}
                    className="w-full rounded-[28px] p-5 text-left flex flex-col gap-5" style={{ background: sec.t.bg, color: sec.t.ink }} data-testid="shop-section-hero">
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 0.75 }} transition={{ delay: 0.25, duration: 0.35 }}
                      className="inline-flex items-center gap-1.5 text-[14px] font-bold"><ArrowLeft className="w-4 h-4" /> Shop home</motion.span>
                    <span className="flex items-end justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block font-display text-[32px] leading-none">{sec.label}</span>
                        <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 0.75, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}
                          className="block text-[14px] font-semibold mt-2">{sec.blurb}</motion.span>
                      </span>
                      <sec.Icon size={44} variant="solid" />
                    </span>
                  </motion.button>
                );
              })()}

              {active === 'vault' && model.vault.length > 0 && (
                <section>
                  <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--gm-card)', boxShadow: 'inset 0 0 0 2px var(--gm-ink)' }} data-testid="shop-vault">
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5" style={{ background: RARITY.mythic.bg }}>
                      <span className={`${MONO} text-[14px] font-black text-[color:var(--gm-bg)]`}>Seals in</span>
                      <ClockTiles ms={vaultRemainingMs} tone="onPurple" compactDays />
                    </div>
                    <div className="p-2.5 grid sm:grid-cols-[1.5fr_1fr] gap-2.5">
                      {mythic && <ShopCard item={mythic} gems={gems} onOpen={onOpenItem} layout="hero" calm={calm} eyebrow={`Mythic · ${CATEGORY_COPY[mythic.category]?.one}`} />}
                      {vaultOthers.map((v) => (
                        <ShopCard key={v.id} item={v} gems={gems} onOpen={onOpenItem} layout={v.category === 'banner' ? 'wide' : 'md'} calm={calm}
                          eyebrow={`${RARITY[v.tier]?.label} · ${CATEGORY_COPY[v.category]?.one}`} />
                      ))}
                    </div>
                    <p className="px-4 pb-3 text-[14px] text-[color:var(--gm-muted)]">When the Sanctum seals, its pieces sit out for at least six weeks.</p>
                  </div>
                </section>
              )}

              {active === 'boxes' && (
                <section>
                  <div className="-mx-3 sm:-mx-6" data-testid="mystery-boxes-section">
                    <MysteryBoxesHeader onOpenBox={onOpenBox} boxes={boxes} gems={gems ?? 0} />
                  </div>
                </section>
              )}

              {ROTATING.filter((cat) => cat === active).map((cat) => {
                const items = model.shelves[cat];
                const cc = model.collection[cat];
                return (
                  <section key={cat}>
                    <p className="text-[15px] font-semibold text-[color:var(--gm-muted)] mb-3 px-1">{items.length} of {cc.total} in today's drop</p>
                    {items.length ? (
                      <motion.div className={`grid ${SHELF[cat].grid} gap-2.5`} variants={staggerParent(0.06, 0.2)} initial="hidden" animate="show">
                        {items.map((it, i) => (
                          <motion.div key={it.id} variants={fadeUp}>
                            <ShopCard item={it} gems={gems} onOpen={onOpenItem} layout={SHELF[cat].layout} calm={calm}
                              sealed={isSealed(it.id)} onReveal={onReveal} order={shelfOrder[`${cat}:${it.id}`] ?? i} />
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : (
                      <p className="text-sm text-[color:var(--gm-muted)]">Nothing in stock here today.</p>
                    )}
                    <button type="button" onClick={() => onOpenCatalog(cat)}
                      className={`${MONO} mt-3 text-[14px] font-bold text-[color:var(--gm-muted)] flex items-center gap-1`}>
                      All {cc.total} {CATEGORY_COPY[cat].title.toLowerCase()} · you own {cc.have} <ChevronRight size={12} />
                    </button>
                    {cat === 'title' && earnedLine && (
                      <button type="button" onClick={onEarnedTitles} className={`${CARD} mt-2.5 w-full p-3 flex items-center gap-3 text-left`} data-testid="earned-titles-row">
                        <span className="w-10 h-10 rounded-full bg-[color:var(--gm-badge)] text-[color:var(--gm-ink)] flex items-center justify-center flex-none"><FlameIcon size={18} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-sans font-bold text-[color:var(--gm-ink)]">Earned titles aren't for sale</span>
                          <span className="block text-[13px] text-[color:var(--gm-muted)] truncate">{earnedLine}</span>
                        </span>
                        <ChevronRight size={16} className="text-[color:var(--gm-muted)] flex-none" />
                      </button>
                    )}
                  </section>
                );
              })}

              {active === 'essentials' && (
                <section>
                  <Essentials items={essentials} gems={gems} buying={buying} onBuy={onBuyEssential} onActivate={onActivateBoost}
                    activeMultiplier={activeMultiplier} shields={shields} revives={revives} />
                </section>
              )}
            </>
          )}
        </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

const RARITY_RANK = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 };
