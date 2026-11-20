import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { soundEngine } from '../utils/SoundEngine';
import BoxDetailModal from '../components/BoxDetailModal';
import BoxOpening from '../components/BoxOpening';
import ShopView from '../components/shop/ShopView';
import ItemSheet from '../components/shop/ItemSheet';
import CatalogIndex from '../components/shop/CatalogIndex';
import DropIntro from '../components/shop/DropIntro';
import { buildShopModel, ROTATING } from '../components/shop/shopModel';
import { supabase } from '../lib/supabaseClient';

// ─────────────────────────────────────────────────────────────────────────────
// The Shop — v3 "Drops" (Nov 2026). Data + actions only; the page body is
// components/shop/ShopView (also rendered with fixtures at /dev/shop).
//
// Server rules (supabase/migrations/20261119000000_shop_v3_drops_vault_catalog):
//   · a new drop every day 00:00 UTC; each slot rolls a rarity (40/32/18/10)
//   · the Vault every Monday: 1 mythic + 1 legendary, the only mythic source
//   · purchase_shop_item refuses anything not in today's drop or the Vault
// Client theatre (per user, per drop, localStorage):
//   · the DropIntro plays on the first visit to a new drop
//   · drop cards arrive sealed and flip as they scroll in (or "Reveal all")
// ─────────────────────────────────────────────────────────────────────────────

const BOX_LABELS = { starter: 'STARTER', delta: 'DELTA', phase: 'PHASE' };
const rarityToTier = (r) => (r === 'common' ? 'common' : r === 'rare' ? 'rare' : r === 'mythic' ? 'mythic' : 'legendary');

const adaptRolledItems = (items) => (items || []).map((it) => ({
  tier: rarityToTier(it.rarity), type: 'item', name: it.name, item_key: it.item_key, category: it.category,
  hex: it.hex || null, gradient: it.gradient || null,
  ...(it.duplicate ? { duplicate: true, refund: it.refund } : {}),
}));

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}
const left = (iso, now, off) => (iso ? Math.max(0, new Date(iso).getTime() - (now + off)) : null);

