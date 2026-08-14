// Profile identity → visual intensity.
//
// One rule governs every badge on the public profile: intensity is EARNED.
// Nothing renders at full power by default, and nothing is a fixed placeholder.
// A badge's `glow` (0..1) drives its bloom radius; `sheen` adds the metal sweep;
// `halo` adds the living outer bloom; `incandescent` turns the text white-hot.
// Demote and the badge visibly cools down on the next render. That is the point.

import { rankInfo, MAX_LEVEL } from './levels';
import { tierInfo } from './leaderboardTiers';

// ── Streak ────────────────────────────────────────────────────────────────
// Tiers locked in CLAUDE.md (Streak Hero Widget). 0 is deliberately dead.
// `flame` names the stage in data/streakFlames.js. The glyph family carries the
// tier structurally — more cores, more updraft, more spire as the streak climbs
// — so the tier reads with the colour stripped out. Nothing on the profile
// renders a generic Lucide flame any more.
export const STREAK_TIERS = [
  { min: 100, key: 'incandescent', label: 'INCANDESCENT', a: '#FBBF24', b: '#FFFFFF', glow: 1.0,  flame: 'incandescent' },
  { min: 30,  key: 'gold',         label: 'GOLD',         a: '#FBBF24', b: '#FDE68A', glow: 0.8,  flame: 'gold' },
  { min: 7,   key: 'amber',        label: 'AMBER',        a: '#F59E0B', b: '#FCD34D', glow: 0.55, flame: 'amber' },
  { min: 1,   key: 'ember',        label: 'EMBER',        a: '#F97316', b: '#FDBA74', glow: 0.35, flame: 'ember' },
  { min: 0,   key: 'cold',         label: 'COLD',         a: '#6B7280', b: '#9CA3AF', glow: 0.0,  flame: 'cold' },
];

export function streakTier(days) {
  const d = Math.max(0, Number(days) || 0);
  const t = STREAK_TIERS.find(x => d >= x.min) || STREAK_TIERS[STREAK_TIERS.length - 1];
  return {
    ...t,
    days: d,
    alive: d > 0,
    sheen: d >= 30,
    halo: d >= 30,
    incandescent: d >= 100,
    // Next milestone drives the "so close" pressure line on the hero widget.
    next: STREAK_TIERS.filter(x => x.min > d).sort((a, b) => a.min - b.min)[0] || null,
  };
}

// ── Level rank (Rookie → Apex) ────────────────────────────────────────────
// Glow ramps with the ladder so a Rookie badge and an Apex badge are not the
// same object with a different hex. Apex is the only fully animated one.
export function levelBadge(level, opts = {}) {
  const info = rankInfo(level);
  const lvl = info.level;
  const glow = Math.min(1, 0.22 + (lvl - 1) * 0.087); // 0.22 → 1.0 across the ladder
  return {
    level: lvl,
    name: info.name,
    a: info.color,
    b: lvl === MAX_LEVEL ? '#FFFFFF' : lightenHex(info.color, 22),
    glow,
    sheen: lvl >= 6,
    halo: lvl >= 8,
    incandescent: lvl >= MAX_LEVEL,
    isMax: lvl >= MAX_LEVEL,
    progressPct: clampPct(opts.progressPct),
  };
}

// ── League tier + live standing ───────────────────────────────────────────
// Zone is live truth from the server, not a stored flag. Promotion zone burns
// hotter than holding; demotion visibly drains the badge.
export const ZONE_STYLE = {
  promotion: { a: '#22C55E', b: '#86EFAC', glowBoost: 0.25, label: 'PROMOTION' },
  holding:   { a: '#7D818F', b: '#B7BBC6', glowBoost: 0.0,  label: 'HOLDING'   },
  demotion:  { a: '#EF4444', b: '#FCA5A5', glowBoost: 0.1,  label: 'DEMOTION'  },
};

export function standingBadge(standing, leagueTierNum) {
  const tier = tierInfo(leagueTierNum || standing?.tier || 1);
  if (!standing || standing.position == null) {
    // Not in a league right now — an honest resting state, not a fake rank.
    return { placed: false, a: tier.a, b: tier.b, glow: 0.18, tierName: tier.key, tier };
  }
  const zone = ZONE_STYLE[standing.zone] || ZONE_STYLE.holding;
  const size = standing.group_size || 1;
  // Being #1 of a full group is worth more light than #1 of three people.
  const dominance = 1 - (standing.position - 1) / Math.max(1, size - 1 || 1);
  const glow = Math.min(1, 0.3 + dominance * 0.55 + zone.glowBoost);
  return {
    placed: true,
    position: standing.position,
    groupSize: size,
    zone: standing.zone,
    zoneLabel: zone.label,
    a: standing.zone === 'demotion' ? zone.a : tier.a,
    b: standing.zone === 'demotion' ? zone.b : tier.b,
    accent: zone.a,
    glow,
    sheen: standing.position === 1,
    halo: standing.zone === 'promotion',
    incandescent: standing.position === 1 && standing.zone === 'promotion',
    tierName: standing.tier_name || tier.key,
    tier,
    endsAt: standing.ends_at,
  };
}

