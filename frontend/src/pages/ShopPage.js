import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { Gem, Lock, Clock, Check, Zap, Palette, Crown, Sparkles, Frame, Star, Swords } from 'lucide-react';
import { toast } from 'sonner';
import { soundEngine } from '../utils/SoundEngine';
import MysteryBoxesHeader from '../components/MysteryBoxesHeader';
import BoxDetailModal from '../components/BoxDetailModal';
import BoxOpening from '../components/BoxOpening';
import { supabase } from '../lib/supabaseClient';
import { boostIconFor } from '../data/shopIcons';
import { animCssFor } from '../data/shopAnimations';
import { effectCssFor } from '../data/shopEffects';
import { ShopItemIcon, SparkleIcon } from '../components/ShopIcons';

// v2 card surface (shared with the rest of the app).
const CARD = 'rounded-2xl bg-[color:var(--gm-card)] shadow-[var(--gm-shadow-card)]';
// v2 gem currency (cyan surface / dark teal ink) + cyan gem icon for prices.
const GEM_ICON = 'text-[#95DEE6]';

// Map a shop_items.rarity to the 3 reveal/display tiers (legendary+mythic -> ultra).
const rarityToTier = (r) => (r === 'common' ? 'common' : r === 'rare' ? 'rare' : 'ultra');

// Adapt open_loot_box's returned items to the shape BoxOpening consumes.
// Duplicates render as a "+N gems" refund card (type:'gems'); real drops as items.
const adaptRolledItems = (items) => (items || []).map((it) => (
  it.duplicate
    ? { tier: rarityToTier(it.rarity), type: 'gems', amount: it.refund, name: it.name, duplicate: true }
    : { tier: rarityToTier(it.rarity), type: 'item', name: it.name, item_key: it.item_key, category: it.category }
));

const BOX_LABELS = { starter: 'STARTER', delta: 'DELTA', phase: 'PHASE' };

// Rarity chips map to the v2 accent language (cyan/lime/purple) instead of the
// old blue/amber/pink. common shows no chip.
const RARITY_BADGE_STYLE = {
  common: '',
  rare: 'bg-[#95DEE6] text-[#183A3F]',
  legendary: 'bg-[#DBF67F] text-[#2A3B0B]',
  mythic: 'bg-[#A59BCC] text-[#1C1433]',
};

// Restock countdown removed with the fixed-catalog migration (Step 2a).
// TODO: timed restock/rotation to be rebuilt in a future session.

