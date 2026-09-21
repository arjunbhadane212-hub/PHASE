import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { Gem, Flame, Shield, Clock, Check, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';
import { AURA_ORDER, getAura, hexA, GRACE_TIERS } from '../data/focusAuras';

// v2 system: borderless cards on --gm-card with card shadow, cyan (#95DEE6/ink
// #183A3F) as the primary/active accent, Archivo/JetBrains/General Sans type.
const CARD = 'rounded-2xl bg-[color:var(--gm-card)] shadow-[var(--gm-shadow-card)]';
const GEM_ICON = 'text-[#95DEE6]';
const SECTION_LABEL = "font-['JetBrains_Mono'] text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--gm-muted)]";

function Section({ title, hint, children }) {
  return (
    <section className="mt-7 first:mt-0">
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <h2 className={SECTION_LABEL}>{title}</h2>
        {hint}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function FocusShopPage() {
  const { user, refreshUser } = useAuth();
  const { gems } = useGame();
  const [revive, setRevive] = useState(null);
  const [owned, setOwned] = useState(0);
  const [graceItems, setGraceItems] = useState([]);
  const [graceOwned, setGraceOwned] = useState({});
  const [auraItems, setAuraItems] = useState([]);
  const [auraOwned, setAuraOwned] = useState({});
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [graceBusy, setGraceBusy] = useState(false);
  const [auraBusy, setAuraBusy] = useState(null);

  // Focus Mode shop: Streak Revive (Step 6 override), plus Focus-native gem
  // sinks that never touch XP — Grace Extender and Timer Screens. Screens are
  // bought here and equipped in Settings. Streak Shield stays the 500g
  // home-screen button (buy_focus_shield).
  const fetchShop = useCallback(async () => {
    try {
      const { data: allItems } = await supabase
        .from('shop_items')
        .select('id,key,name,price_gems,max_owned,category')
        .in('category', ['boost', 'focus_boost', 'focus_aura']);

      const items = allItems || [];
      const item = items.find((r) => r.key === 'streak_revive') || null;
      setRevive(item);

      const grace = items.filter((r) => r.category === 'focus_boost');
      const aura = items.filter((r) => r.category === 'focus_aura');
      setGraceItems(grace);
      setAuraItems(aura);

      const ids = items.map((r) => r.id);
      if (ids.length) {
        const { data: inv } = await supabase
          .from('user_inventory').select('shop_item_id, quantity').in('shop_item_id', ids);
        const byId = {};
        (inv || []).forEach((r) => { byId[r.shop_item_id] = r.quantity; });
        if (item) setOwned(byId[item.id] ?? 0);
        const gOwned = {}; grace.forEach((r) => { gOwned[r.key] = byId[r.id] ?? 0; });
        setGraceOwned(gOwned);
        const aOwned = {}; aura.forEach((r) => { aOwned[r.key] = byId[r.id] ?? 0; });
        setAuraOwned(aOwned);
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

  // Grace Extender: two permanent tiers, highest owned applies. The button
  // always offers the next un-owned tier.
  const graceOwnedKeys = useMemo(() => new Set(Object.keys(graceOwned).filter((k) => graceOwned[k] > 0)), [graceOwned]);
  const currentGraceTier = [...GRACE_TIERS].reverse().find((t) => graceOwnedKeys.has(t.key));
  const nextGraceTier = GRACE_TIERS.find((t) => !graceOwnedKeys.has(t.key));
  const nextGraceItem = nextGraceTier ? graceItems.find((r) => r.key === nextGraceTier.key) : null;

  const handleBuyGrace = async () => {
    if (!nextGraceItem) return;
    setGraceBusy(true);
    try {
      const { error } = await supabase.rpc('purchase_shop_item', { p_shop_item_id: nextGraceItem.id });
      if (error) throw error;
      toast.success(`${nextGraceItem.name} unlocked!`);
      await Promise.all([refreshUser(), fetchShop()]);
    } catch (e) {
      toast.error(e?.message || 'Purchase failed');
    } finally { setGraceBusy(false); }
  };

  // Timer Screens are purchase-only here; equipping lives in Settings.
  const equippedAuraKey = user?.equipped_focus_aura || 'focus_aura_cyan_pulse';

  const handleBuyAura = async (item) => {
    if (auraBusy) return;
    setAuraBusy(item.key);
    try {
      const { error } = await supabase.rpc('purchase_shop_item', { p_shop_item_id: item.id });
      if (error) throw error;
      toast.success(`${item.name} unlocked — equip it in Settings`);
      await Promise.all([refreshUser(), fetchShop()]);
    } catch (e) {
      toast.error(e?.message || 'Purchase failed');
    } finally { setAuraBusy(null); }
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

      {/* Protection */}
      <Section title="Protection">
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
        <div className={`p-4 ${CARD} flex items-center gap-3`} data-testid="focus-shield-pointer">
          <div className="w-10 h-10 rounded-xl bg-[color:var(--gm-badge)] flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-[#95DEE6]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-['General_Sans'] font-semibold text-[color:var(--gm-ink)]">Streak Shield</p>
            <p className="text-xs text-[color:var(--gm-muted)] mt-0.5">Available on your home screen.</p>
          </div>
        </div>
      </Section>

      {/* Focus Upgrades */}
      <Section title="Focus Upgrades">
        <div className={`p-4 ${CARD} flex items-center gap-4`} data-testid="focus-item-grace-extender">
          <div className="w-12 h-12 rounded-xl bg-[color:var(--gm-badge)] flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6 text-[#95DEE6]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-['General_Sans'] font-semibold text-[color:var(--gm-ink)]">Grace Extender</p>
            <p className="text-xs text-[color:var(--gm-muted)] mt-0.5">
              {currentGraceTier ? `${currentGraceTier.name} · ${currentGraceTier.graceMs / 1000}s grace active` : 'Longer buffer before a tab-switch fails your session'}
            </p>
            {nextGraceTier && (
              <p className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.08em] text-[color:var(--gm-muted)] mt-1.5">
                Next: {nextGraceTier.name} · {nextGraceTier.graceMs / 1000}s
              </p>
            )}
          </div>
          {nextGraceItem ? (
            <Button
              onClick={handleBuyGrace}
              disabled={graceBusy || (gems ?? 0) < nextGraceItem.price_gems}
              className={`text-sm px-4 h-9 rounded-full flex-shrink-0 font-bold ${
                (gems ?? 0) < nextGraceItem.price_gems ? 'bg-[color:var(--gm-badge)] text-[color:var(--gm-muted)] cursor-not-allowed' : 'bg-[#95DEE6] hover:brightness-105 text-[#183A3F]'
              }`}
              data-testid="focus-buy-grace-extender"
            >
              {graceBusy ? <Loader2 className="w-4 h-4 animate-spin" /> :
               (gems ?? 0) < nextGraceItem.price_gems ? 'Not enough' :
               <span className="flex items-center gap-1.5"><Gem className="w-3.5 h-3.5" /> {nextGraceItem.price_gems}</span>}
            </Button>
          ) : (
            <span className="text-xs font-['JetBrains_Mono'] uppercase tracking-[0.08em] text-[color:var(--gm-muted)] flex-shrink-0">Maxed</span>
          )}
        </div>
      </Section>

      {/* Timer Screens — buy here, equip in Settings */}
      <Section
        title="Timer Screens"
        hint={<Link to="/dashboard/settings" className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.08em] text-[#95DEE6] hover:underline" data-testid="focus-screens-settings-link">Equip in Settings</Link>}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" data-testid="focus-aura-section">
          {AURA_ORDER.map((key) => {
            const aura = getAura(key);
            const item = auraItems.find((r) => r.key === key);
            const isOwned = (auraOwned[key] ?? 0) > 0;
            const isEquipped = key === equippedAuraKey;
            const isDefault = key === 'focus_aura_cyan_pulse';
            const itemPrice = item?.price_gems ?? 0;
            const busy = auraBusy === key;
            const affordable = (gems ?? 0) >= itemPrice;
            return (
              <div key={key} className={`p-3 ${CARD} flex flex-col items-center text-center`} data-testid={`focus-aura-card-${key}`}>
                <span
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{
                    background: aura.bg,
                    boxShadow: [
                      aura.style === 'glow' ? `0 0 14px 2px ${hexA(aura.accent, 0.45)}` : null,
                      `inset 0 0 0 1px ${hexA(aura.ink, 0.18)}`,
                    ].filter(Boolean).join(', '),
                  }}
                >
                  {isEquipped && <Check className="w-5 h-5" style={{ color: aura.ink }} strokeWidth={3} />}
                </span>
                <p className="mt-2.5 text-[13px] font-['General_Sans'] font-bold text-[color:var(--gm-ink)] leading-tight">{aura.name}</p>
                <p className="font-['JetBrains_Mono'] text-[9px] uppercase tracking-[0.08em] text-[color:var(--gm-muted)] mt-0.5">
                  {aura.style === 'glow' ? 'Dark · glow' : 'Solid'}
                </p>
                <div className="mt-3 h-8 flex items-center">
                  {isEquipped ? (
                    <span className="font-['JetBrains_Mono'] text-[10px] font-bold uppercase tracking-[0.08em] text-[#95DEE6]">Equipped</span>
                  ) : isOwned || (isDefault && itemPrice === 0) ? (
                    <span className="font-['JetBrains_Mono'] text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--gm-muted)]">{isDefault ? 'Default' : 'Owned'}</span>
                  ) : (
                    <Button
                      onClick={() => item && handleBuyAura(item)}
                      disabled={!item || busy || !affordable}
                      className={`text-xs px-3 h-8 rounded-full font-bold ${
                        !affordable ? 'bg-[color:var(--gm-badge)] text-[color:var(--gm-muted)] cursor-not-allowed' : 'bg-[#95DEE6] hover:brightness-105 text-[#183A3F]'
                      }`}
                      data-testid={`focus-buy-aura-${key}`}
                    >
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                       <span className="flex items-center gap-1"><Gem className="w-3 h-3" /> {itemPrice}</span>}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* How to Earn */}
      <div className={`mt-8 p-4 ${CARD}`}>
        <h3 className={`${SECTION_LABEL} mb-3`}>How to Earn Gems</h3>
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
