// /dev/shop — the real Shop v3 UI on fixture data (non-production builds only).
// No auth, no gems spent: buying, equipping and wishlisting are simulated in
// local state so the reveal / intro / stamp flows can be checked end to end.
import { useMemo, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import ShopView from '../components/shop/ShopView';
import ItemSheet from '../components/shop/ItemSheet';
import CatalogIndex from '../components/shop/CatalogIndex';
import DropIntro from '../components/shop/DropIntro';
import { buildShopModel, ROTATING } from '../components/shop/shopModel';
import { FIXTURE_CATALOG, fixtureRotation } from '../dev/shopFixture';
import { soundEngine } from '../utils/SoundEngine';

export default function DevShopPage() {
  const [rotation] = useState(() => fixtureRotation());
  const [gems, setGems] = useState(4200);
  const [owned, setOwned] = useState(() => ({ title_ironvow: 1, banner_grid: 1, fx_pulse: 1, anim_drift: 1, title_starter: 1 }));
  const [equippedIds, setEquippedIds] = useState(() => new Set(['banner_grid']));
  const [wishlist, setWishlist] = useState(() => new Set(['title_voidmonarch', 'fx_event_horizon']));
  const [revealed, setRevealed] = useState(() => new Set());
  const [intro, setIntro] = useState(true);
  const [sheetId, setSheetId] = useState(null);
  const [justBought, setJustBought] = useState(null);
  const [indexCat, setIndexCat] = useState(null);
  const [now] = useState(() => Date.now());

  const model = useMemo(() => buildShopModel({ catalog: FIXTURE_CATALOG, rotation, owned, equippedIds, user: null, wishlist }),
    [rotation, owned, equippedIds, wishlist]);
  const dropIds = useMemo(() => ROTATING.flatMap((c) => model.shelves[c].map((i) => i.id)), [model]);
  const isSealed = useCallback((id) => dropIds.includes(id) && !revealed.has(id), [dropIds, revealed]);
  const onReveal = useCallback((id) => setRevealed((p) => (p.has(id) ? p : new Set([...p, id]))), []);
  const findItem = (id) => ROTATING.flatMap((c) => model.index[c]).find((i) => i.id === id) || null;
  const sheetItem = sheetId ? findItem(sheetId) : null;
  const remaining = Math.max(0, new Date(rotation.ends_at).getTime() - now);
  const vaultRemaining = Math.max(0, new Date(rotation.vault.ends_at).getTime() - now);

  const essentials = FIXTURE_CATALOG.filter((r) => r.category === 'boost').sort((a, b) => a.price_gems - b.price_gems).map((r) => ({
    id: r.id, key: r.key, name: r.name, price: r.price_gems, max: r.max_owned, isXpBoost: r.key.startsWith('boost_xp_'), multiplier: r.metadata.multiplier ?? null,
  }));

  const buy = (item) => {
    const price = item.dealPrice ?? item.price;
    if (gems < price) return;
    setGems((g) => g - price);
    setOwned((o) => ({ ...o, [item.id]: 1 }));
    soundEngine.purchase();
    setJustBought({ id: item.id, t: Date.now() });
  };

  return (
    <div className="min-h-screen bg-[color:var(--gm-bg)]">
      <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-3 flex gap-2 flex-wrap">
        <span className="font-label text-[12px] uppercase text-[color:var(--gm-muted)] self-center">Dev preview ·</span>
        <button type="button" className="text-[13px] font-bold px-2.5 py-1 rounded-full bg-[color:var(--gm-card)] text-[color:var(--gm-ink)]" onClick={() => setIntro(true)} data-testid="dev-replay-intro">Replay intro</button>
        <button type="button" className="text-[13px] font-bold px-2.5 py-1 rounded-full bg-[color:var(--gm-card)] text-[color:var(--gm-ink)]" onClick={() => setRevealed(new Set())} data-testid="dev-reseal">Reseal drop</button>
      </div>
      <ShopView
        model={model} gems={gems} loading={false} loadError={false} onRetry={() => {}}
        remainingMs={remaining} vaultRemainingMs={vaultRemaining}
        isSealed={isSealed} onReveal={onReveal} onRevealAll={() => setRevealed(new Set(dropIds))}
        sealedCount={intro ? 0 : dropIds.filter((id) => !revealed.has(id)).length}
        onOpenItem={(it) => { setJustBought(null); setSheetId(it.id); }} onOpenCatalog={(c) => setIndexCat(c)}
        boxes={{}} onOpenBox={() => {}}
        essentials={essentials} buying={null} onBuyEssential={() => {}} onActivateBoost={() => {}}
        activeMultiplier={1} shields={1} revives={0}
        earnedLine="16 more streak days to Contender · 9h of focus to Timekeeper" onEarnedTitles={() => {}}
      />
      <AnimatePresence>
        {indexCat && (
          <CatalogIndex key="index" model={model} initialCategory={indexCat} onClose={() => setIndexCat(null)}
            onOpenItem={(it) => setSheetId(it.id)}
            onWish={(it) => setWishlist((w) => { const n = new Set(w); if (n.has(it.id)) n.delete(it.id); else n.add(it.id); return n; })} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sheetItem && (
          <ItemSheet key={sheetItem.id} item={sheetItem} gems={gems} busy={false}
            leavesInMs={sheetItem.inVault ? vaultRemaining : remaining}
            justBought={justBought?.id === sheetItem.id ? justBought.t : 0}
            onClose={() => { setSheetId(null); setJustBought(null); }} onBuy={buy}
            onEquip={(it) => setEquippedIds((s) => new Set([...s, it.id]))}
            onWish={(it) => setWishlist((w) => { const n = new Set(w); if (n.has(it.id)) n.delete(it.id); else n.add(it.id); return n; })} />
        )}
      </AnimatePresence>
      {intro && (
        <DropIntro dropNumber={model.dropNumber} tiers={model.dropTiers} count={model.dropCount}
          vaultItem={model.vault.find((v) => v.vaultSlot === 'mythic') || null} vaultIsNew onDone={() => setIntro(false)} />
      )}
    </div>
  );
}
