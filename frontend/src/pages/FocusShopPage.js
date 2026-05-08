import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { Gem, Zap, Shield, Flame, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const ITEM_ICONS = {
  focus_xp_2x: Zap,
  focus_xp_3x: Zap,
  focus_streak_shield: Shield,
  focus_streak_revive: Flame,
};

export default function FocusShopPage() {
  const { refreshUser } = useAuth();
  const { fetchGameStatus } = useGame();
  const [items, setItems] = useState([]);
  const [gems, setGems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);

  const fetchShop = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/focus/shop`);
      setItems(data.items || []);
      setGems(data.gems || 0);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchShop(); }, [fetchShop]);

  const handleBuy = async (itemId) => {
    setBuying(itemId);
    try {
      const { data } = await axios.post(`${API}/focus/shop/buy/${itemId}`);
      toast.success(data.message);
      await Promise.all([fetchShop(), fetchGameStatus(), refreshUser()]);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Purchase failed');
    } finally { setBuying(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-32 md:pb-8 animate-slide-up" data-testid="focus-shop-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold font-['Satoshi'] text-white">Shop</h1>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/60 border border-zinc-700/50" data-testid="focus-gem-balance">
          <Gem className="w-4 h-4 text-zinc-400" />
          <span className="text-base font-bold text-zinc-300">{gems}</span>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3" data-testid="focus-shop-items">
        {items.map(item => {
          const Icon = ITEM_ICONS[item.id] || Zap;
          const isBuying = buying === item.id;
          const isFull = item.owned >= item.max;
          const canAfford = gems >= item.price;

          return (
            <div key={item.id} className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 flex items-center gap-4" data-testid={`focus-item-${item.id}`}>
              <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <Icon className="w-6 h-6 text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{item.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>
                <p className="text-[10px] text-zinc-600 mt-1">{item.owned}/{item.max} owned</p>
              </div>
              <Button
                onClick={() => handleBuy(item.id)}
                disabled={isBuying || isFull || !canAfford}
                className={`text-sm px-4 h-9 rounded-xl flex-shrink-0 ${
                  isFull ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' :
                  !canAfford ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' :
                  'bg-zinc-700 hover:bg-zinc-600 text-white'
                }`}
                data-testid={`focus-buy-${item.id}`}
              >
                {isBuying ? <Loader2 className="w-4 h-4 animate-spin" /> :
                 isFull ? 'Max' :
                 !canAfford ? 'Not enough' :
                 <span className="flex items-center gap-1.5"><Gem className="w-3.5 h-3.5" /> {item.price}</span>}
              </Button>
            </div>
          );
        })}
      </div>

      {/* How to Earn */}
      <div className="mt-8 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800">
        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">How to Earn Gems</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Complete any habit</span>
            <span className="flex items-center gap-1 text-zinc-300 font-medium"><Gem className="w-3 h-3 text-zinc-400" /> +10</span>
          </div>
        </div>
      </div>
    </div>
  );
}