export default function ShopPage() {
  const { refreshUser } = useAuth();
  const { gems, fetchGameStatus, activeBoostMultiplier } = useGame();
  const [tab, setTab] = useState('powerups');
  const [openedBoxId, setOpenedBoxId] = useState(null);
  const [openingState, setOpeningState] = useState(null); // { boxId, items } once API resolves
  const [shopItems, setShopItems] = useState([]);
  const [colors, setColors] = useState({ main_colors: [], banner_colors: [] });
  const [profileItems, setProfileItems] = useState({ icons: [], animations: [], banners: [], decorations: [], battles: [] });
  const [boxData, setBoxData] = useState({ byKey: {}, keyToId: {} });
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);

  // Step 2a (Supabase migration): the shop renders from the relational shop_items
  // catalog + the user's inventory/equipped rows (all RLS-scoped to auth.uid()),
  // grouped by category into the shapes the existing grids already expect.
  // Visual assets (boost icons, anim/effect CSS) are graceful fallbacks here and
  // get ported in their own approval-gated commits (Steps 2b/2c/2d).
  const fetchShop = useCallback(async () => {
    try {
      const { data: items, error } = await supabase.from('shop_items').select('*');
      if (error) throw error;

      const [{ data: inv }, { data: eq }, { data: lboxes }, { data: droptab }] = await Promise.all([
        supabase.from('user_inventory').select('shop_item_id, quantity'),
        supabase.from('user_equipped').select('category, shop_item_id'),
        supabase.from('loot_boxes').select('id, key, name, price_gems, items_per_open'),
        supabase.from('loot_box_drop_table').select('loot_box_id, shop_item_id, weight'),
      ]);
      const ownedQty = {};
      (inv || []).forEach((r) => { ownedQty[r.shop_item_id] = r.quantity; });
      const equippedIds = new Set((eq || []).map((r) => r.shop_item_id));

      const rows = items || [];
      const byCat = (cat) => rows.filter((r) => r.category === cat);

      // Boosts -> PowerUpsGrid. icon resolved from the ported boost-icon map
      // (Step 2b; data/shopIcons.js), default crystal image on unknown key.
      setShopItems(byCat('boost').map((r) => ({
        id: r.id,
        key: r.key,
        name: r.name,
        price: r.price_gems,
        rarity: r.rarity,
        icon: boostIconFor(r.key),
        owned: ownedQty[r.id] || 0,
        max: r.max_owned || 1,
        // XP boosts are duration-based consumables: activated via buy_xp_boost,
        // not held in inventory. shield/revive stay count-based via purchase_shop_item.
        isXpBoost: (r.key || '').startsWith('boost_xp_'),
        multiplier: r.metadata?.multiplier ?? null,
      })));

      // Colors -> ColorsGrid (hex swatch is real data).
      const mapColor = (r) => ({
        id: r.id,
        key: r.key,
        hex: r.hex_value,
        name: r.name,
        price: r.price_gems,
        rarity: r.rarity,
        owned: (ownedQty[r.id] || 0) > 0,
        selected: equippedIds.has(r.id),
      });
      setColors({
        main_colors: byCat('color_main').map(mapColor),
        banner_colors: byCat('color_banner').map(mapColor),
      });

      // Anims/Banners/Effects -> ProfileItemsGrid / DecorationsGrid.
      // Anim css from data/shopAnimations.js (Step 2c); effect css from
      // data/shopEffects.js (Step 2d); banner gradient is real data. Unknown
      // keys fall back to '' -> hex/gradient swatch in the grids.
      const mapProfile = (r, css = '') => ({
        id: r.id,
        key: r.key,
        name: r.name,
        price: r.price_gems,
        rarity: r.rarity,
        owned: (ownedQty[r.id] || 0) > 0,
        css,
        gradient: r.gradient_value || null,
        bg: r.gradient_value || r.hex_value || null,
      });
      setProfileItems({
        icons: [],
        battles: [],
        animations: byCat('anim').map((r) => mapProfile(r, animCssFor(r.key))),
        banners: byCat('banner').map((r) => mapProfile(r)),
        decorations: byCat('effect').map((r) => mapProfile(r, effectCssFor(r.key))),
      });

      // Loot boxes: build the box metadata + drop-rate pool the modal shows,
      // straight from loot_boxes + loot_box_drop_table so the displayed odds and
      // items-per-open match what open_loot_box actually rolls.
      // percent = weight / sum(weight) within a box.
      const itemById = {};
      rows.forEach((r) => { itemById[r.id] = r; });
      const byKey = {}; const keyToId = {};
      (lboxes || []).forEach((b) => {
        keyToId[b.key] = b.id;
        const drops = (droptab || [])
          .filter((d) => d.loot_box_id === b.id)
          .sort((a, z) => Number(z.weight) - Number(a.weight));
        const sumW = drops.reduce((s, d) => s + Number(d.weight), 0) || 1;
        const pool = drops.map((d) => {
          const it = itemById[d.shop_item_id] || {};
          return {
            id: it.key || d.shop_item_id,
            name: it.name || it.key || 'Item',
            tier: rarityToTier(it.rarity),
            percent: (Number(d.weight) / sumW) * 100,
          };
        });
        const tiers = ['common', 'rare', 'ultra'].filter((t) => pool.some((p) => p.tier === t));
        byKey[b.key] = {
          id: b.key,
          name: b.name,
          label: BOX_LABELS[b.key] || (b.key || '').toUpperCase(),
          cost: b.price_gems,
          dropsPerOpen: b.items_per_open,
          tiers,
          pool,
        };
      });
      setBoxData({ byKey, keyToId });
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchShop(); }, [fetchShop]);

  // Step 3: every purchase goes through the canonical purchase_shop_item RPC
  // (user derived server-side from auth.uid()). One handler for all buyable
  // categories; each grid passes the item's shop_items.id. The button stays
  // disabled while buying === id (fast double-click guard). NOTE: no server-side
  // concurrency guard yet — see NOTES_FOR_SACHIN.md (pre-launch fix).
  const handleBuy = async (shopItemId) => {
    setBuying(shopItemId);
    try {
      const { data, error } = await supabase.rpc('purchase_shop_item', { p_shop_item_id: shopItemId });
      if (error) throw error;
      soundEngine.purchase();
      const verb = (data.category === 'color_main' || data.category === 'color_banner') ? 'Unlocked' : 'Purchased';
      toast.success(`${verb} ${data.name}!`);
      await Promise.all([fetchShop(), fetchGameStatus(), refreshUser()]);
    } catch (e) {
      toast.error(e?.message || 'Purchase failed');
    } finally {
      setBuying(null);
    }
  };

  // Step 6: XP boosts activate via the canonical buy_xp_boost RPC (duration-based,
  // no inventory/cap). Higher multiplier wins; the RPC rejects a weaker boost while
  // a stronger one is active — surfaced as a toast. Shield/revive stay on handleBuy.
  const handleActivateBoost = async (shopItemId) => {
    setBuying(shopItemId);
    try {
      const { data, error } = await supabase.rpc('buy_xp_boost', { p_shop_item_id: shopItemId });
      if (error) throw error;
      soundEngine.purchase();
      toast.success(`x${data.bought_multiplier} XP Boost active for 24h!`);
      await Promise.all([fetchShop(), fetchGameStatus(), refreshUser()]);
    } catch (e) {
      toast.error(e?.message || 'Could not activate boost');
    } finally {
      setBuying(null);
    }
  };

  const TABS = [
    { id: 'powerups', icon: Zap, label: 'Boosts' },
    { id: 'colors', icon: Palette, label: 'Colors' },
    { id: 'anims', icon: Sparkles, label: 'Anims' },
    { id: 'banners', icon: Frame, label: 'Banners' },
    { id: 'decos', icon: Star, label: 'Effects' },
    { id: 'titles', icon: Crown, label: 'Titles' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-32 md:pb-8 animate-slide-up relative" data-testid="shop-page">
      <div className="shop-stars" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 relative z-10">
        <div>
          <h1 className="text-xl sm:text-3xl font-['Archivo'] font-extrabold text-[color:var(--gm-ink)] tracking-[-0.01em]" data-testid="shop-title">Shop</h1>
          {/* TODO: timed restock/rotation to be rebuilt in a future session.
              Static full catalog for now (fixed-catalog migration, Step 2a). */}
          <div className="flex items-center gap-2 mt-1">
            <Clock className="w-3.5 h-3.5 text-[color:var(--gm-muted)]" />
            <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.08em] text-[color:var(--gm-muted)]" data-testid="restock-timer">Full catalog</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-[#95DEE6]" data-testid="shop-gem-balance">
          <Gem className="w-4 sm:w-5 h-4 sm:h-5 text-[#183A3F]" />
          <span className="text-base sm:text-lg font-['Archivo'] font-black text-[#183A3F]">{gems ?? 0}</span>
        </div>
      </div>

      {/* Mystery Boxes — natural top-of-page position, scrolls with content */}
      <div
        className="-mx-3 sm:-mx-6 mb-4 sm:mb-6 relative z-10"
        data-testid="mystery-boxes-section"
      >
        <MysteryBoxesHeader
          onOpenBox={(id) => setOpenedBoxId(id)}
        />
      </div>

      {/* Box detail modal (data-driven; opening flow handled in next prompt) */}
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

      {/* Box opening — full-screen choreographed sequence */}
      {openingState && (
        <BoxOpening
          boxId={openingState.boxId}
          rolledItems={openingState.items}
          onContinue={async () => {
            setOpeningState(null);
            await Promise.all([fetchShop(), fetchGameStatus(), refreshUser()]);
          }}
        />
      )}

      {/* Tabs - scrollable on mobile */}
      <div className="flex gap-1.5 mb-4 sm:mb-6 overflow-x-auto no-scrollbar relative z-10" data-testid="shop-tabs">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              tab === id ? 'bg-[#95DEE6] text-[#183A3F]' : 'bg-[color:var(--gm-card)] text-[color:var(--gm-muted)] hover:text-[color:var(--gm-ink)]'
            }`} data-testid={`tab-${id}`}>
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-[#95DEE6] border-t-transparent rounded-full animate-spin" /></div>
        ) : tab === 'powerups' ? (
          <PowerUpsGrid items={shopItems} gems={gems} buying={buying} onBuy={handleBuy} onActivate={handleActivateBoost} activeMultiplier={activeBoostMultiplier} />
        ) : tab === 'colors' ? (
          <ColorsGrid colors={colors} gems={gems} buying={buying} onBuy={handleBuy} />
        ) : tab === 'anims' ? (
          <ProfileItemsGrid items={profileItems.animations} type="animation" gems={gems} buying={buying} onBuy={handleBuy} />
        ) : tab === 'banners' ? (
          <ProfileItemsGrid items={profileItems.banners} type="banner" gems={gems} buying={buying} onBuy={handleBuy} />
        ) : tab === 'decos' ? (
          <DecorationsGrid items={profileItems.decorations || []} gems={gems} buying={buying} onBuy={handleBuy} />
        ) : (
          <div className="flex items-center justify-center py-16" data-testid="titles-placeholder">
            <p className="text-sm text-[color:var(--gm-muted)]">Titles coming soon</p>
          </div>
        )}
      </div>

      {/* How to Earn Gems */}
      <div className={`mt-6 sm:mt-8 ${CARD} p-4 sm:p-5 relative z-10`} data-testid="earn-gems-section">
        <h3 className="font-['JetBrains_Mono'] text-[11px] font-bold text-[color:var(--gm-muted)] uppercase tracking-[0.08em] mb-3 sm:mb-4">How to Earn Gems</h3>
        <div className="space-y-2 sm:space-y-3">
          {[{ label: 'Easy habit', amount: '+5' }, { label: 'Medium habit', amount: '+10' }, { label: 'Hard habit', amount: '+20' }, { label: 'Level up', amount: '+50' }, { label: 'All habits in a day', amount: '+10' }].map((row) => (
            <div key={row.label} className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-[color:var(--gm-muted)]">{row.label}</span>
              <span className="flex items-center gap-1.5 text-[color:var(--gm-ink)] font-['JetBrains_Mono'] font-bold"><Gem className={`w-3 sm:w-3.5 h-3 sm:h-3.5 ${GEM_ICON}`} /> {row.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PowerUpsGrid({ items, gems, buying, onBuy, onActivate, activeMultiplier }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3" data-testid="powerups-grid">
      {items.map((item, idx) => {
        const isBuying = buying === item.id;
        const canAfford = (gems ?? 0) >= item.price;

        // XP boosts: duration-based -> Activate 24h / Active, via buy_xp_boost.
        if (item.isXpBoost) {
          const isActive = item.multiplier > 1 && activeMultiplier === item.multiplier;
          return (
            <button key={`${idx}-${item.id}`}
              onClick={() => !isActive && canAfford && !isBuying && onActivate(item.id)}
              disabled={isActive || !canAfford || isBuying}
              className={`relative p-3 sm:p-5 ${CARD} transition-all hover-lift text-center group ${isActive ? 'ring-1 ring-[#95DEE6]' : !canAfford ? 'opacity-60' : ''}`}
              data-testid={`shop-item-${item.id}`}>
              {item.rarity !== 'common' && <div className={`absolute top-2 right-2 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full ${RARITY_BADGE_STYLE[item.rarity] || ''}`}>{item.rarity.toUpperCase()}</div>}
              <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-2 sm:mb-3 flex items-center justify-center">
                <ShopItemIcon itemKey={item.key} className="w-full h-full transition-transform group-hover:scale-110" />
              </div>
              <p className="text-xs sm:text-sm font-['General_Sans'] font-semibold text-[color:var(--gm-ink)] mb-0.5 truncate">{item.name}</p>
              <p className="text-[9px] sm:text-[10px] text-[color:var(--gm-muted)] mb-1.5 sm:mb-2.5">24h duration</p>
              {isBuying ? <div className="w-4 h-4 mx-auto border-2 border-[#95DEE6] border-t-transparent rounded-full animate-spin" /> :
               isActive ? <span className="inline-flex items-center justify-center gap-1 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-[#95DEE6] text-[#183A3F]"><Zap className="w-3 h-3" /> Active</span> :
               !canAfford ? <span className="text-[10px] sm:text-xs text-[color:var(--gm-muted)]">Not enough</span> :
               <span className="flex items-center justify-center gap-1 text-xs sm:text-sm font-bold text-[color:var(--gm-ink)]"><Gem className={`w-3 sm:w-3.5 h-3 sm:h-3.5 ${GEM_ICON}`} /> {item.price}</span>}
            </button>
          );
        }

        // Count-based (streak_shield / streak_revive): unchanged, via purchase_shop_item.
        const isFull = item.owned >= item.max;
        return (
          <button key={`${idx}-${item.id}`} onClick={() => !isFull && canAfford && !isBuying && onBuy(item.id)} disabled={isFull || !canAfford || isBuying}
            className={`relative p-3 sm:p-5 ${CARD} transition-all hover-lift text-center group ${isFull ? 'opacity-40' : !canAfford ? 'opacity-60' : ''}`}
            data-testid={`shop-item-${item.id}`}>
            {item.rarity !== 'common' && <div className={`absolute top-2 right-2 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full ${RARITY_BADGE_STYLE[item.rarity] || ''}`}>{item.rarity.toUpperCase()}</div>}
            <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-2 sm:mb-3 flex items-center justify-center">
              <ShopItemIcon itemKey={item.key} className="w-full h-full transition-transform group-hover:scale-110" />
            </div>
            <p className="text-xs sm:text-sm font-['General_Sans'] font-semibold text-[color:var(--gm-ink)] mb-0.5 truncate">{item.name}</p>
            <p className="text-[9px] sm:text-[10px] text-[color:var(--gm-muted)] mb-1.5 sm:mb-2.5">{item.owned}/{item.max}</p>
            {isBuying ? <div className="w-4 h-4 mx-auto border-2 border-[#95DEE6] border-t-transparent rounded-full animate-spin" /> : isFull ? <span className="flex items-center justify-center gap-1 text-[10px] sm:text-xs text-[color:var(--gm-muted)]"><Lock className="w-3 h-3" /> Full</span> : <span className="flex items-center justify-center gap-1 text-xs sm:text-sm font-bold text-[color:var(--gm-ink)]"><Gem className={`w-3 sm:w-3.5 h-3 sm:h-3.5 ${GEM_ICON}`} /> {item.price}</span>}
          </button>
        );
      })}
    </div>
  );
}

function ColorsGrid({ colors, gems, buying, onBuy }) {
  const allColors = [...colors.main_colors.map(c => ({ ...c, colorType: 'main' })), ...colors.banner_colors.map(c => ({ ...c, colorType: 'banner' }))];
  const order = { mythic: -1, legendary: 0, rare: 1, common: 2 };
  const sorted = [...allColors].sort((a, b) => (order[a.rarity] ?? 2) - (order[b.rarity] ?? 2));
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3" data-testid="colors-grid">
      {sorted.map((color) => {
        const isBuying = buying === color.id;
        const canAfford = (gems ?? 0) >= color.price;
        return (
          <button key={`${color.colorType}-${color.hex}`} onClick={() => !color.owned && canAfford && !isBuying && onBuy(color.id)} disabled={color.owned || !canAfford || isBuying}
            className={`relative p-3 sm:p-5 ${CARD} transition-all hover-lift text-center group`}
            data-testid={`color-${color.hex}`}>
            {color.rarity !== 'common' && <div className={`absolute top-2 right-2 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full ${RARITY_BADGE_STYLE[color.rarity] || ''}`}>{color.rarity.toUpperCase()}</div>}
            <div className="w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-2 sm:mb-3 relative flex items-center justify-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-[color:var(--gm-track)] group-hover:scale-105 transition-transform" style={{ backgroundColor: color.hex, boxShadow: `0 0 20px ${color.hex}30` }}>
                {color.selected && <Check className="w-5 h-5 text-white absolute inset-0 m-auto" />}
              </div>
            </div>
            <p className="text-xs sm:text-sm font-['General_Sans'] font-semibold text-[color:var(--gm-ink)] mb-0.5 truncate">{color.name}</p>
            <p className="text-[9px] sm:text-[10px] text-[color:var(--gm-muted)] mb-1.5 capitalize">{color.colorType}</p>
            {color.owned
              ? <span className={`inline-block text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full ${color.selected ? 'bg-[#95DEE6] text-[#183A3F]' : 'bg-[#DBF67F] text-[#2A3B0B]'}`}>{color.selected ? 'Equipped' : 'Owned'}</span>
              : isBuying ? <div className="w-4 h-4 mx-auto border-2 border-[#95DEE6] border-t-transparent rounded-full animate-spin" />
              : <span className="flex items-center justify-center gap-1 text-xs sm:text-sm font-bold text-[color:var(--gm-ink)]"><Gem className={`w-3 sm:w-3.5 h-3 sm:h-3.5 ${GEM_ICON}`} /> {color.price}</span>}
          </button>
        );
      })}
    </div>
  );
}

function ProfileItemsGrid({ items, type, gems, buying, onBuy }) {
  const order = { mythic: -1, legendary: 0, epic: 0.5, rare: 1, common: 2 };
  const sorted = [...items].sort((a, b) => (order[a.rarity] ?? 2) - (order[b.rarity] ?? 2));
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3" data-testid={`${type}-grid`}>
      {sorted.map((item) => {
        const isBuying = buying === item.id;
        const canAfford = (gems ?? 0) >= item.price;
        const animClass = type === 'animation' ? item.css || '' : '';
        return (
          <button key={item.key} onClick={() => !item.owned && canAfford && !isBuying && onBuy(item.id)} disabled={item.owned || !canAfford || isBuying}
            className={`relative p-3 sm:p-5 ${CARD} transition-all hover-lift text-center group`}
            data-testid={`shop-${type}-${item.key}`}>
            {item.rarity !== 'common' && <div className={`absolute top-2 right-2 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full ${RARITY_BADGE_STYLE[item.rarity] || ''}`}>{item.rarity.toUpperCase()}</div>}
            {/* Preview */}
            <div className="w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-2 sm:mb-3 flex items-center justify-center">
              {type === 'banner' ? (
                <div className="w-full h-10 sm:h-14 rounded-lg" style={{ background: item.gradient || '#1F2937' }} />
              ) : type === 'animation' ? (
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[color:var(--gm-badge)] ${animClass}`} />
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[color:var(--gm-badge)] flex items-center justify-center">
                  <SparkleIcon className="w-7 h-7" />
                </div>
              )}
            </div>
            <p className="text-xs sm:text-sm font-['General_Sans'] font-semibold text-[color:var(--gm-ink)] mb-0.5 truncate">{item.name}</p>
            <p className="text-[9px] sm:text-[10px] text-[color:var(--gm-muted)] mb-1.5 capitalize">{item.rarity}</p>
            {item.owned ? <span className="inline-block text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-[#DBF67F] text-[#2A3B0B]">Owned</span> : isBuying ? <div className="w-4 h-4 mx-auto border-2 border-[#95DEE6] border-t-transparent rounded-full animate-spin" /> : <span className="flex items-center justify-center gap-1 text-xs sm:text-sm font-bold text-[color:var(--gm-ink)]"><Gem className={`w-3 sm:w-3.5 h-3 sm:h-3.5 ${GEM_ICON}`} /> {item.price}</span>}
          </button>
        );
      })}
    </div>
  );
}


