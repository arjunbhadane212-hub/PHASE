// Preview of the redesigned League page with FAKE standings: no login, no RPC,
// no Game Mode gate. Lets every scenario (promoting / holding / dropping, and a
// few tiers) be watched on demand. Unlinked; reachable at /dev/league.
import { useState } from 'react';
import LeagueView from '../components/league/LeagueView';

const NAMES = ['Kai Rivera', 'Mara Okafor', 'Devon Park', 'Noa Lindqvist', 'Priya Shah', 'Theo Walsh', 'Ren Tanaka', 'Sofia Alvarez', 'Max Brenner', 'Ivy Chen', 'Luca Moretti', 'Zara Khan', 'Owen Blake', 'Mila Novak', 'Jude Ferro'];
const COLORS = ['#c9793f', '#D4F36B', '#141416', '#D4F36B', '#ff8a5c', '#7cf0d6', '#ff6b6b', '#8fe3ff'];

// Build a group of `count` players with descending XP, place `me` at mePos
// (1-based). Zones: top `promote` = promotion, bottom `demote` = demotion.
function makeData({ tier, count = 15, promote = 7, demote = 5, mePos = 9, meXp }) {
  const xps = Array.from({ length: count }, (_, i) => Math.max(0, 920 - i * 58 - (i % 3) * 14));
  const rows = xps.map((xp, i) => {
    const rank = i + 1;
    const zone = rank <= promote ? 'promotion' : rank > count - demote ? 'demotion' : 'holding';
    const is_me = rank === mePos;
    return {
      rank,
      display_name: is_me ? 'You' : NAMES[i % NAMES.length],
      username: is_me ? null : `user_${rank}`,
      main_color: COLORS[i % COLORS.length],
      period_xp: is_me && meXp != null ? meXp : xp,
      zone,
      is_me,
    };
  });
  // Re-sort by xp so `me`'s custom xp lands at the right rank, then re-zone.
  rows.sort((a, b) => b.period_xp - a.period_xp);
  rows.forEach((r, i) => {
    r.rank = i + 1;
    r.zone = r.rank <= promote ? 'promotion' : r.rank > count - demote ? 'demotion' : 'holding';
  });
  return {
    status: 'ok',
    tier,
    group_index: 2,
    member_count: count,
    promote_count: promote,
    demote_count: demote,
    ends_at: new Date(Date.now() + (2 * 86400000 + 7 * 3600000)).toISOString(),
    rows,
  };
}

const SCENARIOS = [
  { id: 'holding', label: 'Holding (the carrot)', data: makeData({ tier: 3, mePos: 9 }) },
  { id: 'promoting', label: 'Promoting', data: makeData({ tier: 3, mePos: 3 }) },
  { id: 'promo-floor', label: 'Promo slot, below floor', data: makeData({ tier: 5, mePos: 2, meXp: 90 }) },
  { id: 'dropping', label: 'Drop zone (danger)', data: makeData({ tier: 6, mePos: 13 }) },
  { id: 'prime', label: 'Prime (top tier)', data: makeData({ tier: 10, mePos: 4 }) },
  { id: 'bronze', label: 'Bronze (no drop)', data: makeData({ tier: 1, demote: 0, mePos: 9 }) },
];

export default function DevLeaguePage() {
  const [idx, setIdx] = useState(0);
  const active = SCENARIOS[idx];
  return (
    <div className="min-h-screen pb-28 md:pb-10 bg-[color:var(--gm-bg)]">
      <div className="max-w-xl mx-auto px-4 pt-5">
        <div className="flex flex-wrap gap-2 mb-4">
          {SCENARIOS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIdx(i)}
              className="px-3 py-1.5 rounded-full text-[13px] font-label font-bold uppercase tracking-[0.06em]"
              style={{
                background: i === idx ? '#D4F36B' : 'var(--gm-card)',
                color: i === idx ? '#2B3A06' : 'var(--gm-muted)',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <LeagueView data={active.data} user={{ leaderboard_tier: active.data.tier }} onOpenProfile={() => {}} />
      </div>
    </div>
  );
}
