// The badge chrome on the public profile.
//
// Oct 2026: these used to be lit pills -- each one took a colour from its own
// system (rank ladder, streak tier, league tier) and rendered it as a saturated
// fill plus a glow, sheen or halo scaled by how well you were doing. On one
// screen that meant five competing colour systems, several of them still the
// pre-v2 blue and purple, all of them glowing.
//
// The profile is black now. These badges are neutral v2 surfaces -- card fill,
// ink text, no glow -- and the ONLY colour on the profile comes from the title
// chips. That is deliberate: it makes an equipped title the thing your eye
// lands on, which is the whole point of a title being worth flexing.
//
// Intensity still exists, it is just not chromatic: rank, streak and standing
// still read their live values, they simply express them through the label and
// the emblem rather than through brightness.

import { Trophy, Globe2, Crown, ChevronsUp, ChevronsDown, Minus } from 'lucide-react';
import TierEmblem from '../TierEmblem';
import { FlameGlyph } from './Sigil';
import TitlePlate from './TitlePlate';
import { streakTier, levelBadge, standingBadge, globalBadge, normalizeRarity } from '../../data/profileIdentity';

const PILL = 'inline-flex items-center gap-1.5 rounded-full bg-[color:var(--gm-badge)] text-[color:var(--gm-ink)] flex-none';
const SIZE = { sm: 'h-[26px] px-2.5 text-[11px]', md: 'h-[31px] px-3 text-[12px]', lg: 'h-[36px] px-3.5 text-[13px]' };

export default function FlexBadge({ icon, label, value, size = 'md', className = '', title, ...rest }) {
  return (
    <span className={`${PILL} ${SIZE[size] || SIZE.md} ${className}`} title={title} {...rest}>
      {icon}
      <span className="font-['General_Sans'] font-bold leading-none">{label}</span>
      {value != null && (
        <span className="font-['JetBrains_Mono'] font-bold leading-none tabular-nums text-[color:var(--gm-muted)]">{value}</span>
      )}
    </span>
  );
}

/* ── Rank (level ladder: Rookie → Apex) ──────────────────────────────────── */
export function RankBadge({ level, progressPct, size = 'md' }) {
  const b = levelBadge(level, { progressPct });
  return (
    <FlexBadge
      size={size}
      title={b.isMax ? 'Apex — the top of the ladder' : `Level ${b.level} · ${b.progressPct ?? 0}% to the next rank`}
      icon={b.isMax
        ? <Crown className="w-3.5 h-3.5 flex-none" strokeWidth={2} />
        : <Trophy className="w-3.5 h-3.5 flex-none" strokeWidth={2} />}
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
      size={size}
      title={s.alive ? `${s.days}-day streak · ${s.label} tier` : 'No active streak'}
      icon={<FlameGlyph stage={s.flame} size={14} className="flex-none" />}
      label={s.alive ? `${s.days}` : '0'}
      value={s.days === 1 ? 'DAY' : 'DAYS'}
      data-testid="badge-streak"
    />
  );
}

/* ── Live league standing ────────────────────────────────────────────────── */
export function StandingBadge({ standing, leagueTier, size = 'md' }) {
  const b = standingBadge(standing, leagueTier);
  return (
    <FlexBadge
      size={size}
      title={b.placed
        ? `#${b.position} of ${b.groupSize} in ${b.tierName} · ${b.zoneLabel.toLowerCase()} zone · live`
        : 'Not placed in a league this period'}
      icon={<TierEmblem tier={b.tier.n} size={18} glow={false} />}
      label={b.tierName}
      value={b.placed ? `#${b.position}` : 'UNPLACED'}
      data-testid="badge-standing"
    />
  );
}

/* Zone chip — promotion/demotion is the one place a non-title accent survives,
   because up and down genuinely need to be told apart at a glance. Lime for
   promotion, red for demotion, neutral for holding: the v2 meanings. */
const ZONE = {
  promotion: { fg: '#DBF67F', Icon: ChevronsUp },
  demotion:  { fg: '#B91C1C', Icon: ChevronsDown },
  holding:   { fg: 'var(--gm-muted)', Icon: Minus },
};

export function ZoneChip({ standing }) {
  if (!standing?.zone) return null;
  const z = ZONE[standing.zone] || ZONE.holding;
  const { Icon } = z;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 h-[26px] rounded-full bg-[color:var(--gm-badge)] font-['JetBrains_Mono'] text-[10px] font-bold uppercase tracking-[0.12em] flex-none"
      style={{ color: z.fg }}
      data-testid="chip-zone"
    >
      <Icon className="w-3 h-3" strokeWidth={2.5} /> {standing.zone}
    </span>
  );
}

/* ── Global rank ─────────────────────────────────────────────────────────── */
export function GlobalRankBadge({ rank, total, size = 'md' }) {
  const b = globalBadge(rank, total);
  if (!b) return null;
  return (
    <FlexBadge
      size={size}
      title={`#${b.rank} of ${b.total.toLocaleString()} by lifetime XP · live`}
      icon={<Globe2 className="w-3.5 h-3.5 flex-none" strokeWidth={2} />}
      label={`#${b.rank.toLocaleString()}`}
      value={b.tagline || 'GLOBAL'}
      data-testid="badge-global"
    />
  );
}

/* ── Title ───────────────────────────────────────────────────────────────────
   A title is identified by its KEY, because the key is what selects both its
   glyph and its accent colour from data/titleGlyphs.js. That is the whole
   lookup — there is no source→silhouette or rarity→glow resolution any more,
   and no plate "spec" to assemble.

   `tier` is the only other input and it controls presentation restraint only
   (see TitlePlate.js). Callers pass the live shop_items.rarity_tier; `rarity`
   is the legacy pre-migration string kept as a fallback for a stale row. */
export function TitleBadge({ titleKey, name, rarityTier, rarity, size = 'md', showTier = false }) {
  if (!name || !titleKey) return null;
  const tier = normalizeRarity(rarityTier) || normalizeRarity(rarity) || 'common';
  return (
    <span className="inline-flex align-middle max-w-full" data-testid="badge-title">
      <TitlePlate titleKey={titleKey} name={name} tier={tier} size={size} showTier={showTier} />
    </span>
  );
}
