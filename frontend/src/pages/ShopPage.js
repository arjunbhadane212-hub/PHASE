import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { GemIcon, ClockIcon, LockIcon, FlameIcon, X, Check, ChevronRight } from '../components/icons';
import { ShopItemIcon, shopItemTone } from '../components/ShopIcons';
import { soundEngine } from '../utils/SoundEngine';
import MysteryBoxesHeader from '../components/MysteryBoxesHeader';
import BoxDetailModal from '../components/BoxDetailModal';
import BoxOpening from '../components/BoxOpening';
import TitlePlate from '../components/profile/TitlePlate';
import MotionRing from '../components/profile/MotionRing';
import { PhaseBanner } from '../components/banners/PhaseBanners';
import { supabase } from '../lib/supabaseClient';

// ─────────────────────────────────────────────────────────────────────────────
// The Shop — a daily rotating store (Nov 2026 rebuild).
//
// Sections, top to bottom (also the sticky jump-list):
//   Today      the featured showpiece + the daily deal (30% off)
//   Boxes      Starter / Delta / Phase mystery boxes        (always stocked)
//   Titles     4 rotating                                   (from 37 buyable)
//   Banners    3 rotating                                   (from 21)
//   Animations 2 rotating                                   (from 14)
//   Effects    3 rotating                                   (from 22)
//   Essentials XP boosts, Streak Shield, Streak Revive      (always stocked)
//
// The rotation is chosen and ENFORCED server-side (get_shop_rotation /
// purchase_shop_item), restocks every day at 00:00 UTC, and is the same for
// everyone. The small timer counts down to the restock using the server's
// clock, so a wrong phone clock can't show a wrong time.
// ─────────────────────────────────────────────────────────────────────────────

const CARD = 'rounded-2xl bg-[color:var(--gm-card)] shadow-[var(--gm-shadow-card)]';
const MONO = "font-['JetBrains_Mono'] uppercase tracking-[0.08em]";

const RARITY = {
  common:    { label: 'Common',    bg: 'transparent', ink: 'var(--gm-muted)', ring: 'var(--gm-track)' },
  rare:      { label: 'Rare',      bg: '#95DEE6', ink: '#183A3F' },
  epic:      { label: 'Epic',      bg: '#E8D9A8', ink: '#352C10' },
  legendary: { label: 'Legendary', bg: '#DBF67F', ink: '#2A3B0B' },
  mythic:    { label: 'Mythic',    bg: '#A59BCC', ink: '#1C1433' },
};

const SECTIONS = [
  { id: 'today', label: 'Today' },
  { id: 'boxes', label: 'Boxes' },
  { id: 'title', label: 'Titles' },
  { id: 'banner', label: 'Banners' },
  { id: 'anim', label: 'Animations' },
  { id: 'effect', label: 'Effects' },
  { id: 'essentials', label: 'Essentials' },
];

const CATEGORY_COPY = {
  title: { title: 'Titles', blurb: 'Worn on your profile and in the league.' },
  banner: { title: 'Banners', blurb: 'The header everyone sees on your profile.' },
  anim: { title: 'Animations', blurb: 'Motion around your avatar.' },
  effect: { title: 'Profile effects', blurb: 'A ring effect for your public profile.' },
};

const EQUIP_FIELD = { title: 'equipped_title', banner: 'equipped_banner', anim: 'equipped_animation', effect: 'equipped_decoration' };

const BOX_LABELS = { starter: 'STARTER', delta: 'DELTA', phase: 'PHASE' };
const rarityToTier = (r) => (r === 'common' ? 'common' : r === 'rare' ? 'rare' : r === 'mythic' ? 'mythic' : 'legendary');

const adaptRolledItems = (items) => (items || []).map((it) => ({
  tier: rarityToTier(it.rarity), type: 'item', name: it.name, item_key: it.item_key, category: it.category,
  hex: it.hex || null, gradient: it.gradient || null,
  ...(it.duplicate ? { duplicate: true, refund: it.refund } : {}),
}));

const fmt = (n) => Number(n || 0).toLocaleString();

// ── restock countdown (server-clock corrected) ───────────────────────────────
function useCountdown(endsAt, offsetMs) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!endsAt) return null;
  return Math.max(0, new Date(endsAt).getTime() - (now + offsetMs));
}

