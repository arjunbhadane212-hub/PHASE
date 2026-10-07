import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Inventory from '../components/Inventory';
import { useMode } from '../contexts/ModeContext';
import { Link } from 'react-router-dom';
import { Target, Calendar, Shield, ExternalLink, Gem, X } from 'lucide-react';
import { PhaseBanner } from '../components/banners/PhaseBanners';
import { FlameGlyph } from '../components/profile/Sigil';
import { TitleBadge } from '../components/profile/FlexBadge';
import { streakTier } from '../data/profileIdentity';
import { supabase } from '../lib/supabaseClient';
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
  // The panel keeps only what the HEADER needs: the equipped title's row, so
  // the chip above the stats renders at full fidelity. Owning, listing and
  // equipping everything else belongs to <Inventory />.
  const [equippedTitleObj, setEquippedTitleObj] = useState(null);

  // Read owned equippables from Supabase: shop_items + user_inventory joined
  // client-side (same pattern as SettingsPage 4b). Each item carries its real
  // shop_items.id so equip_item can be called by id. Gated on panel `open`.
  const fetchProfile = useCallback(async () => {
    if (!open || !user?.equipped_title) { setEquippedTitleObj(null); return; }
    try {
      const { data } = await supabase.from('shop_items')
        .select('key,name,rarity,rarity_tier')
        .eq('key', user.equipped_title).eq('is_active', true).maybeSingle();
      setEquippedTitleObj(data || null);
    } catch { setEquippedTitleObj(null); }
  }, [open, user?.equipped_title]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // Canonical only: equip/unequip go through the RPCs (no direct users.equipped_*

  const equippedTitle = user?.equipped_title;

  // The equipped-main-colour branch is gone (Oct 2026): profile colours are
  // retired and the panel is the neutral theme surface, always. The --panel-*
  // names are kept so every child below still resolves without edits -- they
  // now just alias the gm tokens.
  const avatarBg = 'var(--gm-badge)';
  const lowerBg = 'var(--gm-card)';
  const panelVars = {
    '--panel-ink': 'var(--gm-ink)',
    '--panel-muted': 'var(--gm-muted)',
    '--panel-tile': 'var(--gm-badge)',
    '--panel-line': 'var(--gm-track)',
  };

  // Animations carry no css preview in shop_items (the old backend synthesized
  // css_class); the avatar animation class degrades to none. See NOTES_FOR_SACHIN.md.
  const animClass = '';

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
        style={{ backgroundColor: 'var(--gm-bg)' }}
        data-testid="profile-panel"
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-[color:var(--gm-track)]" />
        </div>

        {/* Close */}
        <button onClick={onClose} className="absolute top-3 right-3 z-20 p-2 rounded-xl bg-black/40 backdrop-blur-sm text-white/70 hover:text-white transition-colors" data-testid="profile-close">
          <X className="w-5 h-5" />
        </button>

        {/* Banner — Phase SVG banner component (mapped from equipped shop key) */}
        <div className="h-32 sm:h-36 relative overflow-hidden" data-testid="panel-banner">
          <div className="absolute inset-0">
            <PhaseBanner bannerKey={BANNER_KEY_TO_ART[user?.equipped_banner] || 'default'} />
          </div>
        </div>

        {/* Lower section with equipped main color */}
        <div className="relative -mt-10 rounded-t-3xl min-h-[60vh] px-5 pt-1 pb-8" style={{ backgroundColor: lowerBg, ...panelVars }}>
          {/* Avatar */}
          <div className="flex items-end gap-4 mb-4 -mt-6">
            <div
              className={`w-20 h-20 rounded-2xl flex items-center justify-center text-xl font-['Archivo'] font-black text-[color:var(--panel-ink)] ${animClass}`}
              style={{ backgroundColor: avatarBg, color: hasColor ? '#ffffff' : '#183A3F', border: `4px solid ${lowerBg}`, boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}
              data-testid="panel-avatar"
            >
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div className="pb-1 flex-1 min-w-0">
              <h2 className="text-lg font-['Archivo'] font-extrabold text-[color:var(--panel-ink)] truncate">{user?.first_name} {user?.last_name}</h2>
              <p className="text-xs text-[color:var(--panel-muted)]">@{user?.username}</p>
            </div>
          </div>

          {/* Title */}
          {equippedTitle && (
            <div className="mb-3">
              <TitleBadge
                titleKey={equippedTitle}
                name={equippedTitleObj?.name || equippedTitle}
                rarityTier={equippedTitleObj?.rarity_tier}
                rarity={equippedTitleObj?.rarity}
                size="sm"
              />
            </div>
          )}

          {/* Public link */}
          {user?.username && (
            <Link to={`/profile/${user.username}`} onClick={onClose}
              className="inline-flex items-center gap-1.5 text-[11px] text-[color:var(--panel-muted)] hover:opacity-80 transition-opacity mb-5">
              <ExternalLink className="w-3 h-3" /> View public profile
            </Link>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            <StatBox icon={<Target className="w-4 h-4 text-[color:var(--panel-ink)]" />} value={user?.total_xp_all_time || 0} label="XP" />
            <StatBox icon={<FlameGlyph stage={streakTier(user?.current_streak).flame} size={16} style={{ color: 'var(--panel-ink)' }} />} value={user?.current_streak || 0} label="Streak" />
            <StatBox icon={<Shield className="w-4 h-4 text-[color:var(--panel-ink)]" />} value={user?.longest_streak_ever || 0} label="Best" />
            <StatBox icon={<Calendar className="w-4 h-4 text-[color:var(--panel-ink)]" />} value={user?.total_habits_completed || 0} label="Done" />
          </div>

          <div className="h-px bg-[color:var(--panel-line)] mb-5" />

          {/* Customize — the shared inventory. This panel used to carry its own
              copy of the equip UI, which drifted from the one in Settings (that
              one had no Effects section at all). Both now render the same
              component, so every owned category shows up on both surfaces. */}
          <p className="font-['JetBrains_Mono'] text-[10px] text-[color:var(--panel-muted)] uppercase tracking-[0.08em] font-bold mb-4">Customize Profile</p>
          <Inventory onNavigate={onClose} />

          {/* Shop link */}
          {isGameMode && (
            <p className="text-[10px] text-[color:var(--panel-muted)] text-center mt-6">
              <Gem className="w-3 h-3 inline text-[color:var(--panel-muted)]" /> More in <Link to="/dashboard/shop" onClick={onClose} className="font-['General_Sans'] font-semibold text-[color:var(--panel-ink)] hover:opacity-80">Shop</Link>
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function StatBox({ icon, value, label }) {
  return (
    <div className="p-2.5 rounded-xl text-center" style={{ background: 'var(--panel-tile)', border: '1px solid var(--panel-line)' }}>
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-base font-['Archivo'] font-black text-[color:var(--panel-ink)]">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="font-['JetBrains_Mono'] text-[8px] text-[color:var(--panel-muted)] uppercase tracking-[0.08em]">{label}</p>
    </div>
  );
}

