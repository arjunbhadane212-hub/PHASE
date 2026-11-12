import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { soundEngine } from '../../utils/SoundEngine';
import { GemIcon, BoltIcon, LevelIcon, SparkleIcon, XpIcon, ClockIcon, ShieldIcon, Check, Sun } from '../icons';

// Daily quests — three a day, progress computed by the server from real
// completions (get_daily_quests), claimed for gems (claim_daily_quest).
// Replaces the hard-coded placeholder cards that used to sit here.
const ICONS = { q_first: BoltIcon, q_three: LevelIcon, q_perfect: SparkleIcon, q_hard: ShieldIcon, q_morning: Sun, q_xp: XpIcon, q_focus: ClockIcon };

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DailyQuests({ refreshKey = 0 }) {
  const { refreshUser } = useAuth();
  const [quests, setQuests] = useState(null);
  const [claiming, setClaiming] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_daily_quests', { p_client_date: localDateStr() });
    if (!error) setQuests(data?.quests || []);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const claim = async (q) => {
    setClaiming(q.key);
    try {
      const { data, error } = await supabase.rpc('claim_daily_quest', { p_key: q.key, p_client_date: localDateStr() });
      if (error) throw error;
      soundEngine.purchase();
      toast.success(`+${data.reward} gems · ${q.title}`);
      await Promise.all([load(), refreshUser()]);
    } catch (e) {
      toast.error(e?.message || 'Could not claim');
      load();
    } finally {
      setClaiming(null);
    }
  };

  if (!quests || quests.length === 0) return null;
  const done = quests.filter((q) => q.claimed).length;

  return (
    <section className="rounded-2xl bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] p-4" data-testid="daily-quests">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-['Archivo'] font-extrabold text-[17px] text-[var(--gm-ink)] tracking-[-0.01em]">Daily quests</h3>
        <span className="font-['JetBrains_Mono'] font-bold uppercase text-[10px] tracking-[0.08em] text-[var(--gm-muted)]">{done}/{quests.length} · resets at midnight</span>
      </div>
      <ul className="space-y-3">
        {quests.map((q) => {
          const Icon = ICONS[q.key] || BoltIcon;
          const pct = Math.min(100, Math.round((q.progress / Math.max(1, q.target)) * 100));
          const ready = q.complete && !q.claimed;
          return (
            <li key={q.key} className="flex items-center gap-3" data-testid={`quest-${q.key}`}>
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-none ${q.claimed ? 'bg-[#DBF67F] text-[#2A3B0B]' : 'bg-[var(--gm-badge)] text-[var(--gm-ink)]'}`}>
                {q.claimed ? <Check size={18} /> : <Icon size={18} />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-[13px] font-['General_Sans'] font-bold truncate ${q.claimed ? 'text-[var(--gm-muted)]' : 'text-[var(--gm-ink)]'}`}>{q.title}</p>
                  <span className="font-['JetBrains_Mono'] text-[10px] font-bold text-[var(--gm-muted)] tabular-nums flex-none">{Math.min(q.progress, q.target)}/{q.target}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--gm-track)] mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full bg-[#DBF67F] transition-[width] duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
              {ready ? (
                <button type="button" onClick={() => claim(q)} disabled={claiming === q.key}
                  className="flex-none h-8 px-3 rounded-full bg-[#95DEE6] text-[#183A3F] text-xs font-bold flex items-center gap-1 disabled:opacity-50" data-testid={`claim-${q.key}`}>
                  {claiming === q.key ? '…' : <>Claim <GemIcon size={12} /> {q.reward}</>}
                </button>
              ) : (
                <span className={`flex-none flex items-center gap-1 text-xs font-bold ${q.claimed ? 'text-[var(--gm-muted)]' : 'text-[var(--gm-ink)]'}`}>
                  <GemIcon size={12} className="text-[#95DEE6]" /> {q.reward}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