function hms(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ── small pieces ─────────────────────────────────────────────────────────────
function RarityChip({ tier }) {
  const r = RARITY[tier] || RARITY.common;
  return (
    <span className={`${MONO} inline-flex items-center text-[9px] font-bold px-1.5 py-[3px] rounded-md leading-none`}
      style={{ background: r.bg, color: r.ink, boxShadow: r.ring ? `inset 0 0 0 1px ${r.ring}` : undefined }}>
      {r.label}
    </span>
  );
}

function Price({ value, was, tone = 'ink' }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <GemIcon size={14} className={tone === 'onCyan' ? 'text-[#183A3F]' : 'text-[#95DEE6]'} />
      <span className={`font-['Archivo'] font-black text-sm ${tone === 'onCyan' ? 'text-[#183A3F]' : 'text-[color:var(--gm-ink)]'}`}>{fmt(value)}</span>
      {was != null && <span className="text-[11px] line-through text-[color:var(--gm-muted)]">{fmt(was)}</span>}
    </span>
  );
}

function ItemPreview({ item, big = false }) {
  const h = big ? 120 : 76;
  if (item.category === 'title') {
    return (
      <div className="w-full flex items-center justify-center rounded-xl bg-[color:var(--gm-bg)] px-2 overflow-hidden" style={{ height: h }}>
        <TitlePlate titleKey={item.key} name={item.name} tier={item.tier} size={big ? 'lg' : 'sm'} />
      </div>
    );
  }
  if (item.category === 'banner') {
    return (
      <div className="w-full rounded-xl overflow-hidden bg-[color:var(--gm-bg)]" style={{ height: h }}>
        <PhaseBanner bannerKey={item.key} />
      </div>
    );
  }
  const d = big ? 84 : 52;
  return (
    <div className="w-full flex items-center justify-center rounded-xl bg-[color:var(--gm-bg)]" style={{ height: h }}>
      <div className="relative rounded-full bg-[color:var(--gm-badge)]" style={{ width: d, height: d }}>
        <MotionRing itemKey={item.key} />
      </div>
    </div>
  );
}

function SectionHeader({ id, title, blurb, meta, refFn }) {
  return (
    <div ref={refFn} data-section={id} className="scroll-mt-28 flex items-end justify-between gap-3 mb-3">
      <div className="min-w-0">
        <h2 className="font-['Archivo'] font-extrabold text-[19px] text-[color:var(--gm-ink)] tracking-[-0.01em]">{title}</h2>
        {blurb && <p className="text-xs text-[color:var(--gm-muted)] mt-0.5">{blurb}</p>}
      </div>
      {meta && <span className={`${MONO} text-[10px] text-[color:var(--gm-muted)] flex-none`}>{meta}</span>}
    </div>
  );
}

function ItemCard({ item, gems, onOpen }) {
  const price = item.dealPrice ?? item.price;
  const short = !item.owned && (gems ?? 0) < price;
  return (
    <button type="button" onClick={() => onOpen(item)}
      className={`${CARD} p-2.5 text-left flex flex-col gap-2.5 transition-transform active:scale-[0.98]`}
      data-testid={`shop-item-${item.key}`}>
      <ItemPreview item={item} />
      <div className="px-0.5 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <RarityChip tier={item.tier} />
          {item.dealPrice != null && <span className={`${MONO} text-[9px] font-bold px-1.5 py-[3px] rounded-md leading-none bg-[#DBF67F] text-[#2A3B0B]`}>Deal</span>}
        </div>
        <p className="font-['General_Sans'] font-bold text-[13px] text-[color:var(--gm-ink)] truncate">{item.name}</p>
        <div className="mt-1.5 h-5 flex items-center">
          {item.equipped ? <span className={`${MONO} text-[10px] font-bold text-[color:var(--gm-ink)]`}>Equipped</span>
            : item.owned ? <span className={`${MONO} text-[10px] font-bold text-[color:var(--gm-muted)]`}>Owned</span>
              : <span className={short ? 'opacity-50' : ''}><Price value={price} was={item.dealPrice != null ? item.price : null} /></span>}
        </div>
      </div>
    </button>
  );
}

