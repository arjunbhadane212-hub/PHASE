import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMode } from '../contexts/ModeContext';
import { useGame } from '../contexts/GameContext';
import { Gem, Lock, Clock, Check, Zap, Palette, Crown, Diamond, Image, Sparkles, Frame, Star, Swords } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { soundEngine } from '../utils/SoundEngine';
import MysteryBoxesHeader from '../components/MysteryBoxesHeader';
import BoxDetailModal from '../components/BoxDetailModal';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const ITEM_IMAGES = { shield: '/shop-icons/shield_item.png', zap: '/shop-icons/lightning_boost.png' };
const DEFAULT_IMAGE = '/shop-icons/crystal_cluster.png';
const SPOTLIGHT_IMAGE = '/shop-icons/spotlight_crystal.png';

const RARITY_BORDER = {
  common: 'border-blue-900/40 hover:border-blue-700/50',
  rare: 'border-purple-700/50 hover:border-purple-500/60',
  legendary: 'border-amber-700/50 hover:border-amber-500/60',
  mythic: 'border-pink-700/50 hover:border-pink-500/60',
};
const RARITY_BADGE_STYLE = {
  common: '', rare: 'bg-purple-500/20 text-purple-400',
  legendary: 'bg-amber-500/20 text-amber-400', mythic: 'bg-pink-500/20 text-pink-400',
};

