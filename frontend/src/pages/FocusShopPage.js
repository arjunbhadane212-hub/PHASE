import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { Gem, Flame, Shield, Clock, Check, Loader2, Play, Square, Volume2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';
import { AURA_ORDER, getAura, hexA, GRACE_TIERS } from '../data/focusAuras';
import { SOUND_ORDER, getSound, createSoundEngine } from '../data/focusSounds';

// v2 system: borderless cards on --gm-card with card shadow, cyan (#95DEE6/ink
// #183A3F) as the primary/active accent, Archivo/JetBrains/General Sans type.
const CARD = 'rounded-2xl bg-[color:var(--gm-card)] shadow-[var(--gm-shadow-card)]';
const GEM_ICON = 'text-[#95DEE6]';
const MONO = "font-['JetBrains_Mono'] uppercase tracking-[0.08em]";
const SECTION_LABEL = `${MONO} text-[11px] font-bold text-[color:var(--gm-muted)]`;
const PREVIEW_MS = 4500;

const TABS = [
  { id: 'essentials', label: 'Essentials' },
  { id: 'upgrades', label: 'Upgrades' },
  { id: 'screens', label: 'Screens' },
  { id: 'sounds', label: 'Sounds' },
];

function BuyButton({ price, gems, busy, onClick, testId, disabledLabel }) {
  const affordable = (gems ?? 0) >= price;
  return (
    <Button
      onClick={onClick}
      disabled={busy || !affordable}
      className={`text-sm px-4 h-9 rounded-full flex-shrink-0 font-bold ${
        !affordable ? 'bg-[color:var(--gm-badge)] text-[color:var(--gm-muted)] cursor-not-allowed' : 'bg-[#95DEE6] hover:brightness-105 text-[#183A3F]'
      }`}
      data-testid={testId}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> :
       !affordable ? (disabledLabel || 'Not enough') :
       <span className="flex items-center gap-1.5"><Gem className="w-3.5 h-3.5" /> {price}</span>}
    </Button>
  );
}