// ── buy / preview sheet ──────────────────────────────────────────────────────
function ItemSheet({ item, gems, busy, onClose, onBuy, onEquip }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const price = item.dealPrice ?? item.price;
  const need = Math.max(0, price - (gems ?? 0));
  return (
    <motion.div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div role="dialog" aria-modal="true" aria-label={item.name}
        initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        className="relative w-full sm:max-w-md bg-[color:var(--gm-card)] rounded-t-3xl sm:rounded-3xl p-5 pb-8 sm:pb-5"
        data-testid="shop-item-sheet">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[color:var(--gm-badge)] flex items-center justify-center text-[color:var(--gm-muted)]" aria-label="Close">
          <X size={16} />
        </button>
        <p className={`${MONO} text-[10px] text-[color:var(--gm-muted)] mb-3`}>{CATEGORY_COPY[item.category]?.title || 'Item'}</p>
        <ItemPreview item={item} big />
        <div className="mt-4 flex items-center gap-2">
          <RarityChip tier={item.tier} />
          {item.dealPrice != null && <span className={`${MONO} text-[9px] font-bold px-1.5 py-[3px] rounded-md bg-[#DBF67F] text-[#2A3B0B]`}>Daily deal</span>}
        </div>
        <h3 className="font-['Archivo'] font-black text-2xl text-[color:var(--gm-ink)] mt-2 tracking-[-0.01em]">{item.name}</h3>
        <p className="text-sm text-[color:var(--gm-muted)] mt-1">{CATEGORY_COPY[item.category]?.blurb}</p>

        <div className="mt-5">
          {item.equipped ? (
            <div className="w-full h-12 rounded-full bg-[#DBF67F] text-[#2A3B0B] font-['General_Sans'] font-bold flex items-center justify-center gap-2"><Check size={18} /> Equipped</div>
          ) : item.owned ? (
            <button type="button" disabled={busy} onClick={() => onEquip(item)}
              className="w-full h-12 rounded-full bg-[#95DEE6] text-[#183A3F] font-['General_Sans'] font-bold disabled:opacity-50" data-testid="sheet-equip">
              {busy ? 'Equipping…' : 'Equip'}
            </button>
          ) : need > 0 ? (
            <div className="w-full h-12 rounded-full bg-[color:var(--gm-badge)] text-[color:var(--gm-muted)] font-['General_Sans'] font-bold flex items-center justify-center gap-2" data-testid="sheet-short">
              <LockIcon size={16} /> Need {fmt(need)} more gems
            </div>
          ) : (
            <button type="button" disabled={busy} onClick={() => onBuy(item)}
              className="w-full h-12 rounded-full bg-[#95DEE6] text-[#183A3F] font-['General_Sans'] font-bold flex items-center justify-center gap-2 disabled:opacity-50" data-testid="sheet-buy">
              {busy ? 'Buying…' : <>Buy for <Price value={price} was={item.dealPrice != null ? item.price : null} tone="onCyan" /></>}
            </button>
          )}
          {need > 0 && !item.owned && (
            <p className="text-center text-xs text-[color:var(--gm-muted)] mt-3">Complete habits and daily quests to earn gems. This item leaves the shop at the next restock.</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── essentials (always stocked) ──────────────────────────────────────────────
function Essentials({ items, gems, buying, onBuy, onActivate, activeMultiplier, shields, revives }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5" data-testid="powerups-grid">
      {items.map((item) => {
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
          <button key={item.id} type="button" disabled={disabled}
            onClick={() => (item.isXpBoost ? onActivate(item) : onBuy(item))}
            className={`${CARD} p-3 text-left flex flex-col gap-2.5`} data-testid={`shop-item-${item.key}`}>
            <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: tone.bg, color: tone.ink }}>
              <ShopItemIcon itemKey={item.key} size={22} />
            </span>
            <span>
              <span className="block font-['General_Sans'] font-bold text-[13px] text-[color:var(--gm-ink)]">{item.name}</span>
              <span className="block text-[11px] text-[color:var(--gm-muted)] mt-0.5">{sub}</span>
            </span>
            <span className="mt-auto h-5 flex items-center">
              {busy ? <span className={`${MONO} text-[10px] text-[color:var(--gm-muted)]`}>Working…</span>
                : isActive ? <span className={`${MONO} text-[10px] font-bold text-[color:var(--gm-ink)]`}>Active now</span>
                  : full ? <span className={`${MONO} text-[10px] text-[color:var(--gm-muted)]`}>Maxed</span>
                    : <span className={canAfford ? '' : 'opacity-50'}><Price value={item.price} /></span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────
export default function ShopPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { gems, fetchGameStatus, activeBoostMultiplier } = useGame();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [owned, setOwned] = useState({});
  const [equippedIds, setEquippedIds] = useState(() => new Set());
  const [rotation, setRotation] = useState(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [boxData, setBoxData] = useState({ byKey: {}, keyToId: {} });
  const [hours, setHours] = useState(0);
  const [buying, setBuying] = useState(null);
  const [sheetKey, setSheetKey] = useState(null);
  const [openedBoxId, setOpenedBoxId] = useState(null);
  const [openingState, setOpeningState] = useState(null);
  const [active, setActive] = useState('today');
  const sectionRefs = useRef({});
  const restockedFor = useRef(null);

  const fetchShop = useCallback(async () => {
    try {
      const [
        { data: items, error }, { data: inv }, { data: eq }, { data: lboxes }, { data: droptab },
        { data: rot, error: rotErr }, { data: fs },
      ] = await Promise.all([
        supabase.from('shop_items').select('*').eq('is_active', true),
        supabase.from('user_inventory').select('shop_item_id, quantity'),
        supabase.from('user_equipped').select('category, shop_item_id'),
        supabase.from('loot_boxes').select('id, key, name, price_gems, items_per_open'),
        supabase.from('loot_box_drop_table').select('loot_box_id, shop_item_id, weight'),
        supabase.rpc('get_shop_rotation'),
        supabase.from('focus_sessions').select('credited_minutes').eq('status', 'completed'),
      ]);
      if (error) throw error;
      if (rotErr) throw rotErr;
      const ownedQty = {};
      (inv || []).forEach((r) => { ownedQty[r.shop_item_id] = r.quantity; });
      setOwned(ownedQty);
      setEquippedIds(new Set((eq || []).map((r) => r.shop_item_id)));
      setCatalog(items || []);
      setRotation(rot);
      if (rot?.server_now) setClockOffset(new Date(rot.server_now).getTime() - Date.now());
      setHours((fs || []).reduce((t, r) => t + Number(r.credited_minutes || 0), 0) / 60);

      const itemById = {};
      (items || []).forEach((r) => { itemById[r.id] = r; });
      const byKey = {}; const keyToId = {};
      (lboxes || []).forEach((b) => {
        keyToId[b.key] = b.id;
        const drops = (droptab || []).filter((d) => d.loot_box_id === b.id && itemById[d.shop_item_id]);
        const sumW = drops.reduce((s, d) => s + Number(d.weight), 0) || 1;
        const pool = drops.sort((a, z) => Number(z.weight) - Number(a.weight)).map((d) => {
          const it = itemById[d.shop_item_id];
          return { id: it.key, name: it.name || it.key, tier: rarityToTier(it.rarity), percent: (Number(d.weight) / sumW) * 100 };
        });
        byKey[b.key] = {
          id: b.key, name: b.name, label: BOX_LABELS[b.key] || (b.key || '').toUpperCase(), cost: b.price_gems,
          dropsPerOpen: b.items_per_open,
          tiers: ['common', 'rare', 'legendary', 'mythic'].filter((t) => pool.some((p) => p.tier === t)), pool,
        };
      });
      setBoxData({ byKey, keyToId });
      setLoadError(false);
    } catch (e) {
      console.error('shop load failed', e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchShop(); }, [fetchShop]);

  // Restock: when the countdown hits zero, pull the new rotation once.
  const remaining = useCountdown(rotation?.ends_at, clockOffset);
  useEffect(() => {
    if (remaining === 0 && rotation?.cycle != null && restockedFor.current !== rotation.cycle) {
      restockedFor.current = rotation.cycle;
      const t = setTimeout(async () => {
        await fetchShop();
        toast.success('The shop just restocked');
      }, 1500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [remaining, rotation?.cycle, fetchShop]);

  const byId = useMemo(() => {
    const m = {}; catalog.forEach((r) => { m[r.id] = r; }); return m;
  }, [catalog]);

  const rotating = useMemo(() => {
    const out = { title: [], banner: [], anim: [], effect: [] };
    let featured = null; let deal = null;
    (rotation?.items || []).forEach((rr) => {
      const r = byId[rr.shop_item_id];
      if (!r || !out[r.category]) return;
      const item = {
        id: r.id, key: r.key, name: r.name, category: r.category, tier: r.rarity_tier || r.rarity || 'common',
        price: r.price_gems, dealPrice: rr.deal_price ?? null, featured: rr.featured,
        owned: (owned[r.id] || 0) > 0,
        equipped: equippedIds.has(r.id) || (user?.[EQUIP_FIELD[r.category]] === r.key),
      };
      out[r.category].push(item);
      if (rr.featured) featured = item;
      if (rr.deal_price != null) deal = item;
    });
    return { ...out, featured, deal };
  }, [rotation, byId, owned, equippedIds, user]);

  const totals = useMemo(() => {
    const t = { title: 0, banner: 0, anim: 0, effect: 0 };
    catalog.forEach((r) => {
      if (!(r.category in t) || r.box_only || !r.price_gems) return;
      if (r.category === 'title' && r.source_system !== 'shop') return;
      t[r.category] += 1;
    });
    return t;
  }, [catalog]);

  const essentials = useMemo(() => catalog
    .filter((r) => r.category === 'boost')
    .sort((a, b) => a.price_gems - b.price_gems)
    .map((r) => ({
      id: r.id, key: r.key, name: r.name, price: r.price_gems, max: r.max_owned || 1,
      isXpBoost: (r.key || '').startsWith('boost_xp_'), multiplier: r.metadata?.multiplier ?? null,
    })), [catalog]);

  // Next EARNED titles (streak / hours ladders) — the shop never sells those,
  // so show how close the next one is instead.
  const nextEarned = useMemo(() => {
    const streak = Math.max(user?.current_streak || 0, user?.longest_streak_ever || 0);
    const pick = (src, field, cur) => catalog
      .filter((r) => r.category === 'title' && r.source_system === src && !(owned[r.id] > 0))
      .map((r) => ({ name: r.name, at: Number(r.metadata?.[field]) }))
      .filter((r) => r.at > cur).sort((a, b) => a.at - b.at)[0] || null;
    return { streak: pick('streak', 'days', streak), streakCur: streak, hours: pick('hours', 'hours', hours), hoursCur: hours };
  }, [catalog, owned, user?.current_streak, user?.longest_streak_ever, hours]);

  const allItems = [...rotating.title, ...rotating.banner, ...rotating.anim, ...rotating.effect];
  const sheetItem = allItems.find((i) => i.key === sheetKey) || null;
  const closeSheet = useCallback(() => setSheetKey(null), []);

  const handleBuy = async (item) => {
    setBuying(item.id);
    try {
      const { data, error } = await supabase.rpc('purchase_shop_item', { p_shop_item_id: item.id });
      if (error) throw error;
      soundEngine.purchase();
      toast.success(`${data.name} is yours`);
      await Promise.all([fetchShop(), fetchGameStatus()]);
    } catch (e) {
      toast.error(e?.message || 'Purchase failed');
      if (/not in today/i.test(e?.message || '')) fetchShop();
    } finally {
      setBuying(null);
    }
  };

  const handleActivateBoost = async (item) => {
    setBuying(item.id);
    try {
      const { data, error } = await supabase.rpc('buy_xp_boost', { p_shop_item_id: item.id });
      if (error) throw error;
      soundEngine.purchase();
      toast.success(`${data.bought_multiplier}× XP is on for 24 hours`);
      await Promise.all([fetchShop(), fetchGameStatus()]);
    } catch (e) {
      toast.error(e?.message || 'Could not activate boost');
    } finally {
      setBuying(null);
    }
  };

  const handleEquip = async (item) => {
    setBuying(item.id);
    try {
      const { error } = await supabase.rpc('equip_item', { p_shop_item_id: item.id });
      if (error) throw error;
      toast.success(`Equipped ${item.name}`);
      await Promise.all([fetchShop(), refreshUser()]);
    } catch (e) {
      toast.error(e?.message || 'Could not equip');
    } finally {
      setBuying(null);
    }
  };

  const jump = (id) => {
    setActive(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Highlight the section in view.
  useEffect(() => {
    if (loading) return undefined;
    const els = Object.values(sectionRefs.current).filter(Boolean);
    if (!els.length || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setActive(vis.target.dataset.section);
    }, { rootMargin: '-120px 0px -60% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [loading, rotation?.cycle]);

  const refFor = (id) => (el) => { sectionRefs.current[id] = el; };

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-32 md:pb-10" data-testid="shop-page">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-['Archivo'] font-black text-[color:var(--gm-ink)] tracking-[-0.02em]" data-testid="shop-title">Shop</h1>
          <div className="flex items-center gap-1.5 mt-1.5 text-[color:var(--gm-muted)]" data-testid="restock-timer">
            <ClockIcon size={13} />
            <span className={`${MONO} text-[10px]`}>
              {remaining == null ? 'Loading stock'
                : remaining === 0 ? 'Restocking…'
                  : <>New items in <span className="text-[color:var(--gm-ink)] tabular-nums">{hms(remaining)}</span></>}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#95DEE6] flex-none" data-testid="shop-gem-balance">
          <GemIcon size={16} className="text-[#183A3F]" />
          <span className="text-base font-['Archivo'] font-black text-[#183A3F] tabular-nums">{fmt(gems)}</span>
        </div>
      </div>

      {/* Sticky section list */}
      <nav className="sticky top-0 z-20 -mx-3 sm:-mx-6 px-3 sm:px-6 py-2.5 mt-3 mb-4 bg-[color:var(--gm-bg)]" aria-label="Shop sections">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar" data-testid="shop-tabs">
          {SECTIONS.map((s) => (
            <button key={s.id} type="button" onClick={() => jump(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-['General_Sans'] font-bold whitespace-nowrap transition-colors ${active === s.id ? 'bg-[color:var(--gm-ink)] text-[color:var(--gm-bg)]' : 'bg-[color:var(--gm-card)] text-[color:var(--gm-muted)]'}`}
              data-testid={`tab-${s.id}`}>
              {s.label}
            </button>
          ))}
        </div>
      </nav>

      {loading ? (
        <div className="grid grid-cols-2 gap-2.5">{[0, 1, 2, 3].map((i) => <div key={i} className={`${CARD} h-44 opacity-60`} />)}</div>
      ) : loadError ? (
        <div className={`${CARD} p-6 text-center`}>
          <p className="font-['General_Sans'] font-bold text-[color:var(--gm-ink)]">The shop didn't load.</p>
          <p className="text-sm text-[color:var(--gm-muted)] mt-1">Check your connection and try again.</p>
          <button type="button" onClick={() => { setLoading(true); fetchShop(); }} className="mt-4 px-5 h-10 rounded-full bg-[#95DEE6] text-[#183A3F] font-bold text-sm">Retry</button>
        </div>
      ) : (
        <div className="space-y-9">
          {/* TODAY: featured + deal */}
          <section>
            <SectionHeader id="today" title="Today in the shop" refFn={refFor('today')} meta="Same shop for everyone" />
            <div className="grid sm:grid-cols-[1.4fr_1fr] gap-2.5">
              {rotating.featured && (
                <button type="button" onClick={() => setSheetKey(rotating.featured.key)} className={`${CARD} p-3 text-left`} data-testid="shop-featured">
                  <ItemPreview item={rotating.featured} big />
                  <div className="flex items-center justify-between gap-2 mt-3 px-0.5">
                    <div className="min-w-0">
                      <p className={`${MONO} text-[10px] text-[color:var(--gm-muted)]`}>Featured · {CATEGORY_COPY[rotating.featured.category]?.title}</p>
                      <p className="font-['Archivo'] font-black text-xl text-[color:var(--gm-ink)] truncate mt-0.5">{rotating.featured.name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-none">
                      <RarityChip tier={rotating.featured.tier} />
                      {rotating.featured.owned
                        ? <span className={`${MONO} text-[10px] text-[color:var(--gm-muted)]`}>Owned</span>
                        : <Price value={rotating.featured.dealPrice ?? rotating.featured.price} />}
                    </div>
                  </div>
                </button>
              )}
              {rotating.deal && (
                <button type="button" onClick={() => setSheetKey(rotating.deal.key)} className={`${CARD} p-3 text-left flex flex-col`} data-testid="shop-deal">
                  <p className={`${MONO} text-[10px] font-bold text-[#2A3B0B] bg-[#DBF67F] self-start px-2 py-1 rounded-md`}>Daily deal · 30% off</p>
                  <div className="mt-3"><ItemPreview item={rotating.deal} /></div>
                  <p className="font-['General_Sans'] font-bold text-sm text-[color:var(--gm-ink)] mt-3 truncate">{rotating.deal.name}</p>
                  <div className="mt-1">
                    {rotating.deal.owned
                      ? <span className={`${MONO} text-[10px] text-[color:var(--gm-muted)]`}>Owned</span>
                      : <Price value={rotating.deal.dealPrice} was={rotating.deal.price} />}
                  </div>
                </button>
              )}
            </div>
          </section>

          {/* BOXES */}
          <section>
            <SectionHeader id="boxes" title="Mystery boxes" blurb="Always in stock. Duplicates turn into gems." refFn={refFor('boxes')} />
            <div className="-mx-3 sm:-mx-6" data-testid="mystery-boxes-section">
              <MysteryBoxesHeader onOpenBox={(id) => setOpenedBoxId(id)} boxes={boxData.byKey} gems={gems ?? 0} />
            </div>
          </section>

          {/* ROTATING SECTIONS */}
          {['title', 'banner', 'anim', 'effect'].map((cat) => (
            <section key={cat}>
              <SectionHeader id={cat} title={CATEGORY_COPY[cat].title} blurb={CATEGORY_COPY[cat].blurb}
                meta={`${rotating[cat].length} of ${totals[cat]} today`} refFn={refFor(cat)} />
              {rotating[cat].length ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {rotating[cat].map((it) => <ItemCard key={it.key} item={it} gems={gems} onOpen={(x) => setSheetKey(x.key)} />)}
                </div>
              ) : (
                <p className="text-sm text-[color:var(--gm-muted)]">Nothing in stock here today.</p>
              )}
              {cat === 'title' && (
                <button type="button" onClick={() => navigate('/dashboard/profile')} className={`${CARD} mt-2.5 w-full p-3 flex items-center gap-3 text-left`} data-testid="earned-titles-row">
                  <span className="w-9 h-9 rounded-xl bg-[color:var(--gm-badge)] text-[color:var(--gm-ink)] flex items-center justify-center flex-none"><FlameIcon size={18} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-['General_Sans'] font-bold text-[color:var(--gm-ink)]">Earned titles aren't for sale</span>
                    <span className="block text-[11px] text-[color:var(--gm-muted)] truncate">
                      {nextEarned.streak ? `${nextEarned.streak.at - nextEarned.streakCur} more streak days to ${nextEarned.streak.name}` : 'Every streak title earned'}
                      {nextEarned.hours ? ` · ${Math.max(1, Math.ceil(nextEarned.hours.at - nextEarned.hoursCur))}h of focus to ${nextEarned.hours.name}` : ''}
                    </span>
                  </span>
                  <ChevronRight size={16} className="text-[color:var(--gm-muted)] flex-none" />
                </button>
              )}
            </section>
          ))}

          {/* ESSENTIALS */}
          <section>
            <SectionHeader id="essentials" title="Essentials" blurb="Always in stock." refFn={refFor('essentials')} />
            <Essentials items={essentials} gems={gems} buying={buying} onBuy={handleBuy} onActivate={handleActivateBoost}
              activeMultiplier={activeBoostMultiplier} shields={user?.streak_shields || 0} revives={user?.streak_revives || 0} />
          </section>

          {/* HOW TO EARN — every number here is what the server actually pays */}
          <section className={`${CARD} p-4`} data-testid="earn-gems-section">
            <h3 className={`${MONO} text-[11px] font-bold text-[color:var(--gm-muted)] mb-3`}>How to earn gems</h3>
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
                  <span className="flex items-center gap-1.5 text-[color:var(--gm-ink)] font-['JetBrains_Mono'] font-bold text-xs whitespace-nowrap"><GemIcon size={13} className="text-[#95DEE6]" /> {v}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <AnimatePresence>
        {sheetItem && (
          <ItemSheet key={sheetItem.key} item={sheetItem} gems={gems} busy={buying === sheetItem.id}
            onClose={closeSheet} onBuy={handleBuy} onEquip={handleEquip} />
        )}
      </AnimatePresence>

      <BoxDetailModal
        box={openedBoxId ? boxData.byKey[openedBoxId] : null}
        userGems={gems ?? 0}
        onClose={() => setOpenedBoxId(null)}
        onOpen={async (id) => {
          const lootBoxId = boxData.keyToId[id];
          if (!lootBoxId) { toast.error('Could not open box'); return; }
          try {
            const { data, error } = await supabase.rpc('open_loot_box', { p_loot_box_id: lootBoxId });
            if (error) throw error;
            setOpenedBoxId(null);
            setOpeningState({ boxId: id, items: adaptRolledItems(data.items) });
          } catch (e) {
            toast.error(e?.message || 'Could not open box');
          }
        }}
      />
      {openingState && (
        <BoxOpening boxId={openingState.boxId} rolledItems={openingState.items}
          onContinue={async () => { setOpeningState(null); await Promise.all([fetchShop(), fetchGameStatus()]); }} />
      )}
    </div>
  );
}
