import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Flame, Target, CalendarCheck, ArrowLeft } from 'lucide-react';
import { PhaseBanner } from '../components/banners/PhaseBanners';
import { supabase } from '../lib/supabaseClient';
import { rankInfo } from '../data/levels';

// Shop banner keys (banner_*) -> the hardcoded banner SVG set. Same map as
// MyProfilePage (Step 4c); the 4 with art render, others fall back to default.
const BANNER_KEY_TO_ART = {
  banner_circuit: 'starter_circuit',
  banner_grid: 'starter_grid',
  banner_pulse: 'delta_pulse',
  banner_void_fracture: 'delta_void',
};

// Streak tier -> color + glow, per CLAUDE.md Streak Hero Widget spec.
function streakTier(s) {
  if (s >= 100) return { color: '#FBBF24', glow: '0 0 36px rgba(251,191,36,0.6)', hot: true, pulse: true };
  if (s >= 30)  return { color: '#FBBF24', glow: '0 0 24px rgba(251,191,36,0.4)', hot: false, pulse: true };
  if (s >= 7)   return { color: '#F59E0B', glow: '0 0 20px rgba(245,158,11,0.35)', hot: false, pulse: false };
  if (s >= 1)   return { color: '#F97316', glow: '0 0 16px rgba(249,115,22,0.3)', hot: false, pulse: false };
  return { color: '#6B7280', glow: 'none', hot: false, pulse: false };
}

export default function PublicProfilePage() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true); setError(null);
      try {
        const { data, error: rpcErr } = await supabase.rpc('get_public_profile', { p_username: username });
        if (rpcErr) throw rpcErr;
        if (active) setProfile(data);
      } catch (e) {
        if (active) setError(e?.message || 'Profile not found');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [username]);

  if (loading) return (
    <div className="min-h-screen bg-[#06080F] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !profile) return (
    <div className="min-h-screen bg-[#06080F] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-zinc-400 text-lg mb-4">{error || 'Profile not found'}</p>
        <Link to="/" className="text-blue-400 hover:underline">Go Home</Link>
      </div>
    </div>
  );

  const rank = profile.rank || 1;
  const info = rankInfo(rank);
  const streak = profile.current_streak || 0;
  const tier = streakTier(streak);
  const mainColor = profile.selected_main_color && profile.selected_main_color !== '#1F2937'
    ? profile.selected_main_color : '#374151';
  const bannerArt = BANNER_KEY_TO_ART[profile.equipped_banner] || 'default';
  const memberDate = profile.member_since
    ? new Date(profile.member_since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';
  const ownedTitles = Array.isArray(profile.owned_titles) ? profile.owned_titles : [];

  return (
    <div className="min-h-screen bg-[#06080F]" data-testid="public-profile-page">
      <div className="absolute top-4 left-4 z-20">
        <Link to="/" className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-lg" data-testid="profile-back-link">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>

      {/* Banner */}
      <div className="relative h-36 sm:h-48 overflow-hidden" data-testid="profile-banner">
        <div className="absolute inset-0"><PhaseBanner bannerKey={bannerArt} /></div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#06080F] to-transparent z-[1]" />
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-14 relative z-10">
        {/* Avatar with rank-color ring + glow */}
        <div className="mb-4">
          <div
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold text-white"
            style={{ backgroundColor: mainColor, border: `4px solid ${info.color}`, boxShadow: `0 0 22px ${info.color}66` }}
            data-testid="profile-avatar"
          >
            {profile.first_name?.[0]}{profile.last_name?.[0]}
          </div>
        </div>

        {/* Name + username + equipped title */}
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-white font-['Satoshi']" data-testid="profile-display-name">
            {profile.first_name} {profile.last_name}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">@{profile.username}</p>
          {profile.equipped_title_name && (
            <div className="mt-2" data-testid="profile-equipped-title">
              <span className={`text-sm sm:text-base font-bold title-${profile.equipped_title_rarity || 'common'}`}>
                {profile.equipped_title_name}
              </span>
            </div>
          )}
        </div>

        {/* Rank badge pill + Streak badge pill */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: `${info.color}22`, border: `1px solid ${info.color}55`, color: info.color }}
            data-testid="profile-rank-pill">
            Level {rank} — {info.name}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: `${tier.color}22`, border: `1px solid ${tier.color}55`, color: tier.color }}
            data-testid="profile-streak-pill">
            <Flame className="w-3.5 h-3.5" /> {streak} day{streak === 1 ? '' : 's'}
          </span>
        </div>

        {/* Streak Hero Widget */}
        <div className="rounded-2xl p-5 mb-6 flex items-center gap-4 bg-[#0B0F1A] border"
          style={{ borderColor: `${tier.color}44`, boxShadow: tier.glow }}
          data-testid="streak-hero">
          <Flame className={`w-12 h-12 flex-shrink-0 ${tier.pulse ? 'animate-pulse' : ''}`} style={{ color: tier.color }} />
          <div>
            <p className="text-4xl sm:text-5xl font-black text-white font-['Satoshi'] leading-none"
              style={tier.hot ? { textShadow: `0 0 18px #FFFFFF, 0 0 30px ${tier.color}` } : undefined}>
              {streak}
            </p>
            <p className="text-[11px] font-bold tracking-[0.2em] mt-1" style={{ color: tier.color }}>DAY STREAK</p>
          </div>
        </div>

        {/* Secondary stat grid — blue iconography only per CLAUDE.md */}
        <div className="grid grid-cols-3 gap-3 mb-6" data-testid="profile-stats">
          <StatCard icon={<Target className="w-4 h-4 text-[#4D8EF0]" />} label="Total XP" value={(profile.total_xp_all_time || 0).toLocaleString()} />
          <StatCard icon={<Flame className="w-4 h-4 text-[#4D8EF0]" />} label="Longest Streak" value={`${profile.longest_streak_ever || 0}`} />
          <StatCard icon={<CalendarCheck className="w-4 h-4 text-[#4D8EF0]" />} label="Habits Done" value={(profile.total_habits_completed || 0).toLocaleString()} />
        </div>

        {/* Owned titles showcase */}
        {ownedTitles.length > 0 && (
          <div className="mb-6" data-testid="profile-titles">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Titles</h3>
            <div className="flex flex-wrap gap-2">
              {ownedTitles.map(t => (
                <span key={t.key} className={`text-xs font-bold px-3 py-1 rounded-full border border-white/[0.06] bg-zinc-900/50 title-${t.rarity}`}>
                  {t.name}
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
    <div className="p-4 rounded-xl bg-[#0F1525] border border-[#182038]" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[11px] text-zinc-500 font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}