function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    if (!targetDate) return;
    const tick = () => {
      const diff = new Date(targetDate) - new Date();
      if (diff <= 0) { setTimeLeft('Restocking...'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${d}D ${h}h ${m}m`);
    };
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, [targetDate]);
  return timeLeft;
}

export default function ShopPage() {
  const { refreshUser } = useAuth();
  const { isGameMode } = useMode();
  const { gems, fetchGameStatus } = useGame();
  const [tab, setTab] = useState('powerups');
  const [openedBoxId, setOpenedBoxId] = useState(null);
  const [shopItems, setShopItems] = useState([]);
  const [nextRestock, setNextRestock] = useState('');
  const [colors, setColors] = useState({ main_colors: [], banner_colors: [] });
  const [profileItems, setProfileItems] = useState({ icons: [], animations: [], banners: [], decorations: [], battles: [] });
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);
  const countdown = useCountdown(nextRestock);

  const fetchShop = useCallback(async () => {
    try {
      const [shopResp, colorsResp, profileResp] = await Promise.all([
        axios.get(`${API}/game/shop`),
        axios.get(`${API}/game/colors`),
        axios.get(`${API}/shop/profile-items`),
      ]);
      setShopItems(shopResp.data.items || []);
      setNextRestock(shopResp.data.next_restock || '');
      setColors(colorsResp.data);
      setProfileItems(profileResp.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchShop(); }, [fetchShop]);

  const handleBuy = async (itemId) => {
    setBuying(itemId);
    try {
      const { data } = await axios.post(`${API}/game/shop/buy/${itemId}`);
      soundEngine.purchase();
      toast.success(data.message);
      await Promise.all([fetchShop(), fetchGameStatus(), refreshUser()]);
    } catch (e) { toast.error(e.response?.data?.detail || 'Purchase failed'); }
    finally { setBuying(null); }
  };

  const handleBuyColor = async (hex, type) => {
    setBuying(`color-${hex}`);
    try {
      const { data } = await axios.post(`${API}/game/shop/buy-color`, { color_hex: hex, color_type: type });
      soundEngine.purchase();
      toast.success(data.message);
      await Promise.all([fetchShop(), fetchGameStatus(), refreshUser()]);
    } catch (e) { toast.error(e.response?.data?.detail || 'Purchase failed'); }
    finally { setBuying(null); }
  };

  const handleBuyProfileItem = async (key, type) => {
    setBuying(`${type}-${key}`);
    try {
      const { data } = await axios.post(`${API}/shop/buy-profile-item`, { key, type });
      soundEngine.purchase();
      toast.success(data.message);
      await Promise.all([fetchShop(), fetchGameStatus(), refreshUser()]);
    } catch (e) { toast.error(e.response?.data?.detail || 'Purchase failed'); }
    finally { setBuying(null); }
  };

  const spotlightItem = shopItems.find(i => i.rarity === 'legendary') || shopItems[0];

  const TABS = [
    { id: 'powerups', icon: Zap, label: 'Boosts' },
    { id: 'colors', icon: Palette, label: 'Colors' },
    { id: 'anims', icon: Sparkles, label: 'Anims' },
    { id: 'banners', icon: Frame, label: 'Banners' },
    { id: 'decos', icon: Star, label: 'Effects' },
    { id: 'battles', icon: Swords, label: 'Battles' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-32 md:pb-8 animate-slide-up relative" data-testid="shop-page">
      <div className="shop-stars" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 relative z-10">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold font-['Satoshi'] text-white" data-testid="shop-title">Shop</h1>
          <div className="flex items-center gap-2 mt-1">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-500" data-testid="restock-timer">Restocks: {countdown || '...'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-[#0C1220] border border-[#1A2438]" data-testid="shop-gem-balance">
          <Gem className="w-4 sm:w-5 h-4 sm:h-5 text-blue-400" />
          <span className="text-base sm:text-lg font-bold text-blue-300">{gems ?? 0}</span>
        </div>
      </div>

      {/* Persistent Mystery Boxes — sticky header, single source of truth, persists across tab navigation */}
      <div
        className="-mx-3 sm:-mx-6 mb-4 sm:mb-6 sticky top-0 z-30 pt-3 pb-3"
        style={{
          background: 'linear-gradient(180deg, rgba(7,10,17,0.97) 0%, rgba(7,10,17,0.92) 80%, rgba(7,10,17,0) 100%)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        data-testid="mystery-boxes-section"
      >
        <MysteryBoxesHeader
          onOpenBox={(id) => setOpenedBoxId(id)}
        />
      </div>

      {/* Box detail modal (data-driven; opening flow handled in next prompt) */}
      <BoxDetailModal
        boxId={openedBoxId}
        userGems={gems ?? 0}
        onClose={() => setOpenedBoxId(null)}
        onOpen={(id) => {
          // Opening animation + reward grant handled in next prompt.
          toast(`Opening ${id.toUpperCase()} box — flow coming next.`);
        }}
      />

      {/* Spotlight */}
      {spotlightItem && (
        <div className="mb-4 sm:mb-6 relative overflow-hidden rounded-2xl border border-[#1A2438]" data-testid="shop-spotlight">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-950/90 via-purple-950/70 to-blue-950/90" />
          <div className="relative p-4 sm:p-6 flex items-center gap-4 sm:gap-6">
            <div className="flex-shrink-0 w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center">
              <img src={SPOTLIGHT_IMAGE} alt="Spotlight" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-xl font-bold text-white font-['Satoshi'] mb-1">Shop Spotlight</h2>
              <p className="text-xs sm:text-sm text-zinc-400 mb-2 sm:mb-3 line-clamp-2">{spotlightItem.description || 'Featured item. Limited stock!'}</p>
              <Button onClick={() => handleBuy(spotlightItem.id)} disabled={buying === spotlightItem.id} className="bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm px-4 h-8 sm:h-9 rounded-lg" data-testid="spotlight-buy-btn">
                {buying === spotlightItem.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Shop now'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs - scrollable on mobile */}
      <div className="flex gap-1.5 mb-4 sm:mb-6 overflow-x-auto no-scrollbar relative z-10" data-testid="shop-tabs">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              tab === id ? 'bg-[#101828] text-[#4D8EF0] border border-[#1A2438]' : 'bg-[#0C1220] text-zinc-500 border border-transparent hover:text-zinc-300'
            }`} data-testid={`tab-${id}`}>
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : tab === 'powerups' ? (
          <PowerUpsGrid items={shopItems} gems={gems} buying={buying} onBuy={handleBuy} />
        ) : tab === 'colors' ? (
          <ColorsGrid colors={colors} gems={gems} buying={buying} onBuyColor={handleBuyColor} />
        ) : tab === 'anims' ? (
          <ProfileItemsGrid items={profileItems.animations} type="animation" gems={gems} buying={buying} onBuy={handleBuyProfileItem} />
        ) : tab === 'banners' ? (
          <ProfileItemsGrid items={profileItems.banners} type="banner" gems={gems} buying={buying} onBuy={handleBuyProfileItem} />
        ) : tab === 'decos' ? (
          <DecorationsGrid items={profileItems.decorations || []} gems={gems} buying={buying} onBuy={handleBuyProfileItem} />
        ) : (
          <BattleEffectsGrid items={profileItems.battles || []} gems={gems} buying={buying} onBuy={handleBuyProfileItem} />
        )}
      </div>

      {/* How to Earn Gems */}
      <div className="mt-6 sm:mt-8 rounded-2xl bg-[#0C1220] border border-[#1A2438] p-4 sm:p-5 relative z-10" data-testid="earn-gems-section">
        <h3 className="text-xs sm:text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3 sm:mb-4">How to Earn Gems</h3>
        <div className="space-y-2 sm:space-y-3">
          {[{ label: 'Easy habit', amount: '+5' }, { label: 'Medium habit', amount: '+10' }, { label: 'Hard habit', amount: '+20' }, { label: 'Level up', amount: '+50' }, { label: 'All habits in a day', amount: '+10' }].map((row) => (
            <div key={row.label} className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-zinc-400">{row.label}</span>
              <span className="flex items-center gap-1.5 text-blue-400 font-medium"><Gem className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> {row.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PowerUpsGrid({ items, gems, buying, onBuy }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3" data-testid="powerups-grid">
      {items.map((item, idx) => {
        const imgSrc = ITEM_IMAGES[item.icon] || DEFAULT_IMAGE;
        const border = RARITY_BORDER[item.rarity] || RARITY_BORDER.common;
        const isBuying = buying === item.id;
        const isFull = item.owned >= item.max;
        const canAfford = (gems ?? 0) >= item.price;
        return (
          <button key={`${idx}-${item.id}`} onClick={() => !isFull && canAfford && !isBuying && onBuy(item.id)} disabled={isFull || !canAfford || isBuying}
            className={`relative p-3 sm:p-5 rounded-2xl border transition-all hover-lift text-center group ${border} ${isFull ? 'opacity-40' : !canAfford ? 'opacity-60' : ''}`}
            style={{ background: '#0C1220' }} data-testid={`shop-item-${item.id}`}>
            {item.rarity !== 'common' && <div className={`absolute top-2 right-2 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full ${RARITY_BADGE_STYLE[item.rarity] || ''}`}>{item.rarity.toUpperCase()}</div>}
            <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-2 sm:mb-3 flex items-center justify-center">
              <img src={imgSrc} alt={item.name} className="w-full h-full object-contain transition-transform group-hover:scale-110" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-white mb-0.5 truncate">{item.name}</p>
            <p className="text-[9px] sm:text-[10px] text-zinc-600 mb-1.5 sm:mb-2.5">{item.owned}/{item.max}</p>
            {isBuying ? <div className="w-4 h-4 mx-auto border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> : isFull ? <span className="flex items-center justify-center gap-1 text-[10px] sm:text-xs text-zinc-600"><Lock className="w-3 h-3" /> Full</span> : <span className="flex items-center justify-center gap-1 text-xs sm:text-sm font-semibold text-blue-400"><Gem className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> {item.price}</span>}
          </button>
        );
      })}
    </div>
  );
}

function ColorsGrid({ colors, gems, buying, onBuyColor }) {
  const allColors = [...colors.main_colors.map(c => ({ ...c, colorType: 'main' })), ...colors.banner_colors.map(c => ({ ...c, colorType: 'banner' }))];
  const order = { mythic: -1, legendary: 0, rare: 1, common: 2 };
  const sorted = [...allColors].sort((a, b) => (order[a.rarity] ?? 2) - (order[b.rarity] ?? 2));
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3" data-testid="colors-grid">
      {sorted.map((color) => {
        const border = RARITY_BORDER[color.rarity] || RARITY_BORDER.common;
        const isBuying = buying === `color-${color.hex}`;
        const canAfford = (gems ?? 0) >= color.price;
        return (
          <button key={`${color.colorType}-${color.hex}`} onClick={() => !color.owned && canAfford && !isBuying && onBuyColor(color.hex, color.colorType)} disabled={color.owned || !canAfford || isBuying}
            className={`relative p-3 sm:p-5 rounded-2xl border transition-all hover-lift text-center group ${border}`}
            style={{ background: '#0C1220' }} data-testid={`color-${color.hex}`}>
            {color.rarity !== 'common' && <div className={`absolute top-2 right-2 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full ${RARITY_BADGE_STYLE[color.rarity] || ''}`}>{color.rarity.toUpperCase()}</div>}
            <div className="w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-2 sm:mb-3 relative flex items-center justify-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-white/10 group-hover:scale-105 transition-transform" style={{ backgroundColor: color.hex, boxShadow: `0 0 20px ${color.hex}30` }}>
                {color.selected && <Check className="w-5 h-5 text-white absolute inset-0 m-auto" />}
              </div>
            </div>
            <p className="text-xs sm:text-sm font-medium text-white mb-0.5 truncate">{color.name}</p>
            <p className="text-[9px] sm:text-[10px] text-zinc-600 mb-1.5 capitalize">{color.colorType}</p>
            {color.owned ? <span className="text-[10px] sm:text-xs text-emerald-400 font-medium">{color.selected ? 'Equipped' : 'Owned'}</span> : isBuying ? <div className="w-4 h-4 mx-auto border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> : <span className="flex items-center justify-center gap-1 text-xs sm:text-sm font-semibold text-blue-400"><Gem className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> {color.price}</span>}
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
        const border = RARITY_BORDER[item.rarity] || RARITY_BORDER.common;
        const isBuying = buying === `${type}-${item.key}`;
        const canAfford = (gems ?? 0) >= item.price;
        const animClass = type === 'animation' ? item.css || '' : '';
        return (
          <button key={item.key} onClick={() => !item.owned && canAfford && !isBuying && onBuy(item.key, type)} disabled={item.owned || !canAfford || isBuying}
            className={`relative p-3 sm:p-5 rounded-2xl border transition-all hover-lift text-center group ${border}`}
            style={{ background: '#0C1220' }} data-testid={`shop-${type}-${item.key}`}>
            {item.rarity !== 'common' && <div className={`absolute top-2 right-2 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full ${RARITY_BADGE_STYLE[item.rarity] || ''}`}>{item.rarity.toUpperCase()}</div>}
            {/* Preview */}
            <div className="w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-2 sm:mb-3 flex items-center justify-center">
              {type === 'banner' ? (
                <div className="w-full h-10 sm:h-14 rounded-lg" style={{ background: item.gradient || '#1F2937' }} />
              ) : type === 'animation' ? (
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-blue-500/20 border border-blue-500/30 ${animClass}`} />
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </div>
              )}
            </div>
            <p className="text-xs sm:text-sm font-medium text-white mb-0.5 truncate">{item.name}</p>
            <p className="text-[9px] sm:text-[10px] text-zinc-600 mb-1.5 capitalize">{item.rarity}</p>
            {item.owned ? <span className="text-[10px] sm:text-xs text-emerald-400 font-medium">Owned</span> : isBuying ? <div className="w-4 h-4 mx-auto border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> : <span className="flex items-center justify-center gap-1 text-xs sm:text-sm font-semibold text-blue-400"><Gem className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> {item.price}</span>}
          </button>
        );
      })}
    </div>
  );
}


function DecorationsGrid({ items, gems, buying, onBuy }) {
  return (
    <div>
      <div className="mb-4 p-3 rounded-xl bg-[#101828] border border-[#1A2438]">
        <p className="text-xs text-[#4D8EF0] font-medium">Profile Effects</p>
        <p className="text-[10px] text-zinc-500 mt-0.5">Full-width animated banners for your profile. Replaces your banner with a stunning animated scene.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="decorations-grid">
        {items.map((item) => {
          const isBuying = buying === `decoration-${item.key}`;
          const canAfford = (gems ?? 0) >= item.price;
          return (
            <button
              key={item.key}
              onClick={() => !item.owned && canAfford && !isBuying && onBuy(item.key, 'decoration')}
              disabled={item.owned || !canAfford || isBuying}
              className="relative rounded-2xl border border-[#1A2438] overflow-hidden transition-all hover-lift text-left group"
              style={{ background: '#0C1220' }}
              data-testid={`shop-deco-${item.key}`}
            >
              {/* Full-width animated banner preview */}
              <div className={`h-24 sm:h-28 w-full ${item.css}`} />
              <div className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-white">{item.name}</p>
                  <p className="text-[9px] text-zinc-600">Profile Effect</p>
                </div>
                {item.owned ? (
                  <span className="text-[10px] sm:text-xs text-emerald-400 font-medium px-2 py-1 rounded-full bg-emerald-500/10">Owned</span>
                ) : isBuying ? (
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${canAfford ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-600 bg-zinc-800'}`}>
                    <Gem className="w-3 h-3" /> {item.price.toLocaleString()}
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
      <div className="mb-4 p-3 rounded-xl bg-[#101828] border border-[#1A2438]">
        <p className="text-xs text-amber-400 font-medium flex items-center gap-1.5"><Swords className="w-3.5 h-3.5" /> Battle Scenes</p>
        <p className="text-[10px] text-zinc-500 mt-0.5">Premium illustrated battle scenes for your profile banner. Epic hand-painted artwork.</p>
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
              className="relative rounded-2xl border border-amber-900/30 overflow-hidden transition-all hover-lift text-left group"
              style={{ background: '#0C1220' }}
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
                  <p className="text-xs sm:text-sm font-medium text-white">{item.name}</p>
                  <p className="text-[9px] text-amber-500/60">Premium Battle Scene</p>
                </div>
                {item.owned ? (
                  <span className="text-[10px] sm:text-xs text-emerald-400 font-medium px-2 py-1 rounded-full bg-emerald-500/10">Owned</span>
                ) : isBuying ? (
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${canAfford ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-600 bg-zinc-800'}`}>
                    <Gem className="w-3 h-3" /> {item.price.toLocaleString()}
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
