import { useState, useEffect } from 'react';
import { ShieldIcon, FlameIcon, GemIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

// The streak hero. It has two faces on purpose (loss aversion, the core of
// every streak app):
//   done today      solid cyan card, lit flame — "safe".
//   not done yet    dark card, cyan number, a live countdown to local
//                   midnight — "this ends tonight unless you act".
// Plus the next milestone and what it pays, so the streak always has a
// concrete next target. Milestones/rewards mirror streak_milestone_gems().

const MILESTONES = [[3, 25], [7, 50], [14, 75], [30, 150], [50, 200], [100, 400], [200, 600], [365, 1000]];

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mondayStartWeek(now = new Date()) {
  const diffToMonday = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(localDateStr(d));
  }
  return { mondayStr: days[0], days };
}

function untilMidnight(now) {
  const m = new Date(now); m.setHours(24, 0, 0, 0);
  const mins = Math.max(0, Math.round((m - now) / 60000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`;
}

export default function StreakCard({ streak = 0, shieldsActive = 0, doneToday = false, isGameMode = true, refreshKey = 0 }) {
  const { user } = useAuth();
  const [weekPips, setWeekPips] = useState([false, false, false, false, false, false, false]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadWeek() {
      if (!user?.id) return;
      const { mondayStr, days } = mondayStartWeek();
      const { data, error } = await supabase.from('habit_completions')
        .select('completed_date, status').eq('user_id', user.id).gte('completed_date', mondayStr);
      if (cancelled || error) return;
      const doneDates = new Set((data || []).filter((c) => c.status !== 'failed').map((c) => c.completed_date));
      setWeekPips(days.map((d) => doneDates.has(d)));
    }
    loadWeek();
    return () => { cancelled = true; };
  }, [user?.id, refreshKey]);

  const next = MILESTONES.find(([d]) => d > streak);
  const lit = doneToday;
  const atRisk = !doneToday && streak > 0;
  const todayIdx = (now.getDay() + 6) % 7;

  // UI v3: done = lavender card; not done = ink-black card (ref "dark feature card").
  const ink = lit ? '#2B3A06' : '#FFFFFF';
  const sub = lit ? '#4F6115' : 'rgba(255,255,255,0.6)';
  const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  let status;
  if (lit) status = streak === 1 ? 'Day one done. Come back tomorrow.' : 'Done for today. Your streak is safe.';
  else if (atRisk) status = shieldsActive > 0
    ? `Ends in ${untilMidnight(now)} — a shield will cover it, but don't waste it`
    : `Ends in ${untilMidnight(now)}. One habit keeps it.`;
  else status = isGameMode ? 'Complete one habit to start a streak.' : 'Finish one session to start a streak.';

  return (
    <div className={`w-full rounded-[28px] p-5 sm:p-6 ${lit ? 'bg-[#D4F36B]' : 'bg-[color:var(--ph-hero)]'}`}
      data-testid="streak-card" data-state={lit ? 'done' : atRisk ? 'at-risk' : 'none'}>
      <div className="flex items-start justify-between gap-3">
        <span className="font-label text-[15px]" style={{ color: sub }}>
          Day streak
        </span>
        {shieldsActive > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: lit ? '#2B3A06' : 'rgba(255,255,255,0.12)', color: lit ? '#D4F36B' : '#FFFFFF' }} data-testid="streak-shield-badge">
            <ShieldIcon size={14} />
            <span className="text-xs font-semibold">{shieldsActive}</span>
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 mt-1">
        <span className="font-display text-[60px] leading-[0.95] tabular-nums" style={{ color: lit ? '#2B3A06' : (atRisk ? '#D4F36B' : '#FFFFFF') }} data-testid="streak-count">
          {streak}
        </span>
        <span className="font-sans text-[17px] font-medium mb-2" style={{ color: sub }}>{streak === 1 ? 'day' : 'days'}</span>
        <FlameIcon size={26} variant={lit ? 'solid' : 'outline'} color={lit ? '#2B3A06' : (atRisk ? '#D4F36B' : 'rgba(255,255,255,0.5)')} className="mb-2 ml-auto" />
      </div>

      <p className="font-sans font-medium text-[16px] mt-1" style={{ color: atRisk ? '#FFFFFF' : sub }} data-testid="streak-status">{status}</p>

      <div className="grid grid-cols-7 gap-1.5 mt-4" data-testid="streak-week-pips">
        {weekPips.map((filled, i) => {
          const today = i === todayIdx;
          const bg = filled ? (lit ? '#2B3A06' : '#D4F36B') : (lit ? 'rgba(31,26,69,0.12)' : 'rgba(255,255,255,0.08)');
          const fg = filled ? (lit ? '#D4F36B' : '#2B3A06') : (lit ? '#4F6115' : 'rgba(255,255,255,0.45)');
          return (
            <div key={i} className="aspect-square rounded-full flex items-center justify-center text-[14px] font-semibold"
              style={{ backgroundColor: bg, color: fg, boxShadow: today && !filled ? `inset 0 0 0 1.5px ${lit ? '#2B3A06' : '#FFFFFF'}` : 'none' }}>
              {DAYS[i]}
            </div>
          );
        })}
      </div>

      {next && (
        <div className="flex items-center justify-between gap-2 mt-4 pt-3 text-[15px] font-medium" style={{ color: sub, borderTop: `1px solid ${lit ? 'rgba(31,26,69,0.15)' : 'rgba(255,255,255,0.1)'}` }} data-testid="streak-next-milestone">
          <span>{next[0] - streak} {next[0] - streak === 1 ? 'day' : 'days'} to the {next[0]}-day milestone</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ color: lit ? '#D4F36B' : '#2B3A06', background: lit ? '#2B3A06' : '#D4F36B' }}><GemIcon size={12} /> +{next[1]}</span>
        </div>
      )}
    </div>
  );
}
