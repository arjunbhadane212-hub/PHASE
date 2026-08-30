import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

// Client's LOCAL calendar day (YYYY-MM-DD) — matches how complete_habit keys
// completions, so the pip bar lines up with the day the user actually logged.
function localDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Weekly window definition (used here AND in HomePage's weekly XP tile in Step 2):
// CALENDAR WEEK, Monday-start. The 7 pips map Mon->Sun; a pip is filled when that
// weekday had at least one non-failed completion. Future days this week stay empty.
function mondayStartWeek(now = new Date()) {
  const diffToMonday = (now.getDay() + 6) % 7; // 0=Sun..6=Sat -> days since Monday
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

// isGameMode is kept in the signature (HomePage passes it) but no longer drives
// styling in v2; disable the unused-var rule so the Vercel CI build (CI=true) passes.
// eslint-disable-next-line no-unused-vars
export default function StreakCard({ streak = 0, shieldsActive = 0, isGameMode = false }) {
  const { user } = useAuth();
  const [weekPips, setWeekPips] = useState([false, false, false, false, false, false, false]);

  useEffect(() => {
    let cancelled = false;
    async function loadWeek() {
      if (!user?.id) return;
      const { mondayStr, days } = mondayStartWeek();
      // Read-only SELECT — no writes, no schema/RPC changes.
      const { data, error } = await supabase
        .from('habit_completions')
        .select('completed_date, status')
        .eq('user_id', user.id)
        .gte('completed_date', mondayStr);
      if (cancelled) return;
      if (error) {
        console.error('Failed to load weekly completions for streak pips', error);
        return;
      }
      // A 'failed' row (abandoned session) locks the day but is not a success.
      const doneDates = new Set(
        (data || []).filter(c => c.status !== 'failed').map(c => c.completed_date)
      );
      setWeekPips(days.map(d => doneDates.has(d)));
    }
    loadWeek();
    return () => { cancelled = true; };
  }, [user?.id]);

  return (
    <div
      className="w-full rounded-3xl bg-[#77D6E4] p-5 sm:p-6"
      data-testid="streak-card"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Eyebrow */}
        <span
          className="font-['JetBrains_Mono'] font-bold uppercase text-[10px] sm:text-[11px] text-[#09181C]/75"
          style={{ letterSpacing: '0.08em' }}
        >
          Day Streak · This Week
        </span>

        {/* Shield badge — dark pill, legible on the cyan card */}
        {shieldsActive > 0 && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#09181C]"
            data-testid="streak-shield-badge"
          >
            <Shield className="w-3.5 h-3.5 text-[#77D6E4]" strokeWidth={2} />
            <span className="text-xs font-semibold text-[#77D6E4]">{shieldsActive}</span>
          </div>
        )}
      </div>

      {/* Hero number */}
      <div
        className="font-['Archivo'] font-black text-[#09181C] mt-2 text-[44px] sm:text-[52px]"
        style={{ lineHeight: '0.88', letterSpacing: '-0.02em' }}
        data-testid="streak-count"
      >
        {streak}
      </div>

      {/* Sub-label */}
      <div className="font-['General_Sans'] font-bold text-[#09181C] text-sm sm:text-base mt-1">
        Days Strong
      </div>

      {/* Weekly progress pip bar (Mon -> Sun) */}
      <div className="flex gap-1.5 mt-4" data-testid="streak-week-pips">
        {weekPips.map((filled, i) => (
          <div
            key={i}
            className="flex-1 h-2 rounded-full"
            style={{ backgroundColor: filled ? '#09181C' : '#A8E6EE' }}
          />
        ))}
      </div>
    </div>
  );
}
