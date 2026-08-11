// The public profile body. One component, two shells: the full page and the
// Discord-style popout. Everything it renders comes from get_public_profile —
// there are no placeholder badges, and every number is live at fetch time.

import { Flame, Target, CalendarCheck, Sparkles, ArrowUpRight, Clock } from 'lucide-react';
import { PhaseBanner } from '../banners/PhaseBanners';
import TierEmblem from '../TierEmblem';
import { rankInfo } from '../../data/levels';
import { tierNumByName } from '../../data/leaderboardTiers';
import { streakTier, levelBadge, alpha, titleStyle, styleFromRarity } from '../../data/profileIdentity';
import { RankBadge, StreakBadge, StandingBadge, GlobalRankBadge, TitleBadge, ZoneChip } from './FlexBadge';

const BANNER_KEY_TO_ART = {
  banner_circuit: 'starter_circuit',
  banner_grid: 'starter_grid',
  banner_pulse: 'delta_pulse',
  banner_void_fracture: 'delta_void',
};

const RESULT_STYLE = {
  promoted: { label: 'Promoted', color: '#22C55E' },
  demoted:  { label: 'Relegated', color: '#EF4444' },
  held:     { label: 'Held', color: '#7D818F' },
};

function countdown(endsAt) {
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'ending soon';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

export default function ProfileCard({ profile, variant = 'page', onViewFull }) {
  const compact = variant === 'popout';

  const rank = profile.rank || 1;
  const info = rankInfo(rank);
  const lvl = levelBadge(rank, { progressPct: profile.level_progress_pct });
  const streak = profile.current_streak || 0;
  const s = streakTier(streak);
  const standing = profile.live_standing || null;

  const mainColor = profile.selected_main_color && profile.selected_main_color !== '#1F2937'
    ? profile.selected_main_color : '#374151';
  const bannerArt = BANNER_KEY_TO_ART[profile.equipped_banner] || 'default';
  const memberDate = profile.member_since
    ? new Date(profile.member_since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';
  const ownedTitles = Array.isArray(profile.owned_titles) ? profile.owned_titles : [];
  const history = Array.isArray(profile.period_history) ? profile.period_history : [];
  const titleKey = profile.equipped_title_style || styleFromRarity(profile.equipped_title_rarity);
  const tStyle = titleStyle(titleKey);
  const xpToNext = lvl.isMax ? null
    : Math.max(0, (profile.level_max_xp || 0) - (profile.current_xp || 0) + 1);
  const resets = countdown(standing?.ends_at);

  return (
    <div className="relative" data-testid="profile-card">
      {/* Stage: banner + rank-keyed ambient bloom. Radial only — no diagonal gradients. */}
      <div className={`relative overflow-hidden ${compact ? 'h-24 rounded-t-3xl' : 'h-40 sm:h-52'}`} data-testid="profile-banner">
        <div className="absolute inset-0"><PhaseBanner bannerKey={bannerArt} /></div>
        <div
          className="absolute inset-0 profile-ambient pointer-events-none"
          style={{ background: `radial-gradient(120% 130% at 50% 0%, ${alpha(info.color, 0.42)}, transparent 62%)` }}
        />
        {s.incandescent && (
          <div
            className="absolute inset-0 profile-ambient pointer-events-none"
            style={{ background: `radial-gradient(90% 120% at 85% 10%, ${alpha('#FBBF24', 0.3)}, transparent 60%)`, animationDelay: '1.2s' }}
          />
        )}
        <div className="absolute bottom-0 left-0 right-0 h-24 z-[1]"
          style={{ background: 'linear-gradient(180deg, transparent, #06080F)' }} />
        {/* Edge-lit hairline that fades from both sides. */}
        <div className="absolute bottom-0 left-0 right-0 h-px z-[2]"
          style={{ background: `linear-gradient(90deg, transparent, ${alpha(info.color, 0.8)}, transparent)` }} />
      </div>

      <div className={`relative z-10 ${compact ? 'px-5 -mt-10' : 'px-4 sm:px-6 -mt-14'}`}>
        {/* Avatar — ring + bloom coloured by rank, alive from Elite up. */}
        <div className="flex items-end justify-between gap-3 mb-4">
          <div
            className={`rounded-full flex items-center justify-center font-black text-white ${compact ? 'w-20 h-20 text-xl' : 'w-24 h-24 sm:w-28 sm:h-28 text-2xl sm:text-3xl'} ${lvl.halo ? 'avatar-ring-alive' : ''}`}
            style={{
              backgroundColor: mainColor,
              border: `4px solid ${info.color}`,
              '--bg': info.color,
              '--bg2': lvl.b,
              boxShadow: lvl.halo ? undefined : `0 0 ${Math.round(30 * lvl.glow)}px ${alpha(info.color, 0.5)}`,
            }}
            data-testid="profile-avatar"
          >
            {profile.first_name?.[0]}{profile.last_name?.[0]}
          </div>
          {compact && onViewFull && (
            <button
              onClick={onViewFull}
              className="mb-1 inline-flex items-center gap-1 text-[11px] font-extrabold px-3 py-1.5 rounded-lg text-white transition-colors"
              style={{ background: alpha(info.color, 0.16), border: `1px solid ${alpha(info.color, 0.4)}` }}
              data-testid="popout-view-full"
            >
              Full profile <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Identity */}
        <div className="mb-3">
          <h1 className={`font-black text-white font-['Satoshi'] leading-tight ${compact ? 'text-lg' : 'text-2xl sm:text-3xl'}`}
            data-testid="profile-display-name">
            {profile.first_name} {profile.last_name}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">@{profile.username}</p>
          {profile.equipped_title_name && (
            <div className="mt-2.5" data-testid="profile-equipped-title">
              <TitleBadge
                name={profile.equipped_title_name}
                style={titleKey}
                rarity={profile.equipped_title_rarity}
                size={compact ? 'md' : 'lg'}
                showTier={!compact}
              />
            </div>
          )}
        </div>

        {/* The flex row. Rank · Streak · live league standing · global standing. */}
        <div className="flex flex-wrap items-center gap-2 mb-4" data-testid="profile-badge-row">
          <RankBadge level={rank} progressPct={profile.level_progress_pct} size={compact ? 'sm' : 'md'} />
          <StreakBadge days={streak} size={compact ? 'sm' : 'md'} />
          <StandingBadge standing={standing} leagueTier={profile.leaderboard_tier} size={compact ? 'sm' : 'md'} />
          {standing && <ZoneChip standing={standing} />}
          <GlobalRankBadge rank={profile.global_rank} total={profile.global_total} size={compact ? 'sm' : 'md'} />
        </div>

        {/* Level progress — live, and the only place a number is "incomplete". */}
        <div className="mb-4 rounded-2xl p-3.5"
          style={{ background: '#0B0F1A', border: `1px solid ${alpha(info.color, 0.22)}` }}
          data-testid="profile-level-progress">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold tracking-[0.16em]" style={{ color: info.color }}>
              {info.name.toUpperCase()}
            </span>
            <span className="text-[11px] font-bold text-zinc-500 tabular-nums">
              {lvl.isMax ? 'MAX RANK' : `${(profile.current_xp || 0).toLocaleString()} / ${(profile.level_max_xp || 0).toLocaleString()} XP`}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#161C28' }}>
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{
                width: `${lvl.progressPct ?? 0}%`,
                background: `linear-gradient(90deg, ${info.color}, ${lvl.b})`,
                boxShadow: `0 0 ${Math.round(16 * lvl.glow)}px ${alpha(info.color, 0.8)}`,
              }}
            />
          </div>
          {!lvl.isMax && (
            <p className="text-[11px] text-zinc-600 mt-2">
              {xpToNext.toLocaleString()} XP to {rankInfo(rank + 1).name}
            </p>
          )}
        </div>

        {/* Streak hero — the screenshot object. */}
        <div className="rounded-2xl p-5 mb-4 flex items-center gap-4"
          style={{
            background: `radial-gradient(120% 140% at 0% 50%, ${alpha(s.a, s.alive ? 0.16 : 0.04)}, transparent 62%), #0B0F1A`,
            border: `1px solid ${alpha(s.a, s.alive ? 0.4 : 0.15)}`,
            boxShadow: s.alive ? `0 0 ${Math.round(44 * s.glow)}px -12px ${s.a}` : 'none',
            '--bg': s.a, '--bg2': s.b,
          }}
          data-testid="streak-hero">
          <Flame
            className={`flex-shrink-0 ${compact ? 'w-10 h-10' : 'w-14 h-14'} ${s.glow >= 0.55 ? 'streak-flame-alive' : ''}`}
            style={{ color: s.a, filter: s.alive ? `drop-shadow(0 0 ${Math.round(18 * s.glow)}px ${s.a})` : 'none' }}
            strokeWidth={2}
          />
          <div className="min-w-0">
            <p className={`font-black text-white font-['Satoshi'] leading-none ${compact ? 'text-3xl' : 'text-5xl sm:text-6xl'}`}
              style={s.incandescent ? { textShadow: `0 0 20px #FFFFFF, 0 0 44px ${s.a}` } : s.alive ? { textShadow: `0 0 22px ${alpha(s.a, 0.7)}` } : undefined}>
              {streak}
            </p>
            <p className="text-[11px] font-extrabold tracking-[0.22em] mt-1.5" style={{ color: s.a }}>
              DAY STREAK{s.alive ? ` · ${s.label}` : ''}
            </p>
            {s.next && s.alive && (
              <p className="text-[11px] text-zinc-600 mt-1">
                {s.next.min - streak} more to {s.next.label.toLowerCase()}
              </p>
            )}
            {!s.alive && <p className="text-[11px] text-zinc-600 mt-1">Cold. Nothing burning yet.</p>}
          </div>
        </div>

        {/* Secondary stats — quiet on purpose, blue iconography only. */}
        <div className="grid grid-cols-3 gap-2.5 mb-4" data-testid="profile-stats">
          <Stat icon={<Target className="w-4 h-4 text-[#4D8EF0]" strokeWidth={2} />} label="Total XP" value={(profile.total_xp_all_time || 0).toLocaleString()} />
          <Stat icon={<Flame className="w-4 h-4 text-[#4D8EF0]" strokeWidth={2} />} label="Best Streak" value={`${profile.longest_streak_ever || 0}`} />
          <Stat icon={<CalendarCheck className="w-4 h-4 text-[#4D8EF0]" strokeWidth={2} />} label="Habits Done" value={(profile.total_habits_completed || 0).toLocaleString()} />
        </div>

        {/* Live league context line. */}
        {standing && !compact && (
          <div className="mb-4 flex items-center gap-2.5 px-3.5 py-3 rounded-2xl"
            style={{ background: '#0B0F1A', border: '1px solid #182038' }}
            data-testid="profile-league-live">
            <TierEmblem tier={standing.tier} size={30} glow={false} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold text-white">
                #{standing.position} of {standing.group_size} · {standing.tier_name} League
              </p>
              <p className="text-[11px] text-zinc-500">
                {(profile.current_period_xp || 0).toLocaleString()} XP this period
                {resets && <> · resets in {resets}</>}
              </p>
            </div>
            <ZoneChip standing={standing} />
          </div>
        )}

        {/* Title collection. */}
        {ownedTitles.length > 0 && (
          <div className="mb-4" data-testid="profile-titles">
            <SectionHead
              icon={<Sparkles className="w-3.5 h-3.5" strokeWidth={2} />}
              label={`Titles · ${ownedTitles.length}`}
              accent={tStyle.a}
            />
            <div className="flex flex-wrap gap-2">
              {(compact ? ownedTitles.slice(0, 6) : ownedTitles).map(t => (
                <TitleBadge key={t.key} name={t.name} style={t.style} rarity={t.rarity} size="sm" />
              ))}
              {compact && ownedTitles.length > 6 && (
                <span className="text-[11px] font-bold text-zinc-600 self-center">+{ownedTitles.length - 6} more</span>
              )}
            </div>
          </div>
        )}

        {/* League history — proof the rank actually moves. */}
        {history.length > 0 && !compact && (
          <div className="mb-4" data-testid="profile-league-history">
            <SectionHead icon={<Clock className="w-3.5 h-3.5" strokeWidth={2} />} label="Recent leagues" accent="#4D8EF0" />
            <div className="flex flex-col gap-1.5">
              {history.map((h, i) => {
                const rs = RESULT_STYLE[h.result] || RESULT_STYLE.held;
                const when = h.ends_at ? new Date(h.ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                return (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: '#0F1525', border: '1px solid #182038' }}>
                    <TierEmblem tier={h.tier_num || tierNumByName(h.tier_name)} size={26} glow={false} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{h.tier_name || 'League'}</p>
                      <p className="text-[11px] text-zinc-500">
                        Rank #{h.final_rank ?? '-'} · {Number(h.period_xp ?? 0).toLocaleString()} XP · {when}
                      </p>
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-1 rounded-lg"
                      style={{ background: `${rs.color}22`, color: rs.color }}>{rs.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className={compact ? 'pb-5' : 'text-center pb-10'}>
          <p className="text-[11px] text-zinc-600">Member since {memberDate}</p>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="p-3.5 rounded-xl" style={{ background: '#0F1525', border: '1px solid #182038' }}
      data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-[10px] text-zinc-500 font-bold tracking-wide">{label}</span>
      </div>
      <p className="text-lg font-black text-white tabular-nums">{value}</p>
    </div>
  );
}

function SectionHead({ icon, label, accent }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span style={{ color: accent }}>{icon}</span>
      <span className="text-[11px] font-extrabold tracking-[0.16em] uppercase text-zinc-400">{label}</span>
      <span className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${accent}55, transparent)` }} />
    </div>
  );
}