const ls = {
  get(k) { try { return window.localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { window.localStorage.setItem(k, v); } catch { /* private mode */ } },
};

export default function ShopPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { gems, fetchGameStatus, activeBoostMultiplier } = useGame();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [owned, setOwned] = useState({});
  const [equippedIds, setEquippedIds] = useState(() => new Set());
  const [wishlist, setWishlist] = useState(() => new Set());
  const [rotation, setRotation] = useState(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [boxData, setBoxData] = useState({ byKey: {}, keyToId: {} });
  const [hours, setHours] = useState(0);
  const [buying, setBuying] = useState(null);
  const [sheetId, setSheetId] = useState(null);
  const [justBought, setJustBought] = useState(null);
  const [indexCat, setIndexCat] = useState(null);
  const [openedBoxId, setOpenedBoxId] = useState(null);
  const [openingState, setOpeningState] = useState(null);
  const [revealed, setRevealed] = useState(() => new Set());
  const [intro, setIntro] = useState(false);
  const restockedFor = useRef(null);

  const fetchShop = useCallback(async () => {
    try {
      const [
        { data: items, error }, { data: inv }, { data: eq }, { data: lboxes }, { data: droptab },
        { data: rot, error: rotErr }, { data: fs }, { data: wl },
      ] = await Promise.all([
        supabase.from('shop_items').select('*').eq('is_active', true),
        supabase.from('user_inventory').select('shop_item_id, quantity'),
        supabase.from('user_equipped').select('category, shop_item_id'),
        supabase.from('loot_boxes').select('id, key, name, price_gems, items_per_open'),
        supabase.from('loot_box_drop_table').select('loot_box_id, shop_item_id, weight'),
        supabase.rpc('get_shop_rotation'),
        supabase.from('focus_sessions').select('credited_minutes').eq('status', 'completed'),
        supabase.from('shop_wishlist').select('shop_item_id'),
      ]);
      if (error) throw error;
      if (rotErr) throw rotErr;
      const ownedQty = {};
      (inv || []).forEach((r) => { ownedQty[r.shop_item_id] = r.quantity; });
      setOwned(ownedQty);
      setEquippedIds(new Set((eq || []).map((r) => r.shop_item_id)));
      setWishlist(new Set((wl || []).map((r) => r.shop_item_id)));
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

  const model = useMemo(() => buildShopModel({ catalog, rotation, owned, equippedIds, user, wishlist }),
    [catalog, rotation, owned, equippedIds, user, wishlist]);

  // ── per-drop theatre state (intro + sealed cards) ──
  const uid = user?.id || 'anon';
  const cycle = rotation?.cycle;
  const sealKey = cycle != null ? `phase_shop_revealed_${uid}_${cycle}` : null;
  useEffect(() => {
    if (!sealKey) return;
    let ids = [];
    try { ids = JSON.parse(ls.get(sealKey) || '[]'); } catch { ids = []; }
    setRevealed(new Set(ids));
    if (ls.get(`phase_shop_intro_${uid}`) !== String(cycle)) setIntro(true);
  }, [sealKey, uid, cycle]);

  const dropIds = useMemo(() => ROTATING.flatMap((c) => model.shelves[c].map((i) => i.id)), [model]);
  const isSealed = useCallback((id) => !!sealKey && dropIds.includes(id) && !revealed.has(id), [sealKey, dropIds, revealed]);
  const sealedCount = dropIds.filter((id) => !revealed.has(id)).length;

  const persistRevealed = (next) => { if (sealKey) ls.set(sealKey, JSON.stringify([...next])); };
  const onReveal = useCallback((id) => {
    setRevealed((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev); next.add(id);
      persistRevealed(next);
      return next;
    });
    // persistRevealed only closes over sealKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sealKey]);
  const onRevealAll = () => {
    const next = new Set([...revealed, ...dropIds]);
    persistRevealed(next);
    setRevealed(next);
    soundEngine.reveal('legendary');
  };

  const vaultWeek = model.vaultWeek;
  const vaultIsNew = vaultWeek != null && ls.get(`phase_shop_vault_${uid}`) !== String(vaultWeek);
  const finishIntro = () => {
    ls.set(`phase_shop_intro_${uid}`, String(cycle));
    if (vaultWeek != null) ls.set(`phase_shop_vault_${uid}`, String(vaultWeek));
    setIntro(false);
  };

  // ── clocks + restock ──
  const now = useNow();
  const remaining = left(rotation?.ends_at, now, clockOffset);
  const vaultRemaining = left(rotation?.vault?.ends_at, now, clockOffset);
  useEffect(() => {
    if (remaining === 0 && rotation?.cycle != null && restockedFor.current !== rotation.cycle) {
      restockedFor.current = rotation.cycle;
      const t = setTimeout(async () => {
        await fetchShop();
        toast.success('New drop — the shop just restocked');
      }, 1500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [remaining, rotation?.cycle, fetchShop]);

  // ── catalog helpers ──
  const findItem = (id) => ROTATING.flatMap((c) => model.index[c]).find((i) => i.id === id) || null;
  const sheetItem = sheetId ? findItem(sheetId) : null;
  const closeSheet = useCallback(() => { setSheetId(null); setJustBought(null); }, []);

  const essentials = useMemo(() => catalog
    .filter((r) => r.category === 'boost')
    .sort((a, b) => a.price_gems - b.price_gems)
    .map((r) => ({
      id: r.id, key: r.key, name: r.name, price: r.price_gems, max: r.max_owned || 1,
      isXpBoost: (r.key || '').startsWith('boost_xp_'), multiplier: r.metadata?.multiplier ?? null,
    })), [catalog]);

  // Next EARNED titles (streak / hours ladders) — never sold, so show the gap.
  const earnedLine = useMemo(() => {
    const streak = Math.max(user?.current_streak || 0, user?.longest_streak_ever || 0);
    const pick = (src, field, cur) => catalog
      .filter((r) => r.category === 'title' && r.source_system === src && !(owned[r.id] > 0))
      .map((r) => ({ name: r.name, at: Number(r.metadata?.[field]) }))
      .filter((r) => r.at > cur).sort((a, b) => a.at - b.at)[0] || null;
    const s = pick('streak', 'days', streak); const h = pick('hours', 'hours', hours);
    return `${s ? `${s.at - streak} more streak days to ${s.name}` : 'Every streak title earned'}${h ? ` · ${Math.max(1, Math.ceil(h.at - hours))}h of focus to ${h.name}` : ''}`;
  }, [catalog, owned, user?.current_streak, user?.longest_streak_ever, hours]);

  // ── actions ──
  const handleBuy = async (item) => {
    setBuying(item.id);
    try {
      const { data, error } = await supabase.rpc('purchase_shop_item', { p_shop_item_id: item.id });
      if (error) throw error;
      soundEngine.purchase();
      if (item.tier !== 'common') setTimeout(() => soundEngine.reveal(item.tier === 'mythic' ? 'mythic' : item.tier === 'legendary' ? 'legendary' : 'rare'), 160);
      if (ROTATING.includes(item.category)) setJustBought({ id: item.id, t: Date.now() });
      else toast.success(`${data.name} is yours`);
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

  const handleWish = async (item) => {
    if (!user?.id) return;
    const on = !wishlist.has(item.id);
    setWishlist((prev) => { const n = new Set(prev); if (on) n.add(item.id); else n.delete(item.id); return n; });
    const { error } = on
      ? await supabase.from('shop_wishlist').insert({ user_id: user.id, shop_item_id: item.id })
      : await supabase.from('shop_wishlist').delete().eq('user_id', user.id).eq('shop_item_id', item.id);
    if (error && !/duplicate/i.test(error.message || '')) {
      toast.error('Could not update your wishlist');
      setWishlist((prev) => { const n = new Set(prev); if (on) n.delete(item.id); else n.add(item.id); return n; });
    } else if (on) {
      toast.success(item.inDrop || item.inVault ? `${item.name} is in stock right now` : `We'll flag ${item.name} when it drops`);
    }
  };

  return (
    <>
      <ShopView
        model={model} gems={gems} loading={loading} loadError={loadError}
        onRetry={() => { setLoading(true); fetchShop(); }}
        remainingMs={remaining} vaultRemainingMs={vaultRemaining}
        isSealed={isSealed} onReveal={onReveal} onRevealAll={onRevealAll} sealedCount={intro ? 0 : sealedCount}
        onOpenItem={(it) => { setJustBought(null); setSheetId(it.id); }} onOpenCatalog={(c) => setIndexCat(c)}
        boxes={boxData.byKey} onOpenBox={(id) => setOpenedBoxId(id)}
        essentials={essentials} buying={buying} onBuyEssential={handleBuy} onActivateBoost={handleActivateBoost}
        activeMultiplier={activeBoostMultiplier} shields={user?.streak_shields || 0} revives={user?.streak_revives || 0}
        earnedLine={earnedLine} onEarnedTitles={() => navigate('/dashboard/profile')}
      />

      <AnimatePresence>
        {indexCat && (
          <CatalogIndex key="index" model={model} initialCategory={indexCat} onClose={() => setIndexCat(null)}
            onOpenItem={(it) => setSheetId(it.id)} onWish={handleWish} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sheetItem && (
          <ItemSheet key={sheetItem.id} item={sheetItem} gems={gems} busy={buying === sheetItem.id}
            leavesInMs={sheetItem.inVault ? vaultRemaining : remaining} justBought={justBought?.id === sheetItem.id ? justBought.t : 0}
            onClose={closeSheet} onBuy={handleBuy} onEquip={handleEquip} onWish={handleWish} />
        )}
      </AnimatePresence>

      {intro && !loading && !loadError && model.dropCount > 0 && (
        <DropIntro dropNumber={model.dropNumber} tiers={model.dropTiers} count={model.dropCount}
          vaultItem={model.vault.find((v) => v.vaultSlot === 'mythic') || null} vaultIsNew={vaultIsNew} onDone={finishIntro} />
      )}

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
    </>
  );
}
