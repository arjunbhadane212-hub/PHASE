import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMode } from '../contexts/ModeContext';
import { useGame } from '../contexts/GameContext';
import { Link } from 'react-router-dom';
import { Trophy, Flame, Target, Calendar, Shield, Sparkles, ExternalLink, Check, ChevronDown, ChevronUp, Gem, X } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const ICON_MAP = {
  flame: Flame, star: Sparkles, diamond: Target, crown: Trophy,
  lightning: Sparkles, skull: Shield, dragon: Flame, phoenix: Sparkles, void: Target,
};

export default function ProfilePanel({ open, onClose }) {
  const { user, refreshUser } = useAuth();
  const { isGameMode } = useMode();
  const { gems } = useGame();
  const [titles, setTitles] = useState({ earned_titles: [], equipped_title: null });
  const [profileItems, setProfileItems] = useState({ icons: [], animations: [], banners: [], decorations: [], battles: [] });
  const [equipping, setEquipping] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);

  const fetchProfile = useCallback(async () => {
    if (!open) return;
    try {
      const [t, p] = await Promise.all([
        axios.get(`${API}/profile/me/titles`),
        axios.get(`${API}/shop/profile-items`),
      ]);
      setTitles(t.data);
      setProfileItems(p.data);
    } catch { /* ignore */ }
  }, [open]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleEquip = async (type, key) => {
    setEquipping(`${type}-${key}`);
    try {
      await axios.put(`${API}/profile/me/equip`, { type, key: key || null });
      await refreshUser();
      const [t, p] = await Promise.all([
        axios.get(`${API}/profile/me/titles`),
        axios.get(`${API}/shop/profile-items`),
      ]);
      setTitles(t.data);
      setProfileItems(p.data);
      toast.success(key ? `Equipped!` : `Removed`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally { setEquipping(null); }
  };

  const equippedTitle = titles.equipped_title;
  const earnedTitles = titles.earned_titles || [];
  const ownedAnims = (profileItems.animations || []).filter(a => a.owned);
  const ownedBanners = (profileItems.banners || []).filter(b => b.owned);
  const ownedDecos = (profileItems.decorations || []).filter(d => d.owned);
  const ownedBattles = (profileItems.battles || []).filter(b => b.owned);
  const allOwnedEffects = [...ownedDecos, ...ownedBattles];

  const mainColor = user?.selected_main_color;
  const bannerColor = user?.selected_banner_color || '#1B6AE4';
  const avatarBg = mainColor && mainColor !== '#1F2937' ? mainColor : '#374151';
  const lowerBg = mainColor && mainColor !== '#1F2937' ? mainColor : '#0C1220';

  const equippedAnimData = (profileItems.animations || []).find(a => a.key === user?.equipped_animation);
  const animClass = equippedAnimData?.css || '';
  const equippedBannerData = (profileItems.banners || []).find(b => b.key === user?.equipped_banner);
  const equippedDecoData = (profileItems.decorations || []).find(d => d.key === user?.equipped_decoration);
  const equippedBattleData = (profileItems.battles || []).find(b => b.key === user?.equipped_decoration);
  const decoClass = equippedDecoData?.css || '';
  const battleImage = equippedBattleData?.image || null;
  const equippedIconData = (profileItems.icons || []).find(i => i.key === user?.equipped_icon);
  const IconComponent = equippedIconData ? (ICON_MAP[equippedIconData.emoji] || Sparkles) : null;
  const titleRarity = equippedTitle ? (earnedTitles.find(t => t.title === equippedTitle)?.rarity || 'common') : null;

  const bannerStyle = equippedBannerData?.gradient ? { background: equippedBannerData.gradient } : { backgroundColor: bannerColor };
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

        {/* Banner: SOLID fill, no gradient fade */}
        <div className={`h-32 sm:h-36 relative overflow-hidden ${!battleImage ? decoClass : ''}`} data-testid="panel-banner">
          {battleImage ? (
            <img src={battleImage} alt="Effect" className="absolute inset-0 w-full h-full object-cover battle-scene-animate" />
          ) : !decoClass ? (
            <div className="absolute inset-0" style={bannerStyle} />
          ) : null}
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
              {IconComponent ? <IconComponent className="w-9 h-9 text-white" /> : <>{user?.first_name?.[0]}{user?.last_name?.[0]}</>}
            </div>
            <div className="pb-1 flex-1 min-w-0">
              <h2 className="text-lg font-black text-white font-['Satoshi'] truncate">{user?.first_name} {user?.last_name}</h2>
              <p className="text-xs text-white/40">@{user?.username}</p>
            </div>
          </div>

          {/* Title */}
          {equippedTitle && (
            <div className="mb-3">
              <span className={`text-sm font-black title-${titleRarity}`}>{equippedTitle}</span>
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
            <StatBox icon={<Shield className="w-4 h-4 text-purple-400" />} value={user?.longest_streak_ever || 0} label="Best" />
            <StatBox icon={<Calendar className="w-4 h-4 text-emerald-400" />} value={user?.total_habits_completed || 0} label="Done" />
          </div>

          <div className="h-px bg-white/[0.06] mb-5" />

          {/* Customize */}
          <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-4">Customize Profile</p>

          {/* Titles */}
          <Section title="Titles" count={earnedTitles.length} expanded={expandedSection === 'titles'} onToggle={() => toggle('titles')}>
            {earnedTitles.length === 0 ? <Empty text="Earn titles through streaks & time tracked." /> : (
              <div className="flex flex-wrap gap-1.5">
                {equippedTitle && <Pill label="Remove" onClick={() => handleEquip('title', null)} loading={equipping === 'title-null'} variant="remove" />}
                {earnedTitles.map(t => <Pill key={t.title} label={t.title} active={equippedTitle === t.title} onClick={() => handleEquip('title', t.title)} loading={equipping === `title-${t.title}`} className={`title-${t.rarity}`} />)}
              </div>
            )}
          </Section>

          {/* Animations */}
          <Section title="Animations" count={ownedAnims.length} expanded={expandedSection === 'anims'} onToggle={() => toggle('anims')}>
            {ownedAnims.length === 0 ? <Empty text="Buy avatar animations from the Shop." /> : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  <Pill label="None" active={!user?.equipped_animation} onClick={() => handleEquip('animation', null)} loading={equipping === 'animation-null'} />
                  {ownedAnims.map(a => <Pill key={a.key} label={a.name} active={user?.equipped_animation === a.key} onClick={() => handleEquip('animation', a.key)} loading={equipping === `animation-${a.key}`} />)}
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                  {ownedAnims.map(a => (
                    <button key={a.key} onClick={() => handleEquip('animation', a.key)} className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full bg-[#1B6AE4]/20 border border-[#1B6AE4]/20 ${a.css}`} />
                      <span className="text-[8px] text-white/30">{a.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* Banners */}
          <Section title="Banners" count={ownedBanners.length} expanded={expandedSection === 'banners'} onToggle={() => toggle('banners')}>
            {ownedBanners.length === 0 ? <Empty text="Buy gradient banners from the Shop." /> : (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleEquip('banner', null)}
                  className={`h-12 rounded-xl border transition-all ${!user?.equipped_banner ? 'border-white/30' : 'border-white/[0.06]'}`}
                  style={{ backgroundColor: '#1B6AE4' }}>
                  {!user?.equipped_banner && <Check className="w-4 h-4 text-white mx-auto" />}
                </button>
                {ownedBanners.map(b => (
                  <button key={b.key} onClick={() => handleEquip('banner', b.key)}
                    className={`h-12 rounded-xl border transition-all ${user?.equipped_banner === b.key ? 'border-white/30 ring-1 ring-white/10' : 'border-white/[0.06]'}`}
                    style={{ background: b.gradient || '#1F2937' }}>
                    {user?.equipped_banner === b.key && <Check className="w-4 h-4 text-white mx-auto" />}
                  </button>
                ))}
              </div>
            )}
          </Section>

          {/* Effects (gradient + battle) */}
          <Section title="Profile Effects" count={allOwnedEffects.length} expanded={expandedSection === 'effects'} onToggle={() => toggle('effects')}>
            {allOwnedEffects.length === 0 ? <Empty text="Buy animated effects (3K) or battle scenes (7K) from Shop." /> : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  <Pill label="None" active={!user?.equipped_decoration} onClick={() => handleEquip('decoration', null)} loading={equipping === 'decoration-null'} />
                  {allOwnedEffects.map(d => <Pill key={d.key} label={d.name} active={user?.equipped_decoration === d.key} onClick={() => handleEquip('decoration', d.key)} loading={equipping === `decoration-${d.key}`} />)}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {allOwnedEffects.map(d => (
                    <button key={d.key} onClick={() => handleEquip('decoration', d.key)}
                      className={`h-16 rounded-xl overflow-hidden border transition-all ${user?.equipped_decoration === d.key ? 'border-white/30 ring-1 ring-white/10' : 'border-white/[0.06]'}`}>
                      {d.image ? (
                        <img src={d.image} alt={d.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full ${d.css || ''}`} />
                      )}
                    </button>
                  ))}
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
