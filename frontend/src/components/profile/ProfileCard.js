// The public profile body. One component, two shells: the full page and the
// Discord-style popout. Everything it renders comes from get_public_profile —
// there are no placeholder badges, and every number is live at fetch time.

import { Target, CalendarCheck, Sparkles, ArrowUpRight, Clock } from 'lucide-react';
import { PhaseBanner } from '../banners/PhaseBanners';
import TierEmblem from '../TierEmblem';
import { FlameGlyph } from './Sigil';
import { rankInfo } from '../../data/levels';
import { tierNumByName } from '../../data/leaderboardTiers';
import { streakTier, levelBadge } from '../../data/profileIdentity';
import { accentFor } from '../../data/titleGlyphs';
import { animCssFor } from '../../data/shopAnimations';
import { RankBadge, StreakBadge, StandingBadge, GlobalRankBadge, TitleBadge, ZoneChip } from './FlexBadge';

const RESULT_STYLE = {
  promoted: { label: 'Promoted', color: '#DBF67F' },
  demoted:  { label: 'Relegated', color: '#B91C1C' },
  held:     { label: 'Held', color: '#7D818F' },
};

// The equipped title's rarity sets how much ambient light it casts on the
// profile — a steady, same-colour bloom in the title's own accent. No
// animation: that is the "natural, not AI" guardrail. A common casts none.
const TITLE_AMBIENT = { common: 0, rare: 0.05, epic: 0.09, legendary: 0.15, mythic: 0.2 };

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

  const bannerArt = profile.equipped_banner || 'default';
  const memberDate = profile.member_since
    ? new Date(profile.member_since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';
  const ownedTitles = Array.isArray(profile.owned_titles) ? profile.owned_titles : [];
  const history = Array.isArray(profile.period_history) ? profile.period_history : [];
  // The Titles section header borrows the equipped title's own accent — the
  // same colour its chip uses — so header and chip can never disagree. With the
  // profile otherwise black, this is the only tint in the section.
  const titleAccent = accentFor(profile.equipped_title).surface;
  const ambient = TITLE_AMBIENT[profile.equipped_title_rarity_tier] ?? 0;
  const xpToNext = lvl.isMax ? null
    : Math.max(0, (profile.level_max_xp || 0) - (profile.current_xp || 0) + 1);
  const resets = countdown(standing?.ends_at);

  return (
    <div className="relative" data-testid="profile-card">
      {/* Title ambient — the equipped title's rarity casts a natural, steady
          bloom in its own accent, behind the header. The only colour the
          otherwise-black profile carries, and it scales with how rare the
          title is. Sits under the banner (which paints over it) and behind the
          z-10 content (which glows through the black gaps). */}
      {profile.equipped_title && ambient > 0 && (
        <div aria-hidden className="absolute inset-x-0 top-0 pointer-events-none z-0"
          style={{
            height: compact ? '18rem' : '26rem',
            background: `radial-gradient(90% 60% at 50% ${compact ? '16%' : '20%'}, color-mix(in srgb, ${titleAccent} ${Math.round(ambient * 100)}%, transparent), transparent 62%)`,
          }}
          data-testid="profile-title-ambient"
        />
      )}
      {/* Stage: the equipped banner. Radial only — no diagonal gradients. */}
      <div className={`relative overflow-hidden ${compact ? 'h-24 rounded-t-3xl' : 'h-40 sm:h-52'}`} data-testid="profile-banner">
        <div className="absolute inset-0"><PhaseBanner bannerKey={bannerArt} /></div>
        {/* The stage fades to the page background and nothing else. The rank
            bloom, the incandescent-streak bloom and the rank-coloured hairline
            that used to sit here were all "colour that changes the profile
            background" — removed. */}
        <div className="absolute bottom-0 left-0 right-0 h-24 z-[1]"
          style={{ background: 'linear-gradient(180deg, transparent, var(--gm-bg))' }} />
      </div>

      <div className={`relative z-10 ${compact ? 'px-5 -mt-10' : 'px-4 sm:px-6 -mt-14'}`}>
        {/* Avatar — ring + bloom coloured by rank, alive from Elite up. */}
        <div className="flex items-end justify-between gap-3 mb-4">
          <div
            className={`rounded-full flex items-center justify-center font-['Archivo'] font-black text-[color:var(--gm-ink)] bg-[color:var(--gm-badge)] ${animCssFor(profile.equipped_animation)} ${compact ? 'w-20 h-20 text-xl' : 'w-24 h-24 sm:w-28 sm:h-28 text-2xl sm:text-3xl'}`}
            style={{ border: '4px solid var(--gm-card)' }}
            data-testid="profile-avatar"
          >
            {profile.first_name?.[0]}{profile.last_name?.[0]}
          </div>
          {compact && onViewFull && (
            <button
              onClick={onViewFull}
              className="mb-1 inline-flex items-center gap-1 text-[11px] font-extrabold px-3 py-1.5 rounded-lg bg-[#95DEE6] text-[#183A3F] transition-colors"

              data-testid="popout-view-full"
            >
              Full profile <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Identity */}
        <div className="mb-3">
          <h1 className={`font-['Archivo'] font-black text-[color:var(--gm-ink)] leading-tight ${compact ? 'text-lg' : 'text-2xl sm:text-3xl'}`}
            data-testid="profile-display-name">
            {profile.first_name} {profile.last_name}
          </h1>
          <p className="text-sm text-[color:var(--gm-muted)] mt-0.5">@{profile.username}</p>
          {/* Equipped slot renders at md (~31px tall) so it sits level with
              the rank/streak/standing pills in the row below — it used to
              render at the collection's showcase scale (214×42px), over 2×
              its neighbours. The collection grid keeps the showcase size. */}
          {profile.equipped_title_name && (
            <div className="mt-2.5" data-testid="profile-equipped-title">
              <TitleBadge
                titleKey={profile.equipped_title}
                name={profile.equipped_title_name}
                rarityTier={profile.equipped_title_rarity_tier}
                rarity={profile.equipped_title_rarity}
                size={compact ? 'sm' : 'md'}
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
          style={{ background: 'var(--gm-card)' }}
          data-testid="profile-level-progress">
          <div className="flex items-center justify-between mb-2">
            <span className="font-['JetBrains_Mono'] text-[11px] font-bold tracking-[0.16em] text-[color:var(--gm-ink)]">
              {info.name.toUpperCase()}
            </span>
            <span className="text-[11px] font-bold text-[color:var(--gm-muted)] tabular-nums">
              {lvl.isMax ? 'MAX RANK' : `${(profile.current_xp || 0).toLocaleString()} / ${(profile.level_max_xp || 0).toLocaleString()} XP`}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--gm-track)' }}>
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{
                width: `${lvl.progressPct ?? 0}%`,
                background: '#DBF67F',
              }}
            />
          </div>
          {!lvl.isMax && (
            <p className="text-[11px] text-[color:var(--gm-muted)] mt-2">
              {xpToNext.toLocaleString()} XP to {rankInfo(rank + 1).name}
            </p>
          )}
        </div>

        {/* Streak hero — the screenshot object. */}
        <div className="rounded-2xl p-5 mb-4 flex items-center gap-4"
          style={{
            background: 'var(--gm-card)',

          }}
          data-testid="streak-hero">
          <FlameGlyph
            stage={s.flame}
            size={compact ? 40 : 56}
            className={`flex-shrink-0 ${s.glow >= 0.55 ? 'streak-flame-alive' : ''}`}
            style={{ color: 'var(--gm-ink)' }}
          />
          <div className="min-w-0">
            <p className={`font-['Archivo'] font-black text-[color:var(--gm-ink)] leading-none ${compact ? 'text-3xl' : 'text-5xl sm:text-6xl'}`}>
              {streak}
            </p>
            <p className="font-['JetBrains_Mono'] text-[11px] font-bold tracking-[0.22em] mt-1.5 text-[color:var(--gm-muted)]">
              DAY STREAK{s.alive ? ` · ${s.label}` : ''}
            </p>
            {s.next && s.alive && (
              <p className="text-[11px] text-[color:var(--gm-muted)] mt-1">
                {s.next.min - streak} more to {s.next.label.toLowerCase()}
              </p>
            )}
            {!s.alive && <p className="text-[11px] text-[color:var(--gm-muted)] mt-1">Cold. Nothing burning yet.</p>}
          </div>
        </div>

        {/* Secondary stats — quiet on purpose, blue iconography only. */}
        <div className="grid grid-cols-3 gap-2.5 mb-4" data-testid="profile-stats">
          <Stat icon={<Target className="w-4 h-4 text-[color:var(--gm-muted)]" strokeWidth={2} />} label="Total XP" value={(profile.total_xp_all_time || 0).toLocaleString()} />
          <Stat
            icon={<FlameGlyph stage={streakTier(profile.longest_streak_ever).flame} size={16} style={{ color: 'var(--gm-muted)' }} />}
            label="Best Streak" value={`${profile.longest_streak_ever || 0}`}
          />
          <Stat icon={<CalendarCheck className="w-4 h-4 text-[color:var(--gm-muted)]" strokeWidth={2} />} label="Habits Done" value={(profile.total_habits_completed || 0).toLocaleString()} />
        </div>

        {/* Live league context line. */}
        {standing && !compact && (
          <div className="mb-4 flex items-center gap-2.5 px-3.5 py-3 rounded-2xl"
            style={{ background: 'var(--gm-card)', border: '1px solid var(--gm-track)' }}
            data-testid="profile-league-live">
            <TierEmblem tier={standing.tier} size={30} glow={false} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold text-[color:var(--gm-ink)]">
                #{standing.position} of {standing.group_size} · {standing.tier_name} League
              </p>
              <p className="text-[11px] text-[color:var(--gm-muted)]">
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
              accent={titleAccent}
            />
            <div className="flex flex-wrap gap-2">
              {(compact ? ownedTitles.slice(0, 6) : ownedTitles).map(t => (
                <TitleBadge key={t.key} titleKey={t.key} name={t.name}
                  rarityTier={t.rarity_tier} rarity={t.rarity}
                  size={compact ? 'md' : 'lg'} />
              ))}
              {compact && ownedTitles.length > 6 && (
                <span className="text-[11px] font-bold text-[color:var(--gm-muted)] self-center">+{ownedTitles.length - 6} more</span>
              )}
            </div>
          </div>
        )}

        {/* League history — proof the rank actually moves. */}
        {history.length > 0 && !compact && (
          <div className="mb-4" data-testid="profile-league-history">
            <SectionHead icon={<Clock className="w-3.5 h-3.5" strokeWidth={2} />} label="Recent leagues" accent="var(--gm-muted)" />
            <div className="flex flex-col gap-1.5">
              {history.map((h, i) => {
                const rs = RESULT_STYLE[h.result] || RESULT_STYLE.held;
                const when = h.ends_at ? new Date(h.ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                return (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: 'var(--gm-badge)', border: '1px solid var(--gm-track)' }}>
                    <TierEmblem tier={h.tier_num || tierNumByName(h.tier_name)} size={26} glow={false} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[color:var(--gm-ink)] truncate">{h.tier_name || 'League'}</p>
                      <p className="text-[11px] text-[color:var(--gm-muted)]">
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
          <p className="text-[11px] text-[color:var(--gm-muted)]">Member since {memberDate}</p>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="p-3.5 rounded-xl" style={{ background: 'var(--gm-badge)', border: '1px solid var(--gm-track)' }}
      data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-[10px] text-[color:var(--gm-muted)] font-bold tracking-wide">{label}</span>
      </div>
      <p className="text-lg font-['Archivo'] font-black text-[color:var(--gm-ink)] tabular-nums">{value}</p>
    </div>
  );
}

function SectionHead({ icon, label, accent }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span style={{ color: accent }}>{icon}</span>
      <span className="text-[11px] font-extrabold tracking-[0.16em] uppercase text-[color:var(--gm-muted)]">{label}</span>
      <span className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${accent}55, transparent)` }} />
    </div>
  );
}
