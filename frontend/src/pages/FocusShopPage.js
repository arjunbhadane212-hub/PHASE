import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { Gem, Flame, Shield, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

// v2 system: borderless cards on --gm-card with card shadow, cyan (#95DEE6/ink
// #183A3F) as the primary/active accent, Archivo/JetBrains/General Sans type.
const CARD = 'rounded-2xl bg-[color:var(--gm-card)] shadow-[var(--gm-shadow-card)]';
const GEM_ICON = 'text-[#95DEE6]';

export default function FocusShopPage() {
  const { refreshUser } = useAuth();
  const { gems } = useGame();
  const [revive, setRevive] = useState(null);
  const [owned, setOwned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  // Focus Mode shop is Revive-only (Step 6 override). The sole purchase here is
  // Streak Revive via the canonical purchase_shop_item RPC. XP boosts are banned
  // in Focus; the Streak Shield is the 500g home-screen button (buy_focus_shield),
  // not sold here.
  const fetchShop = useCallback(async () => {
    try {
      const { data: item } = await supabase
        .from('shop_items').select('id,name,price_gems,max_owned')
        .eq('key', 'streak_revive').maybeSingle();
      setRevive(item || null);
      if (item) {
        const { data: inv } = await supabase
          .from('user_inventory').select('quantity')
          .eq('shop_item_id', item.id).maybeSingle();
        setOwned(inv?.quantity ?? 0);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchShop(); }, [fetchShop]);

  const handleBuy = async () => {
    if (!revive) return;
    setBuying(true);
    try {
      const { error } = await supabase.rpc('purchase_shop_item', { p_shop_item_id: revive.id });
      if (error) throw error;
      toast.success('Streak Revive purchased!');
      await Promise.all([refreshUser(), fetchShop()]);
    } catch (e) {
      toast.error(e?.message || 'Purchase failed');
    } finally { setBuying(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 border-2 border-[#95DEE6] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const price = revive?.price_gems ?? 200;
  const max = revive?.max_owned ?? 3;
  const isFull = owned >= max;
  const canAfford = (gems ?? 0) >= price;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-32 md:pb-8 animate-slide-up" data-testid="focus-shop-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-3xl font-['Archivo'] font-extrabold text-[color:var(--gm-ink)] tracking-[-0.01em]">Shop</h1>
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-[#95DEE6]" data-testid="focus-gem-balance">
          <Gem className="w-4 sm:w-5 h-4 sm:h-5 text-[#183A3F]" />
          <span className="text-base sm:text-lg font-['Archivo'] font-black text-[#183A3F]">{gems ?? 0}</span>
        </div>
      </div>

      {/* Streak Revive — the only purchase on this screen */}
      {revive && (
        <div className={`p-4 ${CARD} flex items-center gap-4`} data-testid="focus-item-streak_revive">
          <div className="w-12 h-12 rounded-xl bg-[#95DEE6] flex items-center justify-center flex-shrink-0">
            <Flame className="w-6 h-6 text-[#183A3F]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-['General_Sans'] font-semibold text-[color:var(--gm-ink)]">{revive.name}</p>
            <p className="text-xs text-[color:var(--gm-muted)] mt-0.5">Restores a broken streak</p>
            <p className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.08em] text-[color:var(--gm-muted)] mt-1.5">{owned}/{max} owned</p>
          </div>
          <Button
            onClick={handleBuy}
            disabled={buying || isFull || !canAfford}
            className={`text-sm px-4 h-9 rounded-full flex-shrink-0 font-bold ${
              isFull || !canAfford ? 'bg-[color:var(--gm-badge)] text-[color:var(--gm-muted)] cursor-not-allowed' : 'bg-[#95DEE6] hover:brightness-105 text-[#183A3F]'
            }`}
            data-testid="focus-buy-streak_revive"
          >
            {buying ? <Loader2 className="w-4 h-4 animate-spin" /> :
             isFull ? 'Max' :
             !canAfford ? 'Not enough' :
             <span className="flex items-center gap-1.5"><Gem className="w-3.5 h-3.5" /> {price}</span>}
          </Button>
        </div>
      )}

      {/* Streak Shield pointer — not sold here (500g home-screen button) */}
      <div className={`mt-3 p-4 ${CARD} flex items-center gap-3`} data-testid="focus-shield-pointer">
        <div className="w-10 h-10 rounded-xl bg-[color:var(--gm-badge)] flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-[#95DEE6]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-['General_Sans'] font-semibold text-[color:var(--gm-ink)]">Streak Shield</p>
          <p className="text-xs text-[color:var(--gm-muted)] mt-0.5">Available on your home screen.</p>
        </div>
      </div>

      {/* How to Earn */}
      <div className={`mt-8 p-4 ${CARD}`}>
        <h3 className="font-['JetBrains_Mono'] text-[11px] font-bold text-[color:var(--gm-muted)] uppercase tracking-[0.08em] mb-3">How to Earn Gems</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[color:var(--gm-muted)]">Complete any habit</span>
            <span className="flex items-center gap-1.5 text-[color:var(--gm-ink)] font-['JetBrains_Mono'] font-bold"><Gem className={`w-3.5 h-3.5 ${GEM_ICON}`} /> +10</span>
          </div>
        </div>
      </div>
    </div>
  );
}
