import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Trophy, Flame, Target, Calendar, ArrowLeft, Shield, Sparkles } from 'lucide-react';
import { PhaseBanner, bannerComponents } from '../components/banners/PhaseBanners';
import axios from 'axios';
import { rankInfo, levelForXp } from '../data/levels';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const ICON_MAP = {
  flame: Flame, star: Sparkles, diamond: Target, crown: Trophy,
  lightning: Sparkles, skull: Shield, dragon: Flame, phoenix: Sparkles,
  void: Target,
};

export default function PublicProfilePage() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await axios.get(`${API}/profile/${username}`);
        setProfile(data);
      } catch (e) {
        setError(e.response?.data?.detail || 'Profile not found');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username]);

  if (loading) return (
    <div className="min-h-screen bg-[#06080F] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#06080F] flex items-center justify-center">
      <div className="text-center">
        <p className="text-zinc-400 text-lg mb-4">{error}</p>
        <Link to="/" className="text-blue-400 hover:underline">Go Home</Link>
      </div>
    </div>
  );

  const bannerColor = profile?.selected_banner_color || '#1F2937';
  const mainColor = profile?.selected_main_color || '#1F2937';
  const avatarBg = mainColor !== '#1F2937' ? mainColor : '#374151';
  const memberDate = profile?.member_since 
    ? new Date(profile.member_since).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) 
    : '';
  const equippedTitle = profile?.equipped_title;
  const equippedAnim = profile?.equipped_animation;
  const equippedBanner = profile?.equipped_banner;
  const equippedIcon = profile?.equipped_icon;
  const equippedDeco = profile?.equipped_decoration;
  const earnedTitles = profile?.earned_titles || [];
  // Level from the stored rank (fallback: derive from XP). NOTE: this page still
  // fetches from the dead /profile backend — Public Profile migration is its own step.
  const level = profile?.rank || levelForXp(profile?.current_xp || 0);

  const animClass = equippedAnim?.css || '';
  const decoClass = equippedDeco?.css || '';
  const battleImage = equippedDeco?.image || null;
  const bannerStyle = equippedBanner?.gradient 
    ? { background: equippedBanner.gradient }
    : { backgroundColor: bannerColor };

  const IconComponent = equippedIcon ? (ICON_MAP[equippedIcon.emoji] || Sparkles) : null;

  const titleRarity = equippedTitle 
    ? (earnedTitles.find(t => t.title === equippedTitle)?.rarity || 'common')
    : null;

  return (
    <div className="min-h-screen bg-[#06080F]" data-testid="public-profile-page">
      <div className="absolute top-4 left-4 z-20">
        <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-lg" data-testid="profile-back-link">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>

      {/* Banner — Phase SVG banner component */}
      <div className="relative h-36 sm:h-48 overflow-hidden" data-testid="profile-banner">
        <div className="absolute inset-0">
          <PhaseBanner
            bannerKey={
              // Prefer new-style key (nested or explicit); fall back to 'default'
              (profile?.equipped_banner && bannerComponents[profile.equipped_banner.key]?.name
                ? profile.equipped_banner.key
                : null)
              || (profile?.equipped_banner_key && bannerComponents[profile.equipped_banner_key]
                ? profile.equipped_banner_key
                : null)
              || 'default'
            }
          />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#06080F] to-transparent z-[1]" />
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-14 relative z-10">
        {/* Avatar with animation */}
        <div className="mb-4">
          <div
            className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold text-white ${animClass}`}
            style={{
              backgroundColor: avatarBg,
              border: '5px solid #06080F',
            }}
            data-testid="profile-avatar"
          >
            {IconComponent ? (
              <IconComponent className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            ) : (
              <>{profile?.first_name?.[0]}{profile?.last_name?.[0]}</>
            )}
          </div>
        </div>

        {/* Name & Title */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-white font-['Satoshi']" data-testid="profile-display-name">
            {profile?.first_name} {profile?.last_name}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">@{profile?.username}</p>

          {/* Equipped Title - Brawl Stars shiny style */}
          {equippedTitle && (
            <div className="mt-2" data-testid="profile-equipped-title">
              <span className={`text-sm sm:text-base font-bold title-${titleRarity}`}>
                {equippedTitle}
              </span>
            </div>
          )}

          {/* Level pill */}
          <div className="flex items-center gap-2 mt-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20" data-testid="profile-level-pill">
              <Trophy className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-medium text-blue-400">
                Level {level} — {rankInfo(level).name}
              </span>
            </div>
          </div>
        </div>

        <div className="h-px bg-white/[0.06] mb-6" />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6" data-testid="profile-stats">
          <StatCard icon={<Target className="w-4 h-4 text-blue-400" />} label="Total XP" value={profile?.total_xp_all_time?.toLocaleString() || '0'} />
          <StatCard icon={<Flame className="w-4 h-4 text-orange-400" />} label="Current Streak" value={`${profile?.current_streak || 0} days`} />
          <StatCard icon={<Shield className="w-4 h-4 text-blue-400" />} label="Longest Streak" value={`${profile?.longest_streak_ever || 0} days`} />
          <StatCard icon={<Calendar className="w-4 h-4 text-emerald-400" />} label="Habits Done" value={profile?.total_habits_completed?.toLocaleString() || '0'} />
        </div>

        {/* Earned Titles Showcase */}
        {earnedTitles.length > 0 && (
          <div className="mb-6" data-testid="profile-titles">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Titles</h3>
            <div className="flex flex-wrap gap-2">
              {earnedTitles.map(t => (
                <span
                  key={t.title}
                  className={`text-xs font-bold px-3 py-1 rounded-full border border-white/[0.06] bg-zinc-900/50 title-${t.rarity}`}
                >
                  {t.title}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="text-center pb-8">
          <p className="text-xs text-zinc-600">Member since {memberDate}</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="p-4 rounded-xl bg-[#0F1525] border border-[#182038] transition-colors" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-zinc-500 font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}