// ── Titles ────────────────────────────────────────────────────────────────
// A title has two independent axes.
//
//   SOURCE  → the plate FORM. Where the title came from: a Starter/Delta/Phase
//             box, a streak milestone, or accumulated focus hours. Each source
//             has its own silhouette (see components/profile/TitlePlate.js) and
//             must be tellable apart with the colour stripped out.
//   RARITY  → the plate INTENSITY only. Glow radius, sheen, halo, and which
//             stage of the streak/hours glyph family burns.
//
// For box titles the source comes from shop_items.rarity_style, set from the
// box a title can drop from. Shared titles (Overkill/Vermin/Relentless) resolve
// to their highest box, so a Phase pull never renders in Delta chrome.
export const TITLE_SOURCES = ['starter', 'delta', 'phase', 'streak', 'hours'];

export const TITLE_STYLES = {
  starter: { a: '#9AA4B2', b: '#C7CDD6', glow: 0.2,  label: 'Starter', sheen: false, halo: false },
  delta:   { a: '#3B82F6', b: '#7FB4F5', glow: 0.55, label: 'Delta',   sheen: false, halo: false },
  phase:   { a: '#FBBF24', b: '#60A5FA', glow: 1.0,  label: 'Phase',   sheen: true,  halo: true  },
  streak:  { a: '#F59E0B', b: '#FCD34D', glow: 0.6,  label: 'Streak',  sheen: false, halo: false },
  hours:   { a: '#4E8FDB', b: '#8FC3FF', glow: 0.5,  label: 'Hours',   sheen: false, halo: false },
};

export function titleStyle(style) {
  return TITLE_STYLES[style] || TITLE_STYLES.starter;
}

// Normalises whatever a row carries into one of the five rarity tiers. Legacy
// rows spell it 'ultra'; the tier list is common → mythic.
export const RARITY_TIERS = ['common', 'rare', 'epic', 'legendary', 'mythic'];

export function normalizeRarity(rarity) {
  const r = String(rarity || '').toLowerCase();
  if (r === 'ultra') return 'mythic';
  return RARITY_TIERS.includes(r) ? r : null;
}

// Legacy rarity strings (pre-migration rows) → the new tier styles.
export function styleFromRarity(rarity) {
  if (rarity === 'mythic' || rarity === 'ultra') return 'phase';
  if (rarity === 'legendary' || rarity === 'epic' || rarity === 'rare') return 'delta';
  return 'starter';
}

// ── Global standing ───────────────────────────────────────────────────────
// Top 1% / 5% / 10% earn light. Everyone else gets an honest, quiet number.
export function globalBadge(rank, total) {
  const r = Number(rank) || 0;
  const t = Number(total) || 0;
  if (!r || !t) return null;
  const pct = (r / t) * 100;
  const elite = pct <= 1, strong = pct <= 5, notable = pct <= 10;
  return {
    rank: r, total: t, pct,
    a: elite ? '#FBBF24' : strong ? '#60A5FA' : '#4D8EF0',
    b: elite ? '#FFFFFF' : strong ? '#BFDBFE' : '#93C5FD',
    glow: elite ? 1 : strong ? 0.6 : notable ? 0.4 : 0.22,
    sheen: strong,
    halo: elite,
    incandescent: elite,
    tagline: elite ? 'TOP 1%' : strong ? 'TOP 5%' : notable ? 'TOP 10%' : null,
  };
}

// ── helpers ───────────────────────────────────────────────────────────────
function clampPct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

export function lightenHex(hex, amt) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return hex;
  const up = c => Math.min(255, parseInt(c, 16) + amt).toString(16).padStart(2, '0');
  return `#${up(m[1])}${up(m[2])}${up(m[3])}`;
}

export function alpha(hex, a) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return hex;
  const [r, g, b] = [m[1], m[2], m[3]].map(c => parseInt(c, 16));
  return `rgba(${r},${g},${b},${a})`;
}
