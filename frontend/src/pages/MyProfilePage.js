import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMode } from '../contexts/ModeContext';
import { Link } from 'react-router-dom';
import { Flame, Target, Calendar, Shield, ExternalLink, Check, ChevronDown, ChevronUp, Gem, X } from 'lucide-react';
import { PhaseBanner } from '../components/banners/PhaseBanners';
import { supabase } from '../lib/supabaseClient';
import { effectCssFor } from '../data/shopEffects';
import { toast } from 'sonner';

// Shop banners (shop_items.key = 'banner_*') and the hardcoded banner SVG set
// (bannerComponents keys = 'starter_/delta_/phase_*') use different key
// namespaces. Map the ones that have real art by key; everything else falls
// back to a neutral placeholder tile. See NOTES_FOR_SACHIN.md (banner art gap).
const BANNER_KEY_TO_ART = {
  banner_circuit: 'starter_circuit',
  banner_grid: 'starter_grid',
  banner_pulse: 'delta_pulse',
  banner_void_fracture: 'delta_void',
};

export default function ProfilePanel({ open, onClose }) {
  const { user, refreshUser } = useAuth();
  const { isGameMode } = useMode();
  const [owned, setOwned] = useState({ titles: [], anims: [], banners: [], effects: [] });
  const [equipping, setEquipping] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);

  // Read owned equippables from Supabase: shop_items + user_inventory joined
  // client-side (same pattern as SettingsPage 4b). Each item carries its real
  // shop_items.id so equip_item can be called by id. Gated on panel `open`.
  const fetchProfile = useCallback(async () => {
    if (!open || !user?.id) return;
    try {
      const [{ data: items }, { data: inv }] = await Promise.all([
        supabase.from('shop_items').select('id,key,name,category,rarity,gradient_value'),
        supabase.from('user_inventory').select('shop_item_id'),
      ]);
      const ownedIds = new Set((inv || []).map((r) => r.shop_item_id));
      const mine = (items || []).filter((i) => ownedIds.has(i.id));
      setOwned({
        titles: mine.filter((i) => i.category === 'title'),
        anims: mine.filter((i) => i.category === 'anim'),
        banners: mine.filter((i) => i.category === 'banner'),
        effects: mine.filter((i) => i.category === 'effect'),
      });
    } catch { /* ignore -> sections show their empty state */ }
  }, [open, user?.id]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // Canonical only: equip/unequip go through the RPCs (no direct users.equipped_*
  // writes). equip_item requires ownership; unequip_item clears the slot and
  // resets the mirrored users column. `category` is the RPC category value
  // (title | anim | banner | effect).
  const handleEquip = async (category, item) => {
    setEquipping(`${category}-${item.key}`);
    try {
      const { error } = await supabase.rpc('equip_item', { p_shop_item_id: item.id });
      if (error) throw error;
      await Promise.all([refreshUser(), fetchProfile()]);
      toast.success('Equipped!');
    } catch (e) {
      toast.error(e?.message || 'Failed');
    } finally { setEquipping(null); }
  };
  const handleUnequip = async (category) => {
    setEquipping(`${category}-null`);
    try {
      const { error } = await supabase.rpc('unequip_item', { p_category: category });
      if (error) throw error;
      await Promise.all([refreshUser(), fetchProfile()]);
      toast.success('Removed');
    } catch (e) {
      toast.error(e?.message || 'Failed');
    } finally { setEquipping(null); }
  };

  const equippedTitle = user?.equipped_title;
  const earnedTitles = owned.titles;
  const ownedAnims = owned.anims;
  const ownedBanners = owned.banners;
  const allOwnedEffects = owned.effects;

  const mainColor = user?.selected_main_color;
  const bannerColor = user?.selected_banner_color || '#1B6AE4';
  const avatarBg = mainColor && mainColor !== '#1F2937' ? mainColor : '#374151';
  const lowerBg = mainColor && mainColor !== '#1F2937' ? mainColor : '#0C1220';

  // Animations carry no css preview in shop_items (the old backend synthesized
  // css_class); the avatar animation class degrades to none. See NOTES_FOR_SACHIN.md.
  const animClass = '';
  const equippedTitleObj = equippedTitle ? earnedTitles.find(t => t.key === equippedTitle) : null;
  const titleRarity = equippedTitleObj?.rarity || null;

  const toggle = (s) => setExpandedSection(prev => prev === s ? null : s);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[9990] bg-black/60 backdrop-blur-[2px]" onClick={onClose} data-testid="profile-overlay" />

      {/* Panel */}
      <div
        className="fixed z-[9991] overflow-y-auto overflow-x-hidden
          sm:right-0 sm:top-0 sm:h-full sm:w-[420px] sm:animate-slide-in-right
          max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:h-[90vh] max-sm:rounded-t-[20px] max-sm:animate-slide-in-up"
        style={{ backgroundColor: '#0a0e1a' }}
        data-testid="profile-panel"
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-white/20" />
        </div>

        {/* Close */}
        <button onClick={onClose} className="absolute top-3 right-3 z-20 p-2 rounded-xl bg-black/40 backdrop-blur-sm text-white/60 hover:text-white transition-colors" data-testid="profile-close">
          <X className="w-5 h-5" />
        </button>

        {/* Banner — Phase SVG banner component (mapped from equipped shop key) */}
        <div className="h-32 sm:h-36 relative overflow-hidden" data-testid="panel-banner">
          <div className="absolute inset-0">
            <PhaseBanner bannerKey={BANNER_KEY_TO_ART[user?.equipped_banner] || 'default'} />
          </div>
        </div>

        {/* Lower section with equipped main color */}
        <div className="relative -mt-10 rounded-t-3xl min-h-[60vh] px-5 pt-1 pb-8" style={{ backgroundColor: lowerBg }}>
          {/* Avatar */}
          <div className="flex items-end gap-4 mb-4 -mt-6">
            <div
              className={`w-20 h-20 rounded-2xl flex items-center justify-center text-xl font-black text-white ${animClass}`}
              style={{ backgroundColor: avatarBg, border: `4px solid ${lowerBg}`, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
              data-testid="panel-avatar"
            >
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div className="pb-1 flex-1 min-w-0">
              <h2 className="text-lg font-black text-white font-['Satoshi'] truncate">{user?.first_name} {user?.last_name}</h2>
              <p className="text-xs text-white/40">@{user?.username}</p>
            </div>
          </div>

          {/* Title */}
          {equippedTitle && (
            <div className="mb-3">
              <span className={`text-sm font-black title-${titleRarity}`}>{equippedTitleObj?.name || equippedTitle}</span>
            </div>
          )}

          {/* Public link */}
          {user?.username && (
            <Link to={`/profile/${user.username}`} onClick={onClose}
              className="inline-flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors mb-5">
              <ExternalLink className="w-3 h-3" /> View public profile
            </Link>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            <StatBox icon={<Target className="w-4 h-4 text-[#4D8EF0]" />} value={user?.total_xp_all_time || 0} label="XP" />
            <StatBox icon={<Flame className="w-4 h-4 text-orange-400" />} value={user?.current_streak || 0} label="Streak" />
            <StatBox icon={<Shield className="w-4 h-4 text-[#3B82F6]" />} value={user?.longest_streak_ever || 0} label="Best" />
            <StatBox icon={<Calendar className="w-4 h-4 text-emerald-400" />} value={user?.total_habits_completed || 0} label="Done" />
          </div>

          <div className="h-px bg-white/[0.06] mb-5" />

          {/* Customize */}
          <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-4">Customize Profile</p>

          {/* Titles */}
          <Section title="Titles" count={earnedTitles.length} expanded={expandedSection === 'titles'} onToggle={() => toggle('titles')}>
            {earnedTitles.length === 0 ? <Empty text="Earn titles through streaks & buy from the Shop." /> : (
              <div className="flex flex-wrap gap-1.5">
                {equippedTitle && <Pill label="Remove" onClick={() => handleUnequip('title')} loading={equipping === 'title-null'} variant="remove" />}
                {earnedTitles.map(t => <Pill key={t.key} label={t.name} active={equippedTitle === t.key} onClick={() => handleEquip('title', t)} loading={equipping === `title-${t.key}`} className={`title-${t.rarity}`} />)}
              </div>
            )}
          </Section>

          {/* Animations */}
          <Section title="Animations" count={ownedAnims.length} expanded={expandedSection === 'anims'} onToggle={() => toggle('anims')}>
            {ownedAnims.length === 0 ? <Empty text="Buy avatar animations from the Shop." /> : (
              <div className="flex flex-wrap gap-1.5">
                <Pill label="None" active={!user?.equipped_animation} onClick={() => handleUnequip('anim')} loading={equipping === 'anim-null'} />
                {ownedAnims.map(a => <Pill key={a.key} label={a.name} active={user?.equipped_animation === a.key} onClick={() => handleEquip('anim', a)} loading={equipping === `anim-${a.key}`} />)}
              </div>
            )}
          </Section>

          {/* Banners — owned only, real ownership via user_inventory. Preview shows
              real SVG where a banner key maps to art, else a neutral placeholder. */}
          <Section title="Banners" count={ownedBanners.length} expanded={expandedSection === 'banners'} onToggle={() => toggle('banners')}>
            {ownedBanners.length === 0 ? <Empty text="Buy banners from the Shop." /> : (
              <div className="space-y-2">
                {ownedBanners.map((b) => {
                  const isEquipped = user?.equipped_banner === b.key;
                  const artKey = BANNER_KEY_TO_ART[b.key];
                  return (
                    <div key={b.key}
                      className={`w-full rounded-xl overflow-hidden border transition-all ${isEquipped ? 'border-[#3B82F6]/70 ring-1 ring-[#3B82F6]/25' : 'border-white/[0.06]'}`}
                      data-testid={`banner-preview-${b.key}`}
                      style={{ backgroundColor: '#0A0E14' }}
                    >
                      <div className="flex items-stretch">
                        {/* Preview thumbnail: 60px height */}
                        <div className="relative flex-1" style={{ height: 60 }}>
                          {artKey ? (
                            <div className="absolute inset-0"><PhaseBanner bannerKey={artKey} /></div>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/[0.03]">
                              <span className="text-[9px] uppercase tracking-widest text-white/25">{b.name}</span>
                            </div>
                          )}
                        </div>
                        {/* Label + action */}
                        <div className="flex items-center gap-2 px-3" style={{ minWidth: 128 }}>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold text-white truncate">{b.name}</p>
                            <p className="text-[9px] uppercase tracking-widest text-white/40">{b.rarity}</p>
                          </div>
                          <button
                            onClick={() => (isEquipped ? handleUnequip('banner') : handleEquip('banner', b))}
                            disabled={equipping === `banner-${b.key}` || equipping === 'banner-null'}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${isEquipped ? 'bg-[#3B82F6]/25 text-[#BFD9FF]' : 'bg-[#3B82F6] text-white hover:brightness-110'} disabled:opacity-50`}
                            data-testid={`banner-equip-${b.key}`}
                          >
                            {isEquipped ? 'Equipped' : 'Equip'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Profile Effects — single 'effect' category (mirrors equipped_decoration).
              Preview uses metadata.css or gradient_value where present, else plain. */}
          <Section title="Profile Effects" count={allOwnedEffects.length} expanded={expandedSection === 'effects'} onToggle={() => toggle('effects')}>
            {allOwnedEffects.length === 0 ? <Empty text="Buy profile effects from the Shop." /> : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  <Pill label="None" active={!user?.equipped_decoration} onClick={() => handleUnequip('effect')} loading={equipping === 'effect-null'} />
                  {allOwnedEffects.map(d => <Pill key={d.key} label={d.name} active={user?.equipped_decoration === d.key} onClick={() => handleEquip('effect', d)} loading={equipping === `effect-${d.key}`} />)}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {allOwnedEffects.map(d => {
                    const css = effectCssFor(d.key);
                    const grad = d.gradient_value;
                    return (
                      <button key={d.key} onClick={() => handleEquip('effect', d)}
                        className={`h-16 rounded-xl overflow-hidden border transition-all ${user?.equipped_decoration === d.key ? 'border-white/30 ring-1 ring-white/10' : 'border-white/[0.06]'}`}>
                        {css ? (
                          <div className={`w-full h-full ${css}`} />
                        ) : grad ? (
                          <div className="w-full h-full" style={{ background: grad }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-white/[0.03]">
                            <span className="text-[9px] uppercase tracking-widest text-white/25">{d.name}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Section>

          {/* Shop link */}
          {isGameMode && (
            <p className="text-[10px] text-white/20 text-center mt-6">
              <Gem className="w-3 h-3 inline text-[#4D8EF0]/50" /> More in <Link to="/dashboard/shop" onClick={onClose} className="text-[#4D8EF0]/60 hover:text-[#4D8EF0]">Shop</Link>
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function StatBox({ icon, value, label }) {
  return (
    <div className="p-2.5 rounded-xl text-center" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-base font-black text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-[8px] text-white/30 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function Section({ title, count, expanded, onToggle, children }) {
  return (
    <div className="mb-2.5 rounded-2xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)' }}>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <span className="text-xs font-bold text-white/70">{title} <span className="text-white/20 font-normal">({count})</span></span>
        {expanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function Empty({ text }) {
  return <p className="text-[10px] text-white/20">{text}</p>;
}

function Pill({ label, active, onClick, loading, className = '', variant }) {
  const style = variant === 'remove' ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : active ? 'border-white/25 bg-white/10 text-white' : 'border-white/[0.06] text-white/40 hover:bg-white/5';
  return (
    <button onClick={onClick} disabled={loading} className={`text-[10px] font-medium px-3 py-1.5 rounded-xl border transition-all ${style} ${className}`}>
      {loading ? <span className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin inline-block" /> : <>
        {label}{active && !variant && <Check className="w-2.5 h-2.5 inline ml-0.5" />}
      </>}
    </button>
  );
}
