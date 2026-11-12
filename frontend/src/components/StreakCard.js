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

  const ink = lit ? '#183A3F' : 'var(--gm-ink)';
  const sub = lit ? '#3E6C71' : 'var(--gm-muted)';

  let status;
  if (lit) status = streak === 1 ? 'Day one done. Come back tomorrow.' : 'Done for today. Your streak is safe.';
  else if (atRisk) status = shieldsActive > 0
    ? `Ends in ${untilMidnight(now)} — a shield will cover it, but don't waste it`
    : `Ends in ${untilMidnight(now)}. One habit keeps it.`;
  else status = isGameMode ? 'Complete one habit to start a streak.' : 'Finish one session to start a streak.';

  return (
    <div className={`w-full rounded-[22px] p-5 sm:p-6 ${lit ? 'bg-[#95DEE6]' : 'bg-[var(--gm-card)]'} shadow-[var(--gm-shadow-card)]`}
      data-testid="streak-card" data-state={lit ? 'done' : atRisk ? 'at-risk' : 'none'}>
      <div className="flex items-start justify-between gap-3">
        <span className="font-['JetBrains_Mono'] font-bold uppercase text-[10px] sm:text-[11px] tracking-[0.08em]" style={{ color: lit ? '#3E6C71' : 'var(--gm-muted)' }}>
          Day streak
        </span>
        {shieldsActive > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: lit ? '#183A3F' : 'var(--gm-badge)', color: lit ? '#95DEE6' : 'var(--gm-ink)' }} data-testid="streak-shield-badge">
            <ShieldIcon size={14} />
            <span className="text-xs font-bold">{shieldsActive}</span>
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 mt-2">
        <span className="font-['Archivo'] font-black text-[48px] sm:text-[56px] leading-[0.88] tracking-[-0.02em] tabular-nums" style={{ color: lit ? '#183A3F' : (atRisk ? '#95DEE6' : 'var(--gm-ink)') }} data-testid="streak-count">
          {streak}
        </span>
        <FlameIcon size={30} variant={lit ? 'solid' : 'outline'} color={lit ? '#183A3F' : (atRisk ? '#95DEE6' : 'var(--gm-muted)')} className="mb-1" />
      </div>

      <p className="font-['General_Sans'] font-bold text-sm mt-2" style={{ color: atRisk ? 'var(--gm-ink)' : sub }} data-testid="streak-status">{status}</p>

      <div className="flex gap-1.5 mt-4" data-testid="streak-week-pips">
        {weekPips.map((filled, i) => (
          <div key={i} className="flex-1 h-2 rounded-full" style={{
            backgroundColor: filled ? (lit ? '#183A3F' : '#95DEE6') : (lit ? '#83C6CD' : 'var(--gm-track)'),
            outline: i === todayIdx && !filled ? `1.5px solid ${lit ? '#183A3F' : '#95DEE6'}` : 'none', outlineOffset: 1,
          }} />
        ))}
      </div>

      {next && (
        <div className="flex items-center justify-between gap-2 mt-3 text-xs font-bold" style={{ color: sub }} data-testid="streak-next-milestone">
          <span>{next[0] - streak} {next[0] - streak === 1 ? 'day' : 'days'} to the {next[0]}-day milestone</span>
          <span className="inline-flex items-center gap-1" style={{ color: ink }}><GemIcon size={12} /> +{next[1]}</span>
        </div>
      )}
    </div>
  );
}