function DecorationsGrid({ items, gems, buying, onBuy }) {
  return (
    <div>
      <div className="mb-4 p-3 rounded-xl bg-[color:var(--gm-badge)]">
        <p className="text-xs text-[color:var(--gm-ink)] font-['General_Sans'] font-semibold">Profile Effects</p>
        <p className="text-[10px] text-[color:var(--gm-muted)] mt-0.5">Full-width animated banners for your profile. Replaces your banner with a stunning animated scene.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="decorations-grid">
        {items.map((item) => {
          const isBuying = buying === item.id;
          const canAfford = (gems ?? 0) >= item.price;
          return (
            <button
              key={item.key}
              onClick={() => !item.owned && canAfford && !isBuying && onBuy(item.id)}
              disabled={item.owned || !canAfford || isBuying}
              className={`relative ${CARD} overflow-hidden transition-all hover-lift text-left group`}
              data-testid={`shop-deco-${item.key}`}
            >
              {/* Full-width animated banner preview.
                  Step 2a fallback: hex/gradient swatch until effect CSS is ported (Step 2d). */}
              <div
                className={`h-24 sm:h-28 w-full ${item.css || ''}`}
                style={item.css ? undefined : { background: item.bg || '#1F2937' }}
              />
              <div className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-['General_Sans'] font-semibold text-[color:var(--gm-ink)]">{item.name}</p>
                  <p className="text-[9px] text-[color:var(--gm-muted)]">Profile Effect</p>
                </div>
                {item.owned ? (
                  <span className="text-[10px] sm:text-xs font-bold px-2 py-1 rounded-full bg-[#DBF67F] text-[#2A3B0B]">Owned</span>
                ) : isBuying ? (
                  <div className="w-4 h-4 border-2 border-[#95DEE6] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-[color:var(--gm-badge)] ${canAfford ? 'text-[color:var(--gm-ink)]' : 'text-[color:var(--gm-muted)]'}`}>
                    <Gem className={`w-3 h-3 ${GEM_ICON}`} /> {item.price.toLocaleString()}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}


function BattleEffectsGrid({ items, gems, buying, onBuy }) {
  return (
    <div>
      <div className="mb-4 p-3 rounded-xl bg-[color:var(--gm-badge)]">
        <p className="text-xs text-[color:var(--gm-ink)] font-['General_Sans'] font-semibold flex items-center gap-1.5"><Swords className="w-3.5 h-3.5" /> Battle Scenes</p>
        <p className="text-[10px] text-[color:var(--gm-muted)] mt-0.5">Premium illustrated battle scenes for your profile banner. Epic hand-painted artwork.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="battles-grid">
        {items.map((item) => {
          const isBuying = buying === `decoration-${item.key}`;
          const canAfford = (gems ?? 0) >= item.price;
          return (
            <button
              key={item.key}
              onClick={() => !item.owned && canAfford && !isBuying && onBuy(item.key, 'decoration')}
              disabled={item.owned || !canAfford || isBuying}
              className={`relative ${CARD} overflow-hidden transition-all hover-lift text-left group`}
              data-testid={`shop-battle-${item.key}`}
            >
              {/* Full-width battle scene image */}
              <div className="h-36 sm:h-44 w-full overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover battle-scene-animate"
                  loading="lazy"
                />
              </div>
              <div className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-['General_Sans'] font-semibold text-[color:var(--gm-ink)]">{item.name}</p>
                  <p className="text-[9px] text-[color:var(--gm-muted)]">Premium Battle Scene</p>
                </div>
                {item.owned ? (
                  <span className="text-[10px] sm:text-xs font-bold px-2 py-1 rounded-full bg-[#DBF67F] text-[#2A3B0B]">Owned</span>
                ) : isBuying ? (
                  <div className="w-4 h-4 border-2 border-[#95DEE6] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-[color:var(--gm-badge)] ${canAfford ? 'text-[color:var(--gm-ink)]' : 'text-[color:var(--gm-muted)]'}`}>
                    <Gem className={`w-3 h-3 ${GEM_ICON}`} /> {item.price.toLocaleString()}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