export default function FocusShopPage() {
  const { user, refreshUser } = useAuth();
  const { gems } = useGame();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'essentials';
  const setTab = (id) => setParams({ tab: id }, { replace: true });

  const [items, setItems] = useState([]);
  const [qty, setQty] = useState({}); // shop_item id -> quantity
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // item key mid-purchase
  const [previewKey, setPreviewKey] = useState(null);
  const previewRef = useRef({ engine: null, timer: null });

  // Focus Mode shop: Streak Revive (Step 6 override) plus Focus-native gem
  // sinks that never touch XP — Grace Extender, Timer Screens, Session Sounds.
  // Screens and sounds are bought here and equipped in Settings. Streak Shield
  // stays the 500g home-screen button (buy_focus_shield).
  const fetchShop = useCallback(async () => {
    try {
      const { data: rows } = await supabase
        .from('shop_items')
        .select('id,key,name,price_gems,max_owned,category')
        .eq('is_active', true)
        .in('category', ['boost', 'focus_boost', 'focus_aura', 'focus_sound']);
      const list = rows || [];
      setItems(list);
      const ids = list.map((r) => r.id);
      if (ids.length) {
        const { data: inv } = await supabase
          .from('user_inventory').select('shop_item_id, quantity').in('shop_item_id', ids);
        const q = {};
        (inv || []).forEach((r) => { q[r.shop_item_id] = r.quantity; });
        setQty(q);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchShop(); }, [fetchShop]);

  const stopPreview = useCallback(() => {
    const p = previewRef.current;
    clearTimeout(p.timer);
    p.engine?.stop();
    previewRef.current = { engine: null, timer: null };
    setPreviewKey(null);
  }, []);
  useEffect(() => stopPreview, [stopPreview]);
  useEffect(() => { if (tab !== 'sounds') stopPreview(); }, [tab, stopPreview]);

  const togglePreview = (key) => {
    if (previewKey === key) { stopPreview(); return; }
    stopPreview();
    const engine = createSoundEngine(key);
    if (!engine) { toast.error('Audio is not available in this browser'); return; }
    engine.start();
    const timer = setTimeout(stopPreview, PREVIEW_MS);
    previewRef.current = { engine, timer };
    setPreviewKey(key);
  };

  const owned = (item) => (item ? (qty[item.id] ?? 0) : 0);
  const byKey = (k) => items.find((r) => r.key === k);

  const buy = async (item, message) => {
    if (busy) return;
    setBusy(item.key);
    try {
      const { error } = await supabase.rpc('purchase_shop_item', { p_shop_item_id: item.id });
      if (error) throw error;
      toast.success(message);
      await Promise.all([refreshUser(), fetchShop()]);
    } catch (e) {
      toast.error(e?.message || 'Purchase failed');
    } finally { setBusy(null); }
  };

  const revive = byKey('streak_revive');
  const reviveOwned = owned(revive);
  const reviveMax = revive?.max_owned ?? 3;

  const graceItems = items.filter((r) => r.category === 'focus_boost');
  const ownedGraceKeys = new Set(GRACE_TIERS.filter((t) => owned(graceItems.find((r) => r.key === t.key)) > 0).map((t) => t.key));
  const currentGraceTier = [...GRACE_TIERS].reverse().find((t) => ownedGraceKeys.has(t.key));
  const nextGraceTier = GRACE_TIERS.find((t) => !ownedGraceKeys.has(t.key));
  const nextGraceItem = nextGraceTier ? graceItems.find((r) => r.key === nextGraceTier.key) : null;

  const equippedAuraKey = user?.equipped_focus_aura || 'focus_aura_cyan_pulse';
  const equippedSoundKey = user?.equipped_focus_sound || null;

  const screenCount = useMemo(
    () => AURA_ORDER.filter((k) => k === 'focus_aura_cyan_pulse' || owned(byKey(k)) > 0).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, qty],
  );
  const soundCount = useMemo(
    () => SOUND_ORDER.filter((k) => owned(byKey(k)) > 0).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, qty],
  );
  const tabMeta = {
    essentials: `${reviveOwned}/${reviveMax}`,
    upgrades: currentGraceTier ? `${ownedGraceKeys.size}/${GRACE_TIERS.length}` : null,
    screens: `${screenCount}/${AURA_ORDER.length}`,
    sounds: `${soundCount}/${SOUND_ORDER.length}`,
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 border-2 border-[#95DEE6] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const equipHint = (to, text) => (
    <Link to={to} className={`${MONO} text-[10px] text-[#95DEE6] hover:underline`} data-testid="focus-equip-link">{text}</Link>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-32 md:pb-8 animate-slide-up" data-testid="focus-shop-page">
      {/* Sticky header: title, gem balance and tabs stay in view while scrolling */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-6 pb-3 bg-[color:var(--gm-bg)]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl sm:text-3xl font-['Archivo'] font-extrabold text-[color:var(--gm-ink)] tracking-[-0.01em]">Shop</h1>
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-[#95DEE6]" data-testid="focus-gem-balance">
            <Gem className="w-4 sm:w-5 h-4 sm:h-5 text-[#183A3F]" />
            <span className="text-base sm:text-lg font-['Archivo'] font-black text-[#183A3F]">{gems ?? 0}</span>
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar" role="tablist" data-testid="focus-shop-tabs">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full ${MONO} text-[11px] font-bold transition-colors ${
                  active ? 'bg-[#95DEE6] text-[#183A3F]' : 'text-[color:var(--gm-muted)] hover:text-[color:var(--gm-ink)]'
                }`}
                data-testid={`focus-tab-${t.id}`}
              >
                {t.label}
                {tabMeta[t.id] && <span className={active ? 'opacity-70' : 'opacity-60'}>{tabMeta[t.id]}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 space-y-3" role="tabpanel">
        {tab === 'essentials' && (
          <>
            {revive && (
              <div className={`p-4 ${CARD} flex items-center gap-4`} data-testid="focus-item-streak_revive">
                <div className="w-12 h-12 rounded-xl bg-[#95DEE6] flex items-center justify-center flex-shrink-0">
                  <Flame className="w-6 h-6 text-[#183A3F]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-['General_Sans'] font-semibold text-[color:var(--gm-ink)]">{revive.name}</p>
                  <p className="text-xs text-[color:var(--gm-muted)] mt-0.5">Restores a broken streak</p>
                  <p className={`${MONO} text-[10px] text-[color:var(--gm-muted)] mt-1.5`}>{reviveOwned}/{reviveMax} owned</p>
                </div>
                {reviveOwned >= reviveMax ? (
                  <span className={`${MONO} text-xs text-[color:var(--gm-muted)] flex-shrink-0`}>Max</span>
                ) : (
                  <BuyButton price={revive.price_gems ?? 200} gems={gems} busy={busy === revive.key}
                    onClick={() => buy(revive, 'Streak Revive purchased!')} testId="focus-buy-streak_revive" />
                )}
              </div>
            )}
            <div className={`p-4 ${CARD} flex items-center gap-3`} data-testid="focus-shield-pointer">
              <div className="w-10 h-10 rounded-xl bg-[color:var(--gm-badge)] flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-[#95DEE6]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-['General_Sans'] font-semibold text-[color:var(--gm-ink)]">Streak Shield</p>
                <p className="text-xs text-[color:var(--gm-muted)] mt-0.5">Sold on your home screen.</p>
              </div>
              <Link to="/dashboard" className={`${MONO} text-[10px] text-[#95DEE6] hover:underline flex-shrink-0`}>Go home</Link>
            </div>
          </>
        )}

        {tab === 'upgrades' && (
          <div className={`p-4 ${CARD}`} data-testid="focus-item-grace-extender">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[color:var(--gm-badge)] flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-[#95DEE6]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-['General_Sans'] font-semibold text-[color:var(--gm-ink)]">Grace Extender</p>
                <p className="text-xs text-[color:var(--gm-muted)] mt-0.5">
                  How long you can leave the tab before the session fails. Default 3s.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {GRACE_TIERS.map((t) => {
                const have = ownedGraceKeys.has(t.key);
                const isNext = nextGraceTier?.key === t.key;
                const item = graceItems.find((r) => r.key === t.key);
                return (
                  <div key={t.key} className="flex items-center gap-3 rounded-xl bg-[color:var(--gm-bg)] px-3 py-2.5" data-testid={`focus-grace-tier-${t.key}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${have ? 'bg-[#95DEE6]' : 'border border-[color:var(--gm-track)]'}`}>
                      {have && <Check className="w-3 h-3 text-[#183A3F]" strokeWidth={3} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-['General_Sans'] font-bold text-[color:var(--gm-ink)] leading-tight">{t.name}</p>
                      <p className={`${MONO} text-[10px] text-[color:var(--gm-muted)] mt-0.5`}>{t.graceMs / 1000}s grace</p>
                    </div>
                    {have ? (
                      <span className={`${MONO} text-[10px] font-bold text-[#95DEE6]`}>Active</span>
                    ) : isNext && item ? (
                      <BuyButton price={item.price_gems} gems={gems} busy={busy === item.key}
                        onClick={() => buy(item, `${item.name} unlocked!`)} testId={`focus-buy-${t.key}`} />
                    ) : (
                      <span className={`${MONO} text-[10px] text-[color:var(--gm-muted)]`}>Unlock {GRACE_TIERS[0].name} first</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'screens' && (
          <>
            <div className="flex items-center justify-between">
              <p className={SECTION_LABEL}>{screenCount} of {AURA_ORDER.length} owned</p>
              {equipHint('/dashboard/settings', 'Equip in Settings')}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" data-testid="focus-aura-section">
              {AURA_ORDER.map((key) => {
                const aura = getAura(key);
                const item = byKey(key);
                const isDefault = key === 'focus_aura_cyan_pulse';
                const isOwned = owned(item) > 0 || isDefault;
                const isEquipped = key === equippedAuraKey;
                return (
                  <div key={key} className={`p-3 ${CARD} flex flex-col items-center text-center ${isEquipped ? 'ring-1 ring-[#95DEE6]' : ''}`} data-testid={`focus-aura-card-${key}`}>
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
                    <p className={`${MONO} text-[9px] text-[color:var(--gm-muted)] mt-0.5`}>{aura.style === 'glow' ? 'Dark · glow' : 'Solid'}</p>
                    <div className="mt-3 h-8 flex items-center">
                      {isEquipped ? (
                        <span className={`${MONO} text-[10px] font-bold text-[#95DEE6]`}>Equipped</span>
                      ) : isOwned ? (
                        <span className={`${MONO} text-[10px] font-bold text-[color:var(--gm-muted)]`}>{isDefault ? 'Default' : 'Owned'}</span>
                      ) : item ? (
                        <BuyButton price={item.price_gems} gems={gems} busy={busy === key}
                          onClick={() => buy(item, `${item.name} unlocked — equip it in Settings`)} testId={`focus-buy-aura-${key}`} disabledLabel={`${item.price_gems}`} />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === 'sounds' && (
          <>
            <div className="flex items-center justify-between">
              <p className={SECTION_LABEL}>{soundCount} of {SOUND_ORDER.length} owned</p>
              {equipHint('/dashboard/settings', 'Equip in Settings')}
            </div>
            <div className="space-y-3" data-testid="focus-sound-section">
              {SOUND_ORDER.map((key) => {
                const sound = getSound(key);
                const item = byKey(key);
                if (!sound) return null;
                const isOwned = owned(item) > 0;
                const isEquipped = key === equippedSoundKey;
                const playing = previewKey === key;
                return (
                  <div key={key} className={`p-4 ${CARD} flex items-center gap-4 ${isEquipped ? 'ring-1 ring-[#95DEE6]' : ''}`} data-testid={`focus-sound-card-${key}`}>
                    <button
                      type="button"
                      onClick={() => togglePreview(key)}
                      className="w-12 h-12 rounded-xl bg-[color:var(--gm-badge)] flex items-center justify-center flex-shrink-0 text-[#95DEE6] hover:brightness-110 transition"
                      aria-label={playing ? `Stop ${sound.name} preview` : `Preview ${sound.name}`}
                      data-testid={`focus-sound-preview-${key}`}
                    >
                      {playing ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-['General_Sans'] font-semibold text-[color:var(--gm-ink)]">{sound.name}</p>
                      <p className="text-xs text-[color:var(--gm-muted)] mt-0.5">{sound.blurb}</p>
                      {playing && <p className={`${MONO} text-[10px] text-[#95DEE6] mt-1.5 flex items-center gap-1`}><Volume2 className="w-3 h-3" /> Previewing</p>}
                    </div>
                    {isEquipped ? (
                      <span className={`${MONO} text-[10px] font-bold text-[#95DEE6] flex-shrink-0`}>Equipped</span>
                    ) : isOwned ? (
                      <span className={`${MONO} text-[10px] font-bold text-[color:var(--gm-muted)] flex-shrink-0`}>Owned</span>
                    ) : item ? (
                      <BuyButton price={item.price_gems} gems={gems} busy={busy === key}
                        onClick={() => buy(item, `${item.name} unlocked — equip it in Settings`)} testId={`focus-buy-sound-${key}`} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

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
