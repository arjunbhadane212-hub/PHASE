// The badge chrome every flex on the public profile is built from.
//
// One primitive, driven by the intensity model in data/profileIdentity.js.
// Nothing here hardcodes "this badge is special" — the data decides, so a
// demotion or a broken streak genuinely cools the pixel output on next render.

import { Flame, Trophy, Globe2, Crown, ChevronsUp, ChevronsDown, Minus } from 'lucide-react';
import TierEmblem from '../TierEmblem';
import { streakTier, levelBadge, standingBadge, globalBadge, titleStyle, styleFromRarity } from '../../data/profileIdentity';

export default function FlexBadge({ spec, icon, label, value, sub, size = 'md', className = '', style, title, ...rest }) {
  const cls = [
    'flexbadge',
    spec?.sheen && 'flexbadge--sheen',
    spec?.halo && 'flexbadge--halo',
    spec?.incandescent && 'flexbadge--incandescent',
    size === 'sm' && 'text-[11px] px-2.5 py-1',
    size === 'lg' && 'text-[13px] px-3.5 py-2',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span
      className={cls}
      title={title}
      style={{ '--bg': spec?.a || '#3B82F6', '--bg2': spec?.b || '#60A5FA', '--glow': spec?.glow ?? 0.5, ...style }}
      {...rest}
    >
      {icon}
      <span className="flexbadge__label">{label}</span>
      {value != null && <span className="flexbadge__value">{value}</span>}
      {sub && <span className="text-[10px] font-bold text-white/45 tracking-wide">{sub}</span>}
    </span>
  );
}

/* ── Rank (level ladder: Rookie → Apex) ──────────────────────────────────── */
export function RankBadge({ level, progressPct, size = 'md' }) {
  const b = levelBadge(level, { progressPct });
  return (
    <FlexBadge
      spec={b} size={size}
      title={b.isMax ? 'Apex — the top of the ladder' : `Level ${b.level} · ${b.progressPct ?? 0}% to the next rank`}
      icon={b.isMax
        ? <Crown className="flexbadge__icon w-3.5 h-3.5" strokeWidth={2} />
        : <Trophy className="flexbadge__icon w-3.5 h-3.5" strokeWidth={2} />}
      label={b.name}
      value={`LV ${b.level}`}
      data-testid="badge-rank"
    />
  );
}

/* ── Streak ──────────────────────────────────────────────────────────────── */
export function StreakBadge({ days, size = 'md' }) {
  const s = streakTier(days);
  return (
    <FlexBadge
      spec={s} size={size}
      title={s.alive ? `${s.days}-day streak · ${s.label} tier` : 'No active streak'}
      icon={<Flame className={`flexbadge__icon w-3.5 h-3.5 ${s.alive && s.glow >= 0.8 ? 'streak-flame-alive' : ''}`} strokeWidth={2} />}
      label={s.alive ? `${s.days}` : '0'}
      value={s.days === 1 ? 'DAY' : 'DAYS'}
      data-testid="badge-streak"
    />
  );
}

/* ── Live league standing ────────────────────────────────────────────────── */
export function StandingBadge({ standing, leagueTier, size = 'md' }) {
  const b = standingBadge(standing, leagueTier);
  if (!b.placed) {
    return (
      <FlexBadge
        spec={b} size={size} title="Not placed in a league this period"
        icon={<TierEmblem tier={b.tier.n} size={18} glow={false} />}
        label={b.tierName} value="UNPLACED"
        data-testid="badge-standing"
      />
    );
  }
  return (
    <FlexBadge
      spec={b} size={size}
      title={`#${b.position} of ${b.groupSize} in ${b.tierName} · ${b.zoneLabel.toLowerCase()} zone · live`}
      icon={<TierEmblem tier={b.tier.n} size={18} glow={false} />}
      label={b.tierName}
      value={`#${b.position}`}
      data-testid="badge-standing"
    />
  );
}

/* Zone chip — rendered next to the standing badge so promotion/demotion reads
   at a glance without recolouring the tier identity itself. */
export function ZoneChip({ standing }) {
  if (!standing?.zone) return null;
  const b = standingBadge(standing, standing.tier);
  const Icon = standing.zone === 'promotion' ? ChevronsUp : standing.zone === 'demotion' ? ChevronsDown : Minus;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-extrabold tracking-wider"
      style={{ background: `${b.accent}1f`, color: b.accent, border: `1px solid ${b.accent}44` }}
      data-testid="chip-zone"
    >
      <Icon className="w-3 h-3" strokeWidth={2.5} /> {b.zoneLabel}
    </span>
  );
}

/* ── Global rank ─────────────────────────────────────────────────────────── */
export function GlobalRankBadge({ rank, total, size = 'md' }) {
  const b = globalBadge(rank, total);
  if (!b) return null;
  return (
    <FlexBadge
      spec={b} size={size}
      title={`#${b.rank} of ${b.total.toLocaleString()} by lifetime XP · live`}
      icon={<Globe2 className="flexbadge__icon w-3.5 h-3.5" strokeWidth={2} />}
      label={`#${b.rank.toLocaleString()}`}
      value={b.tagline || 'GLOBAL'}
      data-testid="badge-global"
    />
  );
}

/* ── Title ───────────────────────────────────────────────────────────────── */
export function TitleBadge({ name, style, rarity, size = 'md', showTier = false }) {
  if (!name) return null;
  const key = style || styleFromRarity(rarity);
  const t = titleStyle(key);
  const px = size === 'lg' ? 'text-lg px-4 py-1.5' : size === 'sm' ? 'text-[11px] px-2.5 py-1' : 'text-sm px-3 py-1';
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full"
      style={{
        background: '#0C111B',
        border: `1px solid ${t.a}44`,
        boxShadow: `0 0 ${Math.round(22 * t.glow)}px -6px ${t.a}, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
      data-testid="badge-title"
    >
      <span className={`font-black tracking-wide ${t.className} ${px}`}>{name}</span>
      {showTier && (
        <span className="text-[9px] font-extrabold tracking-[0.14em] pr-3 text-white/35">{t.label.toUpperCase()}</span>
      )}
    </span>
  );
}
